import type { Locale } from '@/lib/i18n/locales';
import type { Submission } from '@/lib/schema/answer';
import type { Configuration, ConfigurationEntry } from '@/lib/schema/conversation';
import type { FlowDefinition, StepDefinition, ValueOptionDefinition } from '@/lib/schema/flow';

type SubmissionValidation =
  { ok: true; configuration: Configuration } | { ok: false; detail: string };

/**
 * Replays a submission against the flow.
 *
 * The rule this enforces is not a shape: each answer determines which question
 * comes next, so for any set of choices exactly one ordered sequence of answers
 * is reachable. Walking the graph is therefore the only way to tell a real
 * conversation from a hand-crafted payload, and one walk rejects unknown names,
 * repeats, wrong order, unoffered values, short paths and trailing extras
 * alike.
 *
 * Returns the answers resolved back to the question and option wording in
 * `locale`, so a caller can report what was submitted without trusting the
 * client's copy. The walk itself is language-neutral: it matches on `name` and
 * `value`, never on text, so which locale is asked for cannot change whether a
 * submission is accepted.
 *
 * `detail` on a rejection stays English regardless of `locale`. It is a
 * diagnostic for whoever is holding the logs, never shown to the user.
 */
export function validateSubmission(
  flow: FlowDefinition,
  answers: Submission,
  locale: Locale,
): SubmissionValidation {
  const byId = new Map<number, StepDefinition>(flow.map((step) => [step.id, step]));
  const configuration: ConfigurationEntry[] = [];

  let step: StepDefinition | undefined = flow[0];

  for (const [index, answer] of answers.entries()) {
    if (!step) {
      return { ok: false, detail: `Answer ${index} ("${answer.name}") continues a finished path.` };
    }
    if (answer.name !== step.name) {
      return {
        ok: false,
        detail: `Answer ${index} must be "${step.name}", got "${answer.name}".`,
      };
    }

    // Annotated because the assignment to `step` below depends on `option`,
    // which would otherwise make inferring `option` circular.
    const option: ValueOptionDefinition | undefined = step.valueOptions.find(
      (candidate) => candidate.value === answer.value,
    );
    if (!option) {
      return {
        ok: false,
        detail: `${JSON.stringify(answer.value)} is not an option of "${step.name}".`,
      };
    }

    configuration.push({
      name: step.name,
      question: step.text[locale],
      value: answer.value,
      label: option.text[locale],
    });

    // `nextId` always resolves: the flow schema rejects a dangling reference, so
    // this can only be undefined once the path has ended.
    step = option.nextId === false ? undefined : byId.get(option.nextId);
  }

  if (step) {
    return { ok: false, detail: `The path stops early: "${step.name}" is unanswered.` };
  }

  return { ok: true, configuration };
}
