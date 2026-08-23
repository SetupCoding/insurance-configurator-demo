import type { Answer } from '@/features/flow/types';
import {
  acceptedResponseSchema,
  type Configuration,
  type ErrorCode,
  errorResponseSchema,
} from '@/lib/schema/conversation';

/**
 * German wording for the API's language-neutral failure codes. The server stays
 * neutral, so adding a locale never means changing it.
 */
const MESSAGES: Record<ErrorCode, string> = {
  malformed_json: 'Die Anfrage war fehlerhaft aufgebaut.',
  payload_too_large: 'Die Anfrage war zu groß.',
  invalid_submission: 'Die Angaben waren unvollständig oder fehlerhaft.',
  invalid_path: 'Die Angaben passen nicht zum Gesprächsverlauf. Bitte starten Sie neu.',
};

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

async function messageFor(response: Response): Promise<string> {
  const body = errorResponseSchema.safeParse(await readJson(response));
  return body.success
    ? MESSAGES[body.data.error]
    : `Die Übermittlung ist fehlgeschlagen (Status ${response.status}).`;
}

/**
 * The response is validated against the same schema the route produces it with,
 * so a wrong shape fails here rather than surfacing as an empty success in a
 * component.
 *
 * Rejects on a non-2xx response, and with an AbortError when `signal` fires.
 */
export async function submitConversation(
  answers: Answer[],
  signal?: AbortSignal,
): Promise<Configuration> {
  const response = await fetch(toUrl('/api/conversation'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(answers),
    signal,
  });

  if (!response.ok) {
    throw new Error(await messageFor(response));
  }

  const accepted = acceptedResponseSchema.safeParse(await readJson(response));
  if (!accepted.success) {
    throw new Error('Die Antwort des Servers war unerwartet aufgebaut.');
  }

  return accepted.data.configuration;
}
