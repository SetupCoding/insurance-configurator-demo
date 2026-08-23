'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import type { Flow, OptionValue } from '@/lib/schema/flow';

import { clearSelections, loadSelections, saveSelections } from './persistence';
import { createFlowReducer, initFlowState, selectAnswers, selectSelections } from './reducer';

/**
 * Drives the insurance conversation. Wraps the pure flow state machine in a
 * `useReducer`, restores any previously answered steps after mount, and
 * persists progress so a refresh does not lose the user's answers.
 *
 * Pass `persist: false` once the conversation is over, which drops the stored
 * answers instead of leaving them behind.
 */
export function useInsuranceFlow(flow: Flow, { persist = true }: { persist?: boolean } = {}) {
  const reducer = useMemo(() => createFlowReducer(flow), [flow]);
  const [state, dispatch] = useReducer(reducer, flow, initFlowState);
  const [hydrated, setHydrated] = useState(false);
  const hasRestored = useRef(false);

  // Restore persisted selections once, after mount. Doing this in an effect
  // (rather than during init) keeps the server and client render identical and
  // avoids a hydration mismatch.
  useEffect(() => {
    if (hasRestored.current) return;
    hasRestored.current = true;
    for (const { stepId, value } of loadSelections()) {
      dispatch({ type: 'selectOption', stepId, value });
    }
    setHydrated(true);
  }, []);

  // Persist only after restoration, so the initial empty state never clobbers
  // saved progress.
  useEffect(() => {
    if (!hydrated) return;
    if (!persist) {
      // A submitted conversation is finished. Leaving it stored would let a
      // reload restore a completed flow that then offers to submit again.
      clearSelections();
      return;
    }
    saveSelections(selectSelections(state));
  }, [hydrated, persist, state]);

  const selectOption = useCallback(
    (stepId: number, value: OptionValue) => dispatch({ type: 'selectOption', stepId, value }),
    [],
  );

  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  const answers = useMemo(() => selectAnswers(state), [state]);
  const hasAnswers = state.steps.some((entry) => entry.selectedValue !== null);

  return {
    steps: state.steps,
    status: state.status,
    isFinished: state.status === 'completed',
    hasAnswers,
    answers,
    selectOption,
    reset,
  };
}
