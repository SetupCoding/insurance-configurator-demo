import type { Answer } from '@/features/flow/types';
import type { Locale } from '@/lib/i18n/locales';
import {
  acceptedResponseSchema,
  type Configuration,
  type ErrorCode,
  errorResponseSchema,
} from '@/lib/schema/conversation';

/**
 * Everything that can go wrong, as a code rather than a sentence.
 *
 * The server's own codes plus the two failures it cannot report itself: a reply
 * that is not in the contract at all, and never getting a reply. Translating
 * these is the UI's job, which is what keeps the wording out of this layer and
 * makes a new locale a message file rather than a code change.
 */
export type SubmissionFailure = ErrorCode | 'unexpected_response' | 'transport';

/** Carries the code. `message` exists for logs and is never shown to a user. */
export class SubmissionError extends Error {
  constructor(readonly code: SubmissionFailure) {
    super(`Submission failed: ${code}`);
    this.name = 'SubmissionError';
  }
}

/**
 * Resolves a path against the current origin. Browsers accept relative URLs,
 * but the Node fetch used in tests requires an absolute one, so this keeps the
 * client working in both environments.
 */
function toUrl(path: string): string {
  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
  return new URL(path, origin).toString();
}

/** Reads a JSON body, tolerating an empty or non-JSON one. */
async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * The code the server reported, or `unexpected_response` when the error body is
 * not in the contract's shape either. A failed request that cannot say why is
 * still a server that is not holding up its end.
 */
async function failureFor(response: Response): Promise<SubmissionFailure> {
  const body = errorResponseSchema.safeParse(await readJson(response));
  return body.success ? body.data.error : 'unexpected_response';
}

/**
 * The response is validated against the same schema the route produces it with,
 * so a wrong shape fails here rather than surfacing as an empty success in a
 * component.
 *
 * `locale` goes on the query string because the reply carries display wording,
 * so the server has to know which language to resolve it in. Rejects with a
 * `SubmissionError` on failure, and with an `AbortError` when `signal` fires.
 */
export async function submitConversation(
  answers: Answer[],
  locale: Locale,
  signal?: AbortSignal,
): Promise<Configuration> {
  const url = new URL(toUrl('/api/conversation'));
  url.searchParams.set('locale', locale);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(answers),
      signal,
    });
  } catch (cause) {
    // An abort is not a failure to report. The caller retired this attempt on
    // purpose and drops whatever comes back, so it is rethrown untouched rather
    // than turned into something the UI would try to explain.
    if (cause instanceof Error && cause.name === 'AbortError') throw cause;
    throw new SubmissionError('transport');
  }

  if (!response.ok) {
    throw new SubmissionError(await failureFor(response));
  }

  const accepted = acceptedResponseSchema.safeParse(await readJson(response));
  if (!accepted.success) {
    throw new SubmissionError('unexpected_response');
  }

  return accepted.data.configuration;
}
