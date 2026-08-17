import { describe, expect, it } from 'vitest';

import { loadSelections, saveSelections } from './persistence';

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

  it('returns an empty array when nothing is stored', () => {
    expect(loadSelections()).toEqual([]);
  });

  it('ignores corrupt stored data', () => {
    window.sessionStorage.setItem('insurance-flow:selections', '{ not valid json');
    expect(loadSelections()).toEqual([]);
  });

  it('ignores data that does not match the schema', () => {
    window.sessionStorage.setItem(
      'insurance-flow:selections',
      JSON.stringify([{ stepId: 'x', value: {} }]),
    );
    expect(loadSelections()).toEqual([]);
  });
});
