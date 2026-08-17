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

  it('rejects a non-integer id', () => {
    expect(() => stepSchema.parse({ ...validStep, id: 1.5 })).toThrow();
  });
});

describe('flowSchema', () => {
  it('rejects an empty flow', () => {
    expect(() => flowSchema.parse([])).toThrow();
  });

  it('parses an array of steps', () => {
    const parsed = flowSchema.parse([validStep]);
    expect(parsed).toHaveLength(1);
  });
});
