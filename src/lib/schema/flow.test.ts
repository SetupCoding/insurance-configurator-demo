import { describe, expect, it } from 'vitest';

import { flowSchema, stepSchema } from './flow';

const validStep = {
  id: 100,
  name: 'liability',
  text: 'Benötigen Sie eine Haftpflichtversicherung?',
  uiType: 'button',
  valueType: 'boolean',
  valueOptions: [
    { nextId: 200, value: true, text: 'Ja' },
    { nextId: false, value: false, text: 'Nein' },
  ],
};

const secondStep = {
  id: 200,
  name: 'casco',
  text: 'Benötigen Sie eine Kasko?',
  uiType: 'button',
  valueType: 'boolean',
  valueOptions: [
    { nextId: false, value: true, text: 'Ja' },
    { nextId: false, value: false, text: 'Nein' },
  ],
};

/** The smallest flow that satisfies every invariant, as a mutation baseline. */
const validFlow = [validStep, secondStep];

/** Returns the messages of every issue a flow produced, for readable assertions. */
function issuesOf(flow: unknown): string[] {
  const result = flowSchema.safeParse(flow);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

describe('stepSchema', () => {
  it('accepts a well-formed step', () => {
    expect(() => stepSchema.parse(validStep)).not.toThrow();
  });

  it('accepts false as a terminal nextId', () => {
    const parsed = stepSchema.parse(validStep);
    expect(parsed.valueOptions[1].nextId).toBe(false);
  });

  it('rejects a step with no options', () => {
    expect(() => stepSchema.parse({ ...validStep, valueOptions: [] })).toThrow();
  });

  it('rejects an unknown valueType', () => {
    expect(() => stepSchema.parse({ ...validStep, valueType: 'date' })).toThrow();
  });

  it('rejects an unsupported uiType', () => {
    expect(() => stepSchema.parse({ ...validStep, uiType: 'select' })).toThrow();
  });

  it('rejects a non-integer id', () => {
    expect(() => stepSchema.parse({ ...validStep, id: 1.5 })).toThrow();
  });

  it('rejects an empty option text', () => {
    const valueOptions = [{ nextId: false, value: true, text: '' }];
    expect(() => stepSchema.parse({ ...validStep, valueOptions })).toThrow();
  });
});

describe('flowSchema', () => {
  it('rejects an empty flow', () => {
    expect(() => flowSchema.parse([])).toThrow();
  });

  it('accepts a flow that satisfies every invariant', () => {
    expect(flowSchema.parse(validFlow)).toHaveLength(2);
  });

  it('accepts a diamond, where two branches converge on the same step', () => {
    const fork = {
      ...validStep,
      valueOptions: [
        { nextId: 200, value: true, text: 'Ja' },
        { nextId: 300, value: false, text: 'Nein' },
      ],
    };
    const left = { ...secondStep, valueOptions: [{ nextId: 400, value: true, text: 'Ja' }] };
    const right = { ...secondStep, id: 300, name: 'right', valueOptions: left.valueOptions };
    const join = { ...secondStep, id: 400, name: 'join' };

    // Two paths reaching the same step is convergence, not a cycle.
    expect(() => flowSchema.parse([fork, left, right, join])).not.toThrow();
  });

  it('rejects duplicate step ids', () => {
    const flow = [validStep, { ...secondStep, id: 100 }];
    expect(issuesOf(flow)).toContain('Duplicate step id 100, already used at index 0.');
  });

  it('rejects duplicate step names', () => {
    const flow = [validStep, { ...secondStep, name: 'liability' }];
    expect(issuesOf(flow)).toContain('Duplicate step name "liability", already used at index 0.');
  });

  it('rejects an option value that does not match the step valueType', () => {
    const valueOptions = [
      { nextId: 200, value: 'yes', text: 'Ja' },
      { nextId: false, value: false, text: 'Nein' },
    ];
    expect(issuesOf([{ ...validStep, valueOptions }, secondStep])).toContain(
      'Option value must be a boolean, got string.',
    );
  });

  it('rejects duplicate option values within a step', () => {
    const valueOptions = [
      { nextId: 200, value: true, text: 'Ja' },
      { nextId: false, value: true, text: 'Doch' },
    ];
    expect(issuesOf([{ ...validStep, valueOptions }, secondStep])).toContain(
      'Duplicate option value true.',
    );
  });

  it('rejects duplicate option texts within a step', () => {
    const valueOptions = [
      { nextId: 200, value: true, text: 'Ja' },
      { nextId: false, value: false, text: 'Ja' },
    ];
    expect(issuesOf([{ ...validStep, valueOptions }, secondStep])).toContain(
      'Duplicate option text "Ja".',
    );
  });

  it('rejects a nextId that matches no step', () => {
    const valueOptions = [
      { nextId: 999, value: true, text: 'Ja' },
      { nextId: false, value: false, text: 'Nein' },
    ];
    expect(issuesOf([{ ...validStep, valueOptions }, secondStep])).toContain(
      'nextId 999 matches no step.',
    );
  });

  it('rejects a step that is unreachable from the first one', () => {
    const orphan = { ...secondStep, id: 300, name: 'orphan' };
    expect(issuesOf([...validFlow, orphan])).toContain(
      'Step 300 is unreachable from the first step.',
    );
  });

  it('rejects a cycle', () => {
    const loop = { ...secondStep, valueOptions: [{ nextId: 100, value: true, text: 'Ja' }] };
    expect(issuesOf([validStep, loop])).toContain('The flow contains a cycle: 100 -> 200 -> 100.');
  });

  it('rejects a step that points at itself', () => {
    const selfLoop = { ...secondStep, valueOptions: [{ nextId: 200, value: true, text: 'Ja' }] };
    expect(issuesOf([validStep, selfLoop])).toContain('The flow contains a cycle: 200 -> 200.');
  });

  it('reports the dangling reference alone, not a graph derived from it', () => {
    const valueOptions = [{ nextId: 999, value: true, text: 'Ja' }];
    const messages = issuesOf([{ ...validStep, valueOptions }, secondStep]);
    expect(messages).toEqual(['nextId 999 matches no step.']);
  });
});
