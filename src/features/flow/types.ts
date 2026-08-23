import type { OptionValue, Step } from '@/lib/schema/flow';

export type FlowStatus = 'in_progress' | 'completed';

export type AnsweredStep = {
  step: Step;
  /** `null` while the step is still awaiting an answer. */
  selectedValue: OptionValue | null;
};

export type FlowState = {
  /** In the order they were asked. Only the last one may be unanswered. */
  steps: AnsweredStep[];
  status: FlowStatus;
};

export type FlowAction =
  { type: 'selectOption'; stepId: number; value: OptionValue } | { type: 'reset' };

export type Answer = {
  name: string;
  value: OptionValue;
};

/**
 * Keyed by step id rather than by name, because restoring progress replays the
 * selections through the reducer, which addresses steps by id.
 */
export type Selection = {
  stepId: number;
  value: OptionValue;
};
