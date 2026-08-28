'use client';

import { useEffect } from 'react';

import type { Locale } from '@/lib/i18n/locales';

type Props = {
  locale: Locale;
};

/**
 * Keeps `html[lang]` in step with the locale segment.
 *
 * The attribute is rendered by the root layout, which sits above `[locale]` so
 * that a language change does not remount the Emotion cache with it (ADR 0012).
 * The cost of that position is that Next does not re-render the root layout when
 * only the `[locale]` parameter changes, so on a client-side switch the server
 * never gets the chance to correct `lang`.
 *
 * Every document the server hands out is already correct, because the proxy
 * tells the root layout which locale it resolved: a direct visit, a reload and
 * anything a crawler fetches all render the right `lang` without this running.
 * This covers the one case left, which is the soft navigation between the two.
 */
export const LocaleLang = ({ locale }: Props) => {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
};
