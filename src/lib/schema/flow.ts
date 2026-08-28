import { type Locale, LOCALES } from '@/lib/i18n/locales';

import { z } from './zod';

/**
 * Schemas describing the conversation flow. These are the single source of
 * truth for the domain: the TypeScript types below are inferred from them, so
 * the runtime validation and the compile-time types can never drift apart.
 *
 * The graph shape mirrors the upstream flow definition (a decision tree of
 * steps, each offering a set of options that point to the next step by id).
 * Display text is where this deliberately diverges: upstream carries one German
 * string per question, and here every text is a record keyed by locale. The
 * graph itself stays single-sourced, so the invariants below are checked once
 * for one graph rather than once per translation. See ADR 0012.
 *
 * Two families of type come out of this file, and the distinction is the whole
 * point of the arrangement. The `...Definition` types are the flow as it is
 * authored and validated, with every text in every locale. `Flow`, `Step` and
 * `ValueOption` are the flow as the UI sees it, with each text already resolved
 * to one locale by `localizeFlow` on the server. Nothing below the server
 * boundary ever holds a translation it will not render, and no component has to
 * know a locale exists.
 */

const valueTypeSchema = z.enum(['boolean', 'number', 'string']);

/** The only rendering mode the UI implements. */
const uiTypeSchema = z.literal('button');

export const optionValueSchema = z.union([z.boolean(), z.number(), z.string()]);

/** The id of the next step, or `false` to signal the end of the flow. */
const nextIdSchema = z.union([z.number().int(), z.literal(false)]);

/**
 * Display text, in every locale the app ships.
 *
 * Zod requires a record keyed by an enum to be exhaustive, which is doing real
 * work here: a text that is missing a translation, or that carries one for a
 * locale not in `LOCALES`, fails at import time with the path of the offending
 * text. That is why nothing further down checks translation completeness. The
 * schema already is that check.
 */
const localizedTextSchema = z.record(z.enum(LOCALES), z.string().min(1));

const valueOptionDefinitionSchema = z.object({
  nextId: nextIdSchema,
  value: optionValueSchema,
  text: localizedTextSchema,
});

export const stepDefinitionSchema = z.object({
  id: z.number().int(),
  /** Language-neutral, and what a submission identifies a step by. */
  name: z.string().min(1),
  text: localizedTextSchema,
  uiType: uiTypeSchema,
  valueType: valueTypeSchema,
  valueOptions: z.array(valueOptionDefinitionSchema).min(1),
});

export type LocalizedText = z.infer<typeof localizedTextSchema>;
export type OptionValue = z.infer<typeof optionValueSchema>;

export type ValueOptionDefinition = z.infer<typeof valueOptionDefinitionSchema>;
export type StepDefinition = z.infer<typeof stepDefinitionSchema>;

/** The same option and step, with `text` resolved to a single locale. */
export type ValueOption = Omit<ValueOptionDefinition, 'text'> & { text: string };
export type Step = Omit<StepDefinition, 'text' | 'valueOptions'> & {
  text: string;
  valueOptions: ValueOption[];
};
export type Flow = Step[];

type FlowIssue = { path: (string | number)[]; message: string };

/** The steps an option can lead to. Terminal options contribute nothing. */
function successors(step: StepDefinition, byId: Map<number, StepDefinition>): StepDefinition[] {
  return step.valueOptions.flatMap((option) =>
    option.nextId === false ? [] : [byId.get(option.nextId)!],
  );
}

/** Depth-first; which order the graph is walked in does not affect the result. */
function reachableFrom(start: StepDefinition, byId: Map<number, StepDefinition>): Set<number> {
  const reached = new Set<number>();
  const stack = [start];
  while (stack.length > 0) {
    const step = stack.pop()!;
    if (reached.has(step.id)) continue;
    reached.add(step.id);
    stack.push(...successors(step, byId));
  }
  return reached;
}

/**
 * Returns the first cycle found from `start` as the ids along it, or null.
 * `settled` memoises steps already explored without finding a cycle: a step
 * that led nowhere circular on one path cannot do so on another.
 */
function findCycle(start: StepDefinition, byId: Map<number, StepDefinition>): number[] | null {
  const settled = new Set<number>();

  function walk(step: StepDefinition, trail: number[]): number[] | null {
    const repeatedAt = trail.indexOf(step.id);
    if (repeatedAt !== -1) return [...trail.slice(repeatedAt), step.id];
    if (settled.has(step.id)) return null;

    for (const next of successors(step, byId)) {
      const cycle = walk(next, [...trail, step.id]);
      if (cycle) return cycle;
    }
    settled.add(step.id);
    return null;
  }

  return walk(start, []);
}

