import { z } from 'zod';

/**
 * Schemas describing the conversation flow. These are the single source of
 * truth for the domain: the TypeScript types below are inferred from them, so
 * the runtime validation and the compile-time types can never drift apart.
 *
 * The shape mirrors the upstream flow definition (a decision tree of steps,
 * each offering a set of options that point to the next step by id).
 */

export const valueTypeSchema = z.enum(['boolean', 'number', 'string']);

/** The only rendering mode the UI implements. */
export const uiTypeSchema = z.literal('button');

/** The value carried by a chosen option. */
export const optionValueSchema = z.union([z.boolean(), z.number(), z.string()]);

/** The id of the next step, or `false` to signal the end of the flow. */
export const nextIdSchema = z.union([z.number().int(), z.literal(false)]);

export const valueOptionSchema = z.object({
  nextId: nextIdSchema,
  value: optionValueSchema,
  text: z.string().min(1),
});

export const stepSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  text: z.string().min(1),
  uiType: uiTypeSchema,
  valueType: valueTypeSchema,
  valueOptions: z.array(valueOptionSchema).min(1),
});

export type ValueType = z.infer<typeof valueTypeSchema>;
export type UiType = z.infer<typeof uiTypeSchema>;
export type OptionValue = z.infer<typeof optionValueSchema>;
export type NextId = z.infer<typeof nextIdSchema>;
export type ValueOption = z.infer<typeof valueOptionSchema>;
export type Step = z.infer<typeof stepSchema>;

type FlowIssue = { path: (string | number)[]; message: string };

/** The steps an option can lead to. Terminal options contribute nothing. */
function successors(step: Step, byId: Map<number, Step>): Step[] {
  return step.valueOptions.flatMap((option) =>
    option.nextId === false ? [] : [byId.get(option.nextId)!],
  );
}

/** Ids reachable by following options from `start`. */
function reachableFrom(start: Step, byId: Map<number, Step>): Set<number> {
  const reached = new Set<number>();
  const queue = [start];
  while (queue.length > 0) {
    const step = queue.pop()!;
    if (reached.has(step.id)) continue;
    reached.add(step.id);
    queue.push(...successors(step, byId));
  }
  return reached;
}

/**
 * Returns the first cycle found from `start` as the ids along it, or null.
 * `settled` memoises steps already explored without finding a cycle: a step
 * that led nowhere circular on one path cannot do so on another.
 */
function findCycle(start: Step, byId: Map<number, Step>): number[] | null {
  const settled = new Set<number>();

  function walk(step: Step, trail: number[]): number[] | null {
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
function collectStepIssues(step: Step, index: number): FlowIssue[] {
  const issues: FlowIssue[] = [];
  const seenValues = new Set<OptionValue>();
  const seenTexts = new Set<string>();

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
    if (seenTexts.has(option.text)) {
      issues.push({ path: [...path, 'text'], message: `Duplicate option text "${option.text}".` });
    }

    seenValues.add(option.value);
    seenTexts.add(option.text);
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
 * Kept as a pure function returning issues so each invariant is testable on
 * its own, and wired into `flowSchema` so `parse` guarantees all of them.
 */
export function collectFlowIssues(steps: Step[]): FlowIssue[] {
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

export const flowSchema = z
  .array(stepSchema)
  .min(1)
  .superRefine((steps, ctx) => {
    for (const issue of collectFlowIssues(steps)) {
      ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message });
    }
  });

export type Flow = z.infer<typeof flowSchema>;
