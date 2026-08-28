import { describe, expect, it } from 'vitest';

import { flowDefinitionSchema, stepDefinitionSchema } from './flow';

/** A display text in both locales, so a fixture stays readable. */
function loc(de: string, en: string) {
  return { de, en };
}

const validStep = {
  id: 100,
  name: 'liability',
  text: loc('Benötigen Sie eine Haftpflichtversicherung?', 'Do you need liability insurance?'),
  uiType: 'button',
  valueType: 'boolean',
  valueOptions: [
    { nextId: 200, value: true, text: loc('Ja', 'Yes') },
    { nextId: false, value: false, text: loc('Nein', 'No') },
  ],
};

const secondStep = {
  id: 200,
  name: 'casco',
  text: loc('Benötigen Sie eine Kasko?', 'Do you need casco cover?'),
  uiType: 'button',
  valueType: 'boolean',
  valueOptions: [
    { nextId: false, value: true, text: loc('Ja', 'Yes') },
    { nextId: false, value: false, text: loc('Nein', 'No') },
  ],
};

/** The smallest flow that satisfies every invariant, as a mutation baseline. */
const validFlow = [validStep, secondStep];

/** Returns the messages of every issue a flow produced, for readable assertions. */
function issuesOf(flow: unknown): string[] {
  const result = flowDefinitionSchema.safeParse(flow);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

describe('stepDefinitionSchema', () => {
  it('accepts a well-formed step', () => {
    expect(() => stepDefinitionSchema.parse(validStep)).not.toThrow();
  });

  it('accepts false as a terminal nextId', () => {
    const parsed = stepDefinitionSchema.parse(validStep);
    expect(parsed.valueOptions[1].nextId).toBe(false);
  });

  it('rejects a step with no options', () => {
    expect(() => stepDefinitionSchema.parse({ ...validStep, valueOptions: [] })).toThrow();
  });

  it('rejects an unknown valueType', () => {
    expect(() => stepDefinitionSchema.parse({ ...validStep, valueType: 'date' })).toThrow();
  });

  it('rejects an unsupported uiType', () => {
    expect(() => stepDefinitionSchema.parse({ ...validStep, uiType: 'select' })).toThrow();
  });

  it('rejects a non-integer id', () => {
    expect(() => stepDefinitionSchema.parse({ ...validStep, id: 1.5 })).toThrow();
  });

  it('rejects an empty option text', () => {
    const valueOptions = [{ nextId: false, value: true, text: loc('', '') }];
    expect(() => stepDefinitionSchema.parse({ ...validStep, valueOptions })).toThrow();
  });

  it('rejects a plain string where a localised text belongs', () => {
    // What the fixture looked like before the flow carried translations, and
    // the shape an untranslated hand-edit would produce.
    expect(() => stepDefinitionSchema.parse({ ...validStep, text: 'Nur Deutsch' })).toThrow();
  });
});

describe('translation completeness', () => {
  it('rejects a question that is missing a locale', () => {
    const step = { ...validStep, text: { de: 'Nur Deutsch' } };
    expect(() => stepDefinitionSchema.parse(step)).toThrow();
  });

  it('rejects an option label that is missing a locale', () => {
    const valueOptions = [{ nextId: false, value: true, text: { en: 'Yes only' } }];
    expect(() => stepDefinitionSchema.parse({ ...validStep, valueOptions })).toThrow();
  });

  it('rejects a translation for a locale the app does not ship', () => {
    const step = { ...validStep, text: { de: 'Deutsch', en: 'English', fr: 'Français' } };
    expect(() => stepDefinitionSchema.parse(step)).toThrow();
  });

  it('names the missing locale in the issue path', () => {
    const step = { ...validStep, text: { de: 'Nur Deutsch' } };
    const result = stepDefinitionSchema.safeParse(step);
    expect(result.success).toBe(false);
    expect(result.success === false && result.error.issues[0].path).toEqual(['text', 'en']);
  });
});

describe('flowDefinitionSchema', () => {
  it('rejects an empty flow', () => {
    expect(() => flowDefinitionSchema.parse([])).toThrow();
  });

  it('accepts a flow that satisfies every invariant', () => {
    expect(flowDefinitionSchema.parse(validFlow)).toHaveLength(2);
  });

  it('accepts a diamond, where two branches converge on the same step', () => {
    const fork = {
      ...validStep,
      valueOptions: [
        { nextId: 200, value: true, text: loc('Ja', 'Yes') },
        { nextId: 300, value: false, text: loc('Nein', 'No') },
      ],
    };
    const left = {
      ...secondStep,
      valueOptions: [{ nextId: 400, value: true, text: loc('Ja', 'Yes') }],
    };
    const right = { ...secondStep, id: 300, name: 'right', valueOptions: left.valueOptions };
    const join = { ...secondStep, id: 400, name: 'join' };

    // Two paths reaching the same step is convergence, not a cycle.
    expect(() => flowDefinitionSchema.parse([fork, left, right, join])).not.toThrow();
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
      { nextId: 200, value: 'yes', text: loc('Ja', 'Yes') },
      { nextId: false, value: false, text: loc('Nein', 'No') },
    ];
    expect(issuesOf([{ ...validStep, valueOptions }, secondStep])).toContain(
      'Option value must be a boolean, got string.',
    );
  });

  it('rejects duplicate option values within a step', () => {
    const valueOptions = [
      { nextId: 200, value: true, text: loc('Ja', 'Yes') },
      { nextId: false, value: true, text: loc('Doch', 'Indeed') },
    ];
    expect(issuesOf([{ ...validStep, valueOptions }, secondStep])).toContain(
      'Duplicate option value true.',
    );
  });

  it('rejects duplicate option texts within a step, naming the locale', () => {
    const valueOptions = [
      { nextId: 200, value: true, text: loc('Ja', 'Yes') },
      { nextId: false, value: false, text: loc('Ja', 'No') },
    ];
    expect(issuesOf([{ ...validStep, valueOptions }, secondStep])).toContain(
      'Duplicate option text "Ja" in locale "de".',
    );
  });

  it('reports a duplicate in one locale without implicating the other', () => {
    // The German labels differ and the English ones collide, so only English
    // would show the same button twice. Checking the texts as a single unit
    // would have missed this entirely.
    const valueOptions = [
      { nextId: 200, value: true, text: loc('Ja', 'Yes') },
      { nextId: false, value: false, text: loc('Nein', 'Yes') },
    ];
    expect(issuesOf([{ ...validStep, valueOptions }, secondStep])).toEqual([
      'Duplicate option text "Yes" in locale "en".',
    ]);
  });

  it('rejects a nextId that matches no step', () => {
    const valueOptions = [
      { nextId: 999, value: true, text: loc('Ja', 'Yes') },
      { nextId: false, value: false, text: loc('Nein', 'No') },
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
    const loop = {
      ...secondStep,
      valueOptions: [{ nextId: 100, value: true, text: loc('Ja', 'Yes') }],
    };
    expect(issuesOf([validStep, loop])).toContain('The flow contains a cycle: 100 -> 200 -> 100.');
  });

  it('rejects a step that points at itself', () => {
    const selfLoop = {
      ...secondStep,
      valueOptions: [{ nextId: 200, value: true, text: loc('Ja', 'Yes') }],
    };
    expect(issuesOf([validStep, selfLoop])).toContain('The flow contains a cycle: 200 -> 200.');
  });

  it('reports the dangling reference alone, not a graph derived from it', () => {
    const valueOptions = [{ nextId: 999, value: true, text: loc('Ja', 'Yes') }];
    const messages = issuesOf([{ ...validStep, valueOptions }, secondStep]);
    expect(messages).toEqual(['nextId 999 matches no step.']);
  });
});