/** Invariants within a single step: option types, and unique values and texts. */
function collectStepIssues(step: StepDefinition, index: number): FlowIssue[] {
  const issues: FlowIssue[] = [];
  const seenValues = new Set<OptionValue>();
  // Per locale, because the point of the check is what the user sees: no single
  // locale may show the same label twice, but the German and English label sets
  // have nothing to do with each other.
  const seenTexts = new Map<Locale, Set<string>>(LOCALES.map((locale) => [locale, new Set()]));

  step.valueOptions.forEach((option, optionIndex) => {
    const path = [index, 'valueOptions', optionIndex];

    if (typeof option.value !== step.valueType) {
      issues.push({
        path: [...path, 'value'],
        message: `Option value must be a ${step.valueType}, got ${typeof option.value}.`,
      });
    }
    if (seenValues.has(option.value)) {
      issues.push({
        path: [...path, 'value'],
        message: `Duplicate option value ${JSON.stringify(option.value)}.`,
      });
    }

    for (const locale of LOCALES) {
      const texts = seenTexts.get(locale)!;
      const text = option.text[locale];
      if (texts.has(text)) {
        issues.push({
          path: [...path, 'text', locale],
          message: `Duplicate option text "${text}" in locale "${locale}".`,
        });
      }
      texts.add(text);
    }

    seenValues.add(option.value);
  });

  return issues;
}

/**
 * Graph-level invariants that the per-step shapes above cannot express:
 * unique ids and names, references that resolve, every step reachable from the
 * first, and no cycles. Together with `nextId` always resolving, acyclicity is
 * what guarantees every conversation terminates: a walk can never revisit a
 * step, so it must eventually reach an option with `nextId: false`.
 *
 * Collects every issue instead of throwing at the first, so a malformed flow
 * reports all of its problems at once, each against the path it sits at.
 */
function collectFlowIssues(steps: StepDefinition[]): FlowIssue[] {
  // Load-bearing: Zod runs superRefine even after `.min(1)` has already failed,
  // so an empty array reaches here and the graph walk below would read
  // `steps[0]` off the end. A step that fails its own schema is the other case,
  // and does not reach here at all, which is why nothing below re-checks the
  // shape of one.
  if (steps.length === 0) return [];

  const issues: FlowIssue[] = [];
  const indexById = new Map<number, number>();
  const indexByName = new Map<string, number>();

  steps.forEach((step, index) => {
    const duplicateId = indexById.get(step.id);
    if (duplicateId === undefined) {
      indexById.set(step.id, index);
    } else {
      issues.push({
        path: [index, 'id'],
        message: `Duplicate step id ${step.id}, already used at index ${duplicateId}.`,
      });
    }

    const duplicateName = indexByName.get(step.name);
    if (duplicateName === undefined) {
      indexByName.set(step.name, index);
    } else {
      issues.push({
        path: [index, 'name'],
        message: `Duplicate step name "${step.name}", already used at index ${duplicateName}.`,
      });
    }

    issues.push(...collectStepIssues(step, index));
  });

  let hasDanglingReference = false;
  steps.forEach((step, index) => {
    step.valueOptions.forEach((option, optionIndex) => {
      if (option.nextId !== false && !indexById.has(option.nextId)) {
        hasDanglingReference = true;
        issues.push({
          path: [index, 'valueOptions', optionIndex, 'nextId'],
          message: `nextId ${option.nextId} matches no step.`,
        });
      }
    });
  });

  // Reachability and acyclicity are only meaningful once every edge resolves to
  // exactly one step. Reporting them on top of a duplicate id or a dangling
  // reference would describe a graph that does not exist.
  if (hasDanglingReference || indexById.size !== steps.length) return issues;

  const byId = new Map(steps.map((step) => [step.id, step]));
  const reached = reachableFrom(steps[0], byId);
  steps.forEach((step, index) => {
    if (!reached.has(step.id)) {
      issues.push({
        path: [index, 'id'],
        message: `Step ${step.id} is unreachable from the first step.`,
      });
    }
  });

  const cycle = findCycle(steps[0], byId);
  if (cycle) {
    issues.push({
      path: [indexById.get(cycle[0])!, 'id'],
      message: `The flow contains a cycle: ${cycle.join(' -> ')}.`,
    });
  }

  return issues;
}

export const flowDefinitionSchema = z
  .array(stepDefinitionSchema)
  .min(1)
  .superRefine((steps, ctx) => {
    for (const issue of collectFlowIssues(steps)) {
      ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message });
    }
  });

export type FlowDefinition = z.infer<typeof flowDefinitionSchema>;
