import { DEFAULT_LOCALE, isLocale, type Locale } from './locales';

type Preference = { tag: string; quality: number };

/**
 * Parses `Accept-Language` into tags ordered by descending quality.
 *
 * A malformed entry is skipped rather than failing the request: the header is
 * a hint from the client, and the worst outcome of ignoring part of it is the
 * default locale. `sort` is stable, so entries of equal quality keep the order
 * the header listed them in, which is the tie-break RFC 9110 specifies.
 */
function parsePreferences(header: string): Preference[] {
  return header
    .split(',')
    .flatMap((part) => {
      const [tag, ...parameters] = part.trim().split(';');
      if (!tag) return [];

      const quality = parameters.reduce((current, parameter) => {
        const match = /^\s*q=(\d(?:\.\d+)?)\s*$/i.exec(parameter);
        return match ? Number(match[1]) : current;
      }, 1);

      // `q=0` means "explicitly not this one", so it is dropped rather than
      // ranked last.
      if (quality <= 0) return [];
      return [{ tag: tag.trim().toLowerCase(), quality }];
    })
    .sort((first, second) => second.quality - first.quality);
}

/**
 * Picks the best supported locale for an `Accept-Language` header.
 *
 * Matches the full tag first and then its primary subtag, so `de-AT` is served
 * German rather than falling through to the default. `*` means the client has
 * no preference left to express, which is the default by definition.
 */
export function negotiateLocale(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;

  for (const { tag } of parsePreferences(header)) {
    if (tag === '*') return DEFAULT_LOCALE;
    if (isLocale(tag)) return tag;

    const primary = tag.split('-')[0];
    if (isLocale(primary)) return primary;
  }

  return DEFAULT_LOCALE;
}
