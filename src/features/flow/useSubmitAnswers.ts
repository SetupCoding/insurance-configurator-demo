'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { submitConversation } from '@/lib/api/submitConversation';
import type { Configuration } from '@/lib/schema/conversation';

import type { Answer } from './types';

type SubmitState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success'; configuration: Configuration }
  | { status: 'error'; error: Error };

const IDLE: SubmitState = { status: 'idle' };

function asError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error('Die Übermittlung ist fehlgeschlagen.');
}

/**
 * Hand-rolled rather than delegated to a mutation library, because this POST
 * must never retry on its own and must be cancellable. See ADR 0010 for the
 * full argument.
 */
export function useSubmitAnswers() {
  const [state, setState] = useState<SubmitState>(IDLE);
  const controller = useRef<AbortController | null>(null);
  const attempt = useRef(0);
  const inFlight = useRef(false);

  /** Retires the current attempt, so any response for it is ignored. */
  const discard = useCallback(() => {
    attempt.current += 1;
    inFlight.current = false;
    controller.current?.abort();
    controller.current = null;
  }, []);

  // Unmounting retires the attempt too, so a resolved fetch cannot set state
  // on a component that is already gone.
  useEffect(() => discard, [discard]);

  const submit = useCallback(
    (answers: Answer[]) => {
      // Synchronous, because two clicks in the same tick both read the
      // `isPending` of the render they were dispatched from; React state alone
      // cannot stop the second one from starting a second request.
      if (inFlight.current) return;

      discard();
      const current = attempt.current;
      const abort = new AbortController();
      inFlight.current = true;
      controller.current = abort;
      setState({ status: 'pending' });

      submitConversation(answers, abort.signal).then(
        (configuration) => {
          if (attempt.current !== current) return;
          inFlight.current = false;
          setState({ status: 'success', configuration });
        },
        (cause: unknown) => {
          if (attempt.current !== current) return;
          inFlight.current = false;
          setState({ status: 'error', error: asError(cause) });
        },
      );
    },
    [discard],
  );

  const reset = useCallback(() => {
    discard();
    setState(IDLE);
  }, [discard]);

  return {
    isIdle: state.status === 'idle',
    isPending: state.status === 'pending',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    configuration: state.status === 'success' ? state.configuration : undefined,
    error: state.status === 'error' ? state.error : undefined,
    submit,
    reset,
  };
}
