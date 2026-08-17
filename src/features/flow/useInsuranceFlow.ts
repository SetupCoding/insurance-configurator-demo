'use client';

import { useCallback, useMemo, useReducer } from 'react';

import type { Flow, OptionValue } from '@/lib/schema/flow';

import { createFlowReducer, initFlowState, selectAnswers } from './reducer';

/**
 * Drives the insurance conversation. Wraps the pure flow state machine in a
 * `useReducer` and exposes a small, intention-revealing API to the UI.
 */
export function useInsuranceFlow(flow: Flow) {
  const reducer = useMemo(() => createFlowReducer(flow), [flow]);
  const [state, dispatch] = useReducer(reducer, flow, initFlowState);

  const selectOption = useCallback(
    (stepId: number, value: OptionValue) => dispatch({ type: 'selectOption', stepId, value }),
    [],
  );

  const answers = useMemo(() => selectAnswers(state), [state]);

  return {
    steps: state.steps,
    status: state.status,
    isFinished: state.status === 'completed',
    answers,
    selectOption,
  };
}
