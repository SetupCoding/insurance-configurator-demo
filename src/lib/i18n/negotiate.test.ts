import { describe, expect, it } from 'vitest';

import { DEFAULT_LOCALE } from './locales';
import { negotiateLocale } from './negotiate';

/**
 * The fallback cases assert against `DEFAULT_LOCALE` rather than a literal.
 * They are about "falls back", not about which language that happens to be, so
 * changing the default should not make them fail. The matching cases below use
 * literals, because there the specific language is the point.
 */
describe('negotiateLocale', () => {
  it('falls back to the default when there is no header', () => {
    expect(negotiateLocale(null)).toBe(DEFAULT_LOCALE);
  });

  it('falls back to the default for an empty header', () => {
    expect(negotiateLocale('')).toBe(DEFAULT_LOCALE);
  });

  it('matches an exact tag', () => {
    expect(negotiateLocale('en')).toBe('en');
    expect(negotiateLocale('de')).toBe('de');
  });

  it('narrows a region-qualified tag to its language', () => {
    // What a browser actually sends. Falling through to the default here would
    // serve the wrong language to someone who did state a preference.
    expect(negotiateLocale('en-GB')).toBe('en');
    expect(negotiateLocale('de-AT')).toBe('de');
  });

  it('is case-insensitive', () => {
    expect(negotiateLocale('DE-AT')).toBe('de');
  });

  it('skips languages the app does not ship', () => {
    expect(negotiateLocale('fr-FR,fr,de')).toBe('de');
  });

  it('takes a supported language listed after an unsupported one', () => {
    // The header WebKit builds for a French locale on a German machine: it
    // appends the OS locale. German was asked for, so German is the answer, and
    // falling back to the default here would ignore a stated preference. This is
    // the case the e2e suite cannot assert, because Chromium and WebKit both
    // refuse to let a test own this header.
    expect(negotiateLocale('fr-FR, de-DE')).toBe('de');
  });

  it('falls back when nothing in the header is supported', () => {
    expect(negotiateLocale('fr,es,it')).toBe(DEFAULT_LOCALE);
  });

  it('honours quality over the order tags appear in', () => {
    expect(negotiateLocale('en;q=0.5,de;q=0.9')).toBe('de');
    expect(negotiateLocale('de;q=0.2,en;q=0.8')).toBe('en');
  });

  it('keeps the header order when qualities are equal', () => {
    expect(negotiateLocale('en;q=0.8,de;q=0.8')).toBe('en');
    expect(negotiateLocale('de;q=0.8,en;q=0.8')).toBe('de');
  });

  it('treats a tag with no quality as the most preferred', () => {
    expect(negotiateLocale('en;q=0.9,de')).toBe('de');
  });

  it('drops a tag the client explicitly refused with q=0', () => {
    // `de;q=0` means "not German", so returning German would be the one answer
    // the header rules out.
    expect(negotiateLocale('de;q=0,en;q=0.1')).toBe('en');
  });

  it('reads a wildcard as no preference', () => {
    expect(negotiateLocale('*')).toBe(DEFAULT_LOCALE);
    expect(negotiateLocale('fr,*')).toBe(DEFAULT_LOCALE);
  });

  it('prefers a named locale over a wildcard of lower quality', () => {
    expect(negotiateLocale('*;q=0.1,de;q=0.9')).toBe('de');
  });

  it('ignores an unparseable quality rather than failing the request', () => {
    expect(negotiateLocale('de;q=high')).toBe('de');
  });

  it('tolerates stray whitespace and empty entries', () => {
    expect(negotiateLocale('  ,  de-AT ;  q=0.9 , en ; q=0.1 ')).toBe('de');
  });
});
