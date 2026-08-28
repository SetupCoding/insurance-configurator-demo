'use client';

import TranslateIcon from '@mui/icons-material/Translate';
import { Button } from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

import { type Locale, LOCALES } from '@/lib/i18n/locales';

// Matches ResetButton: a small text button whose smaller icon does not need
// the alignment nudge the medium contained buttons get, only the line-height
// correction.
const buttonSx = { lineHeight: 1 } as const;

/**
 * The next locale in the list, wrapping around. With two locales that is simply
 * "the other one", which is what the single link below means. A third locale
 * would make this cycle, and at that point it should become a menu instead.
 *
 * An unrecognised current locale lands on the first entry, which is a sensible
 * place to send someone whose URL should not have rendered in the first place.
 */
function nextLocale(current: string): Locale {
  const index = LOCALES.findIndex((locale) => locale === current);
  return LOCALES[(index + 1) % LOCALES.length];
}

/** Swaps the locale segment, which the proxy guarantees is the first one. */
function withLocale(pathname: string, locale: Locale): string {
  const [, , ...rest] = pathname.split('/');
  return `/${[locale, ...rest].join('/')}`;
}

/**
 * A link rather than a control that swaps the text in place. The locale is part
 * of the URL, so changing it is navigation: a link is what can be opened in a
 * new tab, shared, crawled, and used before any JavaScript has run.
 *
 * It is labelled in the language it leads to, and carries `lang` to match, so a
 * screen reader announces "English" in English rather than reading it with
 * German pronunciation rules.
 */
export const LocaleSwitcher = () => {
  const t = useTranslations('locale');
  const active = useLocale();
  const pathname = usePathname();
  const target = nextLocale(active);

  return (
    <Button
      component={Link}
      href={withLocale(pathname, target)}
      hrefLang={target}
      lang={target}
      size="small"
      startIcon={<TranslateIcon />}
      sx={buttonSx}
    >
      {t(target)}
    </Button>
  );
};
