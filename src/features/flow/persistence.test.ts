import { describe, expect, it } from 'vitest';

import { clearSelections, loadSelections, saveSelections } from './persistence';

const STORAGE_KEY = 'insurance-flow:selections';

function stored(): unknown {
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  return raw === null ? null : JSON.parse(raw);
}

function write(value: unknown) {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

describe('selection persistence', () => {
  it('round-trips saved selections', () => {
    saveSelections([
      { stepId: 100, value: true },
      { stepId: 200, value: 'full' },
    ]);

    expect(loadSelections()).toEqual([
      { stepId: 100, value: true },
      { stepId: 200, value: 'full' },
    ]);
  });

  it('stores the schema version and an expiry alongside the selections', () => {
    saveSelections([{ stepId: 100, value: true }]);

    expect(stored()).toMatchObject({ schemaVersion: 1 });
    expect((stored() as { expiresAt: number }).expiresAt).toBeGreaterThan(Date.now());
  });

  it('returns an empty array when nothing is stored', () => {
    expect(loadSelections()).toEqual([]);
  });

  it('ignores corrupt stored data', () => {
    window.sessionStorage.setItem(STORAGE_KEY, '{ not valid json');
    expect(loadSelections()).toEqual([]);
  });

  it('ignores data that does not match the schema', () => {
    write([{ stepId: 'x', value: {} }]);
    expect(loadSelections()).toEqual([]);
  });

  it('discards an entry written by an older schema version', () => {
    write({
      schemaVersion: 0,
      expiresAt: Date.now() + 1000,
      selections: [{ stepId: 100, value: true }],
    });

    expect(loadSelections()).toEqual([]);
    expect(stored()).toBeNull();
  });

  it('discards an expired entry instead of restoring it', () => {
    write({
      schemaVersion: 1,
      expiresAt: Date.now() - 1,
      selections: [{ stepId: 100, value: true }],
    });

    expect(loadSelections()).toEqual([]);
    expect(stored()).toBeNull();
  });

  it('clears the entry rather than storing an empty selection list', () => {
    saveSelections([{ stepId: 100, value: true }]);
    saveSelections([]);

    expect(stored()).toBeNull();
  });

  it('clears the entry on request', () => {
    saveSelections([{ stepId: 100, value: true }]);
    clearSelections();

    expect(stored()).toBeNull();
    expect(loadSelections()).toEqual([]);
  });
});
