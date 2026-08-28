import { describe, expect, it } from 'vitest';

import { getFlow } from '@/lib/data/flow';
import { localizeFlow } from '@/lib/domain/localizeFlow';

import { createFlowReducer, initFlowState, selectAnswers } from './reducer';
import type { FlowState } from './types';

// Resolved to one locale, which is what every consumer below the server sees.
const flow = localizeFlow(getFlow(), 'de');
const reducer = createFlowReducer(flow);

/** Applies a sequence of option selections starting from the initial state. */
function run(selections: Array<{ stepId: number; value: boolean | number | string }>): FlowState {
  return selections.reduce<FlowState>(
    (state, { stepId, value }) => reducer(state, { type: 'selectOption', stepId, value }),
    initFlowState(flow),
  );
}

describe('flow reducer', () => {
  it('starts on the first step, awaiting an answer', () => {
    const state = initFlowState(flow);
    expect(state.status).toBe('in_progress');
    expect(state.steps).toHaveLength(1);
    expect(state.steps[0].step.id).toBe(100);
    expect(state.steps[0].selectedValue).toBeNull();
  });

  it('advances to the next step when an option is chosen', () => {
    const state = run([{ stepId: 100, value: true }]);
    expect(state.steps.map((s) => s.step.id)).toEqual([100, 200]);
    expect(state.steps[0].selectedValue).toBe(true);
    expect(state.status).toBe('in_progress');
  });

  it('completes the flow on a terminal option', () => {
    const state = run([
      { stepId: 100, value: false },
      { stepId: 200, value: false },
      { stepId: 300, value: 'ekz' },
    ]);
    expect(state.status).toBe('completed');
    expect(state.steps.map((s) => s.step.id)).toEqual([100, 200, 300]);
  });

  it('truncates downstream steps when an earlier answer changes', () => {
    const completed = run([
      { stepId: 100, value: false },
      { stepId: 200, value: false },
      { stepId: 300, value: 'ekz' },
    ]);

    // Re-answer the first step; everything after it must be discarded.
    const changed = reducer(completed, { type: 'selectOption', stepId: 100, value: true });
    expect(changed.steps.map((s) => s.step.id)).toEqual([100, 200]);
    expect(changed.status).toBe('in_progress');
    expect(changed.steps[0].selectedValue).toBe(true);
  });

  it('keeps downstream answers when the same value is re-selected', () => {
    const completed = run([
      { stepId: 100, value: false },
      { stepId: 200, value: false },
      { stepId: 300, value: 'ekz' },
    ]);

    // Clicking the already-selected option changes nothing, so the state must
    // come back by identity and the later answers must survive.
    const again = reducer(completed, { type: 'selectOption', stepId: 100, value: false });
    expect(again).toBe(completed);
  });

  it('keeps downstream answers when the last, unrelated answer is re-selected', () => {
    const completed = run([
      { stepId: 100, value: false },
      { stepId: 200, value: false },
      { stepId: 300, value: 'ekz' },
    ]);

    const again = reducer(completed, { type: 'selectOption', stepId: 300, value: 'ekz' });
    expect(again).toBe(completed);
    expect(again.status).toBe('completed');
  });

  it('collects answers as name/value pairs', () => {
    const state = run([
      { stepId: 100, value: true },
      { stepId: 200, value: true },
      { stepId: 201, value: 'full' },
      { stepId: 300, value: 'wkz' },
      { stepId: 301, value: 2 },
    ]);
    expect(state.status).toBe('completed');
    expect(selectAnswers(state)).toEqual([
      { name: 'liability', value: true },
      { name: 'casco', value: true },
      { name: 'cascoType', value: 'full' },
      { name: 'licensePlateType', value: 'wkz' },
      { name: 'vehicles', value: 2 },
    ]);
  });

  it('ignores a selection for an unknown step', () => {
    const initial = initFlowState(flow);
    const next = reducer(initial, { type: 'selectOption', stepId: 999, value: true });
    expect(next).toBe(initial);
  });

  it('ignores a selection with an option value not offered by the step', () => {
    const initial = initFlowState(flow);
    const next = reducer(initial, { type: 'selectOption', stepId: 100, value: 'nope' });
    expect(next).toBe(initial);
  });

  it('resets back to the first step', () => {
    const state = run([
      { stepId: 100, value: false },
      { stepId: 200, value: false },
      { stepId: 300, value: 'ekz' },
    ]);

    const reset = reducer(state, { type: 'reset' });
    expect(reset).toEqual(initFlowState(flow));
  });
});
