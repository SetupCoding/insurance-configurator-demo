import { z } from 'zod';

import { optionValueSchema } from './flow';

/**
 * Schema for a submitted conversation: the list of answers the user gave,
 * each identified by the step `name` and carrying the chosen `value`.
 */
export const answerSchema = z.object({
  name: z.string().min(1),
  value: optionValueSchema,
});

export const submissionSchema = z.array(answerSchema).min(1);

export type SubmissionAnswer = z.infer<typeof answerSchema>;
export type Submission = z.infer<typeof submissionSchema>;
