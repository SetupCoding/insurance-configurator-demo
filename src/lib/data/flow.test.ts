import { describe, expect, it } from 'vitest';

import { getFlow } from './flow';

/**
 * The graph invariants (unique ids and names, resolvable references,
 * reachability, acyclicity, and a translation for every locale) are guaranteed
 * by `flowDefinitionSchema` and tested against deliberately broken fixtures
 * there. Importing this module at all is what proves the bundled fixture
 * satisfies them, so this only covers the entry point the app relies on.
 */
describe('getFlow', () => {
  const flow = getFlow();

  it('returns the validated flow, starting with the liability step', () => {
    expect(flow.length).toBeGreaterThan(0);
    expect(flow[0].id).toBe(100);
    expect(flow[0].name).toBe('liability');
  });

  it('returns the same frozen-at-load instance on every call', () => {
    expect(getFlow()).toBe(flow);
  });
});
