import { z } from 'zod';

import { submissionSchema } from './answer';
import { optionValueSchema } from './flow';

/**
 * The wire contract of `POST /api/conversation`, in both directions. Keeping
 * the response schema here (rather than trusting the shape on the client) means
 * the browser validates what it receives with the same schemas the server used
 * to produce it.
 */

/** One answered question, resolved back to the wording the user actually saw. */
export const configurationEntrySchema = z.object({
  name: z.string().min(1),
  question: z.string().min(1),
  value: optionValueSchema,
  label: z.string().min(1),
});

export const configurationSchema = z.array(configurationEntrySchema).min(1);

export const acceptedResponseSchema = z.object({
  status: z.literal('accepted'),
  configuration: configurationSchema,
});

/**
 * Machine-readable, language-neutral failure codes. The API stays neutral and
 * the UI owns the German wording, so a new locale never means changing the
 * server.
 */
export const errorCodeSchema = z.enum([
  'malformed_json',
  'payload_too_large',
  'invalid_submission',
  'invalid_path',
]);

export const errorResponseSchema = z.object({
  error: errorCodeSchema,
  /** Why the path was rejected. Diagnostic only; never shown to the user. */
  detail: z.string().optional(),
});

export const conversationRequestSchema = submissionSchema;

export type ConfigurationEntry = z.infer<typeof configurationEntrySchema>;
export type Configuration = z.infer<typeof configurationSchema>;
export type AcceptedResponse = z.infer<typeof acceptedResponseSchema>;
export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
