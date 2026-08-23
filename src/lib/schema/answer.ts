import { z } from 'zod';

import { optionValueSchema } from './flow';

/**
 * A submitted conversation as it goes over the wire.
 *
 * This is a shape check and nothing more. Whether the answers form a path the
 * flow could actually have produced cannot be expressed here, because it
 * depends on the flow; `validateSubmission` in lib/domain answers that.
 */
export const answerSchema = z.object({
  name: z.string().min(1),
  value: optionValueSchema,
});

export const submissionSchema = z.array(answerSchema).min(1);

export type SubmissionAnswer = z.infer<typeof answerSchema>;
export type Submission = z.infer<typeof submissionSchema>;
