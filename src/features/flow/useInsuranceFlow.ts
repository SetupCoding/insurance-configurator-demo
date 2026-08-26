'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import type { Flow, OptionValue } from '@/lib/schema/flow';

import { clearSelections, loadSelections, saveSelections } from './persistence';
import { createFlowReducer, initFlowState, selectAnswers, selectSelections } from './reducer';

/**
 * Wraps the pure state machine, and owns the storage side of it.
 *
 * Pass `persist: false` once the conversation is over: the answers stay on
 * screen but the stored copy goes away, so a reload starts fresh.
 */
export function useInsuranceFlow(flow: Flow, { persist = true }: { persist?: boolean } = {}) {
  const reducer = useMemo(() => createFlowReducer(flow), [flow]);
  const [state, dispatch] = useReducer(reducer, flow, initFlowState);
  const [hydrated, setHydrated] = useState(false);
  const hasRestored = useRef(false);

  // In an effect rather than during init, because the server has no storage to
  // read: initialising from it would make the first client render differ from
  // the server's and trip a hydration mismatch.
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
    isFinished: state.status === 'completed',
    hasAnswers,
    answers,
    selectOption,
    reset,
  };
}
