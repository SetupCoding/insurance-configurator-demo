import { describe, expect, it } from 'vitest';

import { getFlow } from './flow';

describe('getFlow', () => {
  const flow = getFlow();

  it('returns a non-empty, validated flow', () => {
    expect(flow.length).toBeGreaterThan(0);
  });

  it('starts with the liability step (id 100)', () => {
    expect(flow[0].id).toBe(100);
    expect(flow[0].name).toBe('liability');
  });

  it('has unique step ids', () => {
    const ids = flow.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only references reachable steps (referential integrity)', () => {
    const ids = new Set(flow.map((step) => step.id));

    for (const step of flow) {
      for (const option of step.valueOptions) {
        if (option.nextId !== false) {
          expect(ids.has(option.nextId)).toBe(true);
        }
      }
    }
  });

  it('has at least one terminal option that ends the flow', () => {
    const hasTerminal = flow.some((step) =>
      step.valueOptions.some((option) => option.nextId === false),
    );
    expect(hasTerminal).toBe(true);
  });
});
