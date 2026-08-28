import { describe, expect, it } from 'vitest';

import { DEFAULT_LOCALE, isLocale, LOCALES } from './locales';

describe('LOCALES', () => {
  it('has no duplicates', () => {
    expect(new Set(LOCALES).size).toBe(LOCALES.length);
  });

  it('includes the default, which everything falls back to', () => {
    expect(LOCALES).toContain(DEFAULT_LOCALE);
  });
});

describe('isLocale', () => {
  it('accepts every shipped locale', () => {
    for (const locale of LOCALES) {
      expect(isLocale(locale)).toBe(true);
    }
  });

  it('rejects a language the app does not ship', () => {
    expect(isLocale('fr')).toBe(false);
  });

  it('rejects a region-qualified tag, which is not a locale segment', () => {
    // `/de-AT` is not a route this app serves; negotiation is where a regional
    // tag gets narrowed to a locale.
    expect(isLocale('de-AT')).toBe(false);
  });

  it('rejects values that are not strings at all', () => {
    // It guards a route parameter and a query parameter, so it has to hold up
    // against whatever arrives there.
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(['de'])).toBe(false);
    expect(isLocale('')).toBe(false);
  });
});
