import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { LocaleLang } from '@/features/i18n/LocaleLang';
import { DEFAULT_LOCALE, isLocale, LOCALES } from '@/lib/i18n/locales';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  // Runs before the layout, so it cannot rely on the check below having
  // happened; an unknown locale would otherwise fail here rather than as the
  // 404 it actually is.
  const resolved = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const t = await getTranslations({ locale: resolved, namespace: 'metadata' });

  return {
    title: t('title'),
    description: t('description'),
    // The locale is in the URL, so each one is its own page and has to say so.
    // Without these a crawler reads two near-identical documents and picks one,
    // which is the wrong outcome for a page that exists in both languages.
    //
    // `x-default` is the entry for a visitor whose language matches neither, and
    // it has to agree with what the proxy would actually negotiate for them,
    // which is DEFAULT_LOCALE.
    alternates: {
      canonical: `/${resolved}`,
      languages: {
        ...Object.fromEntries(LOCALES.map((entry) => [entry, `/${entry}`])),
        'x-default': `/${DEFAULT_LOCALE}`,
      },
    },
  };
}

/**
 * Everything that depends on the language, and nothing that does not.
 *
 * The document shell is in the root layout on purpose, above this segment, so a
 * language change re-renders only what the language actually affects. See
 * ADR 0012.
 */
const LocaleLayout = async ({ children, params }: LayoutProps<'/[locale]'>) => {
  const { locale } = await params;
  // The proxy redirects anything whose first segment is not a locale, so
  // this is close to unreachable. It is still the right answer if it is ever
  // reached, and it is what narrows `locale` for everything below.
  if (!isLocale(locale)) notFound();

  // Tells next-intl which locale this render is for. Load-bearing: the
  // proxy here is ours and does not set next-intl's own locale header, so
  // without this every request would fall back to the default and `/de` would
  // render English. See ADR 0012.
  setRequestLocale(locale);

  const t = await getTranslations('layout');

  return (
    <NextIntlClientProvider>
      <LocaleLang locale={locale} />
      {/* The first focusable thing in the document, so it is the first thing a
          keyboard user reaches. Moving it below anything focusable defeats it. */}
      <a href="#main-content" className="skip-link">
        {t('skipToContent')}
      </a>
      {children}
    </NextIntlClientProvider>
  );
};

export default LocaleLayout;
