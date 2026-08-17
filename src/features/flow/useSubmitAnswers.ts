'use client';

import { useMutation } from '@tanstack/react-query';

import { submitConversation } from '@/lib/api/submitConversation';

import type { Answer } from './types';

/** Mutation for submitting the completed conversation. */
export function useSubmitAnswers() {
  return useMutation({
    mutationFn: (answers: Answer[]) => submitConversation(answers),
  });
}
