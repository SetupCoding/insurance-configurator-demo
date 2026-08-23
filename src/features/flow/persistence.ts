import { z } from 'zod';

import { optionValueSchema } from '@/lib/schema/flow';

import type { Selection } from './types';

const STORAGE_KEY = 'insurance-flow:selections';

/** Bumped whenever the stored shape changes, so older entries are discarded. */
const SCHEMA_VERSION = 1;

/** Restoring answers is a convenience across a refresh, not a record of them. */
const TTL_MS = 24 * 60 * 60 * 1000;

const storedSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  expiresAt: z.number().int().positive(),
  selections: z.array(z.object({ stepId: z.number().int(), value: optionValueSchema })),
});

/**
 * Reads persisted selections, returning [] when they are absent, corrupt, from
 * an older shape, expired, or storage is unavailable.
 *
 * There is deliberately no flow version here. Selections are restored by
 * replaying them through the reducer, which only accepts a value the step it
 * belongs to actually offers, so a changed flow truncates the restore instead
 * of reviving an answer that is no longer reachable.
 */
export function loadSelections(): Selection[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const stored = storedSchema.safeParse(JSON.parse(raw));
    if (!stored.success || stored.data.expiresAt <= Date.now()) {
      // Discarded rather than migrated: the cost of getting this wrong is the
      // user answering a handful of questions again.
      clearSelections();
      return [];
    }
    return stored.data.selections;
  } catch {
    return [];
  }
}

/** Persists selections. An empty list clears the entry rather than storing it. */
export function saveSelections(selections: Selection[]): void {
  if (typeof window === 'undefined') return;
  if (selections.length === 0) {
    clearSelections();
    return;
  }

  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        expiresAt: Date.now() + TTL_MS,
        selections,
      }),
    );
  } catch {
    // Intentionally ignored: persistence is a progressive enhancement, and
    // private mode or a full quota must not break the conversation.
  }
}

/** Removes any persisted selections. */
export function clearSelections(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Intentionally ignored, as above.
  }
}
