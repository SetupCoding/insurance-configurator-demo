import { z } from 'zod';

import { optionValueSchema } from '@/lib/schema/flow';

import type { Selection } from './types';

const STORAGE_KEY = 'insurance-flow:selections';

const selectionsSchema = z.array(z.object({ stepId: z.number().int(), value: optionValueSchema }));

/** Reads persisted selections, returning [] when absent, corrupt or unavailable. */
export function loadSelections(): Selection[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const result = selectionsSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

/** Persists selections. Storage failures (private mode, quota) are ignored. */
export function saveSelections(selections: Selection[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selections));
  } catch {
    // Intentionally ignored: persistence is a progressive enhancement.
  }
}
