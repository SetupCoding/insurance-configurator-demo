/**
 * The locales the app ships, and the only place that list exists.
 *
 * Adding one here is deliberately load-bearing. Every display text in the flow
 * fixture is a record keyed by this list (`localizedTextSchema` in
 * `lib/schema/flow.ts`), and Zod requires an enum-keyed record to be
 * exhaustive, so a new locale makes the app fail at import time until every
 * question and option has been translated. Translation completeness is an
 * invariant of the data rather than something to remember.
 *
 * Kept free of dependencies on purpose: the API route, the middleware and the
 * flow schema all need it, and none of them is a React component.
 */
export const LOCALES = ['de', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

/**
 * Used where a request names no locale: the redirect target for a bare path,
 * and the locale `POST /api/conversation` answers in when the query string
 * leaves it out.
 *
 * English rather than German, even though the domain is German insurance,
 * because of who actually lands on it. Negotiation already serves a German
 * browser German and an English one English, so this only decides what reaches
 * a browser asking for neither, a crawler sending no `Accept-Language`, and a
 * bare `curl`. For all three, English is the more useful answer, and it is what
 * `hreflang="x-default"` in the layout points at.
 */
export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
