import { describe, expect, it } from 'vitest';

import { getFlow } from '@/lib/data/flow';
import { LOCALES } from '@/lib/i18n/locales';

import { localizeFlow } from './localizeFlow';

const definition = getFlow();

describe('localizeFlow', () => {
  it('resolves every question and option label to a plain string', () => {
    const flow = localizeFlow(definition, 'de');

    for (const step of flow) {
      expect(typeof step.text).toBe('string');
      for (const option of step.valueOptions) {
        expect(typeof option.text).toBe('string');
      }
    }
  });

  it('picks the wording of the locale it was given', () => {
    expect(localizeFlow(definition, 'de')[0].text).toBe(
      'Benötigen Sie eine Haftpflichtversicherung?',
    );
    expect(localizeFlow(definition, 'en')[0].text).toBe('Do you need liability insurance?');
  });

  it('resolves option labels too, not just questions', () => {
    const german = localizeFlow(definition, 'de')[0].valueOptions.map((o) => o.text);
    const english = localizeFlow(definition, 'en')[0].valueOptions.map((o) => o.text);

    expect(german).toEqual(['Ja', 'Nein']);
    expect(english).toEqual(['Yes', 'No']);
  });

  it('carries no other translation into the result', () => {
    // The point of resolving on the server: what ships to the client holds one
    // language, not all of them.
    const serialised = JSON.stringify(localizeFlow(definition, 'en'));

    expect(serialised).not.toContain('Benötigen');
    expect(serialised).not.toContain('"de"');
  });

  it('leaves the graph exactly as it was', () => {
    // Only text changes, which is what makes it impossible for this to
    // invalidate anything the schema proved about the structure.
    for (const locale of LOCALES) {
      const flow = localizeFlow(definition, locale);

      expect(flow.map((step) => step.id)).toEqual(definition.map((step) => step.id));
      expect(flow.map((step) => step.name)).toEqual(definition.map((step) => step.name));
      expect(flow.map((step) => step.valueOptions.map((option) => option.nextId))).toEqual(
        definition.map((step) => step.valueOptions.map((option) => option.nextId)),
      );
      expect(flow.map((step) => step.valueOptions.map((option) => option.value))).toEqual(
        definition.map((step) => step.valueOptions.map((option) => option.value)),
      );
    }
  });

  it('does not mutate the definition it was given', () => {
    const before = JSON.stringify(definition);
    localizeFlow(definition, 'en');
    expect(JSON.stringify(definition)).toBe(before);
  });
});
