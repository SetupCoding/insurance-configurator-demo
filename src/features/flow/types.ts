import type { OptionValue, Step } from '@/lib/schema/flow';

export type FlowStatus = 'in_progress' | 'completed';

/** A step shown to the user together with the option they selected (if any). */
export type AnsweredStep = {
  step: Step;
  /** `null` while the step is still awaiting an answer. */
  selectedValue: OptionValue | null;
};

export type FlowState = {
  /** Visible steps in order; the last one may still be unanswered. */
  steps: AnsweredStep[];
  status: FlowStatus;
};

export type FlowAction =
  { type: 'selectOption'; stepId: number; value: OptionValue } | { type: 'reset' };

/** A collected answer, ready to be submitted. */
export type Answer = {
  name: string;
  value: OptionValue;
};

/** A persisted selection, used to restore progress after a refresh. */
export type Selection = {
  stepId: number;
  value: OptionValue;
};
