import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import '../globals.css';

import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { DEFAULT_LOCALE, isLocale, LOCALES } from '@/lib/i18n/locales';
import { NONCE_HEADER } from '@/lib/security/csp';
import { THEME_COLORS } from '@/theme/theme';
import { ThemeRegistry } from '@/theme/ThemeRegistry';

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

export const viewport: Viewport = {
  themeColor: THEME_COLORS,
  width: 'device-width',
  initialScale: 1,
};

const LocaleLayout = async ({ children, params }: LayoutProps<'/[locale]'>) => {
  const { locale } = await params;
  // The proxy redirects anything whose first segment is not a locale, so
  // this is close to unreachable. It is still the right answer if it is ever
  // reached, and it is what narrows `locale` for everything below.
  if (!isLocale(locale)) notFound();

  // Tells next-intl which locale this render is for. Load-bearing: the
  // proxy here is ours and does not set next-intl's own locale header, so
  // without this every request would fall back to the default and `/en` would
  // render German. See ADR 0012.
  setRequestLocale(locale);

  const t = await getTranslations('layout');

  // Set by the proxy, and the same nonce the response policy carries.
  // Next nonces the scripts it emits itself by reading the policy off the
  // request; Emotion's style tags and MUI's colour-scheme script are not Next's
  // and have to be handed the value. See ADR 0011.
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;

  return (
    // InitColorSchemeScript sets data-mui-color-scheme before hydration, which
    // intentionally differs from what the server rendered.
    <html lang={locale} suppressHydrationWarning>
      <body>
        {/* First in the document, so it is the first thing a keyboard user
            reaches. Moving it below anything focusable defeats it. */}
        <a href="#main-content" className="skip-link">
          {t('skipToContent')}
        </a>
        <InitColorSchemeScript attribute="data-mui-color-scheme" defaultMode="dark" nonce={nonce} />
        <NextIntlClientProvider>
          <ThemeRegistry nonce={nonce}>{children}</ThemeRegistry>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default LocaleLayout;
