import type { Flow, Step } from '@/lib/schema/flow';

import type { Answer, FlowAction, FlowState, Selection } from './types';

function findStepById(flow: Flow, id: number): Step | undefined {
  return flow.find((step) => step.id === id);
}

export function initFlowState(flow: Flow): FlowState {
  return {
    steps: [{ step: flow[0], selectedValue: null }],
    status: 'in_progress',
  };
}

/**
 * A factory so the flow is captured once and the reducer itself stays a pure
 * function of `(state, action)`.
 *
 * Steps are never mutated: the selection is tracked alongside each step rather
 * than written into it, which is what keeps the flow definition shareable and
 * saves deep-copying it on every answer.
 */
export function createFlowReducer(flow: Flow) {
  return function flowReducer(state: FlowState, action: FlowAction): FlowState {
    switch (action.type) {
      case 'selectOption': {
        const index = state.steps.findIndex((entry) => entry.step.id === action.stepId);
        if (index === -1) return state;

        const target = state.steps[index];
        const option = target.step.valueOptions.find((o) => o.value === action.value);
        if (!option) return state;

        // Re-selecting the answer that is already recorded is a no-op, not a
        // change: returning the same state keeps the downstream answers (and
        // lets React skip the re-render).
        if (target.selectedValue === action.value) return state;

        // Changing an earlier answer invalidates everything after it, so drop
        // the downstream steps before recording the new selection.
        const steps = state.steps.slice(0, index + 1);
        steps[index] = { ...target, selectedValue: action.value };

        if (option.nextId === false) {
          return { steps, status: 'completed' };
        }

        // flowSchema rejects a nextId that matches no step, so a non-terminal
        // option always resolves and this lookup cannot miss.
        const nextStep = findStepById(flow, option.nextId)!;

        return {
          steps: [...steps, { step: nextStep, selectedValue: null }],
          status: 'in_progress',
        };
      }
      case 'reset':
        return initFlowState(flow);
    }
  };
}

/** Answered steps only, so the trailing unanswered question is left out. */
export function selectAnswers(state: FlowState): Answer[] {
  const answers: Answer[] = [];
  for (const entry of state.steps) {
    if (entry.selectedValue !== null) {
      answers.push({ name: entry.step.name, value: entry.selectedValue });
    }
  }
  return answers;
}

/** As above, but keyed by step id so the reducer can replay them on restore. */
export function selectSelections(state: FlowState): Selection[] {
  const selections: Selection[] = [];
  for (const entry of state.steps) {
    if (entry.selectedValue !== null) {
      selections.push({ stepId: entry.step.id, value: entry.selectedValue });
    }
  }
  return selections;
}
