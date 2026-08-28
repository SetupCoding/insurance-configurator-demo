import { optionValueSchema } from './flow';
import { z } from './zod';

/**
 * The wire contract of `POST /api/conversation`, in both directions. Keeping
 * the response schema here (rather than trusting the shape on the client) means
 * the browser validates what it receives with the same schemas the server used
 * to produce it.
 */

/** One answered question, carrying the wording the user actually saw. */
const configurationEntrySchema = z.object({
  /** Language-neutral, and the same in every locale. */
  name: z.string().min(1),
  question: z.string().min(1),
  value: optionValueSchema,
  label: z.string().min(1),
});

const configurationSchema = z.array(configurationEntrySchema).min(1);

export const acceptedResponseSchema = z.object({
  status: z.literal('accepted'),
  configuration: configurationSchema,
});

/**
 * Machine-readable, language-neutral failure codes. The UI owns the wording for
 * each one, so adding a locale never means changing this list.
 *
 * Worth being precise about what that does and does not claim, because an
 * earlier version of this comment overstated it into "a new locale never means
 * changing the server". These codes are neutral. `question` and `label` above
 * are not: they are display text, and the server sends them in the locale the
 * request asked for. That is deliberate rather than an oversight. The response
 * is rebuilt from the server's own walk of the flow, which is what makes it
 * evidence that validation ran (ADR 0009), and it is why the wording lives in
 * the flow data, translated for every locale, instead of in the client. What a
 * new locale actually costs is a translation in `flow.json` and a message file,
 * and no change to this contract. See ADR 0012.
 */
const errorCodeSchema = z.enum([
  'malformed_json',
  'payload_too_large',
  'invalid_submission',
  'invalid_path',
  'unsupported_locale',
]);

export const errorResponseSchema = z.object({
  error: errorCodeSchema,
  /** Why the path was rejected. Diagnostic only; never shown to the user. */
  detail: z.string().optional(),
});

export type ConfigurationEntry = z.infer<typeof configurationEntrySchema>;
export type Configuration = z.infer<typeof configurationSchema>;
export type ErrorCode = z.infer<typeof errorCodeSchema>;
