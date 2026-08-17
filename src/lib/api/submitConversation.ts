import type { Answer } from '@/features/flow/types';

/**
 * Resolves a path against the current origin. Browsers accept relative URLs,
 * but the Node fetch used in tests requires an absolute one, so this keeps the
 * client working in both environments.
 */
function toUrl(path: string): string {
  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
  return new URL(path, origin).toString();
}

/** Submits the completed conversation. Throws on a non-2xx response. */
export async function submitConversation(answers: Answer[]): Promise<void> {
  const response = await fetch(toUrl('/api/conversation'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(answers),
  });

  if (!response.ok) {
    throw new Error(`Die Übermittlung ist fehlgeschlagen (Status ${response.status}).`);
  }
}
