import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import './globals.css';

import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import type { Viewport } from 'next';
import { headers } from 'next/headers';

import { DEFAULT_LOCALE, isLocale, LOCALE_HEADER } from '@/lib/i18n/locales';
import { NONCE_HEADER } from '@/lib/security/csp';
import { THEME_COLORS } from '@/theme/theme';
import { ThemeRegistry } from '@/theme/ThemeRegistry';

export const viewport: Viewport = {
  themeColor: THEME_COLORS,
  width: 'device-width',
  initialScale: 1,
};

/**
 * The document shell, deliberately above the `[locale]` segment.
 *
 * Everything here has to survive a language change. Next re-renders from the
 * first segment whose value changed, so a shell living under `[locale]` is torn
 * down and rebuilt on every switch, and `AppRouterCacheProvider` goes with it:
 * a second Emotion cache gets built while the first removes its global styles,
 * CssBaseline is left as empty `<style>` tags, and the page loses its
 * background. Keeping the shell up here is what lets the locale link stay a
 * client-side navigation. See ADR 0012.
 *
 * The price is that this layout cannot see the route parameter, and is not
 * re-rendered when only that parameter changes. `lang` therefore comes from the
 * header the proxy sets, which is right for every document the server hands
 * out, and `LocaleLang` in the locale layout keeps it right across a
 * client-side switch.
 */
const RootLayout = async ({ children }: LayoutProps<'/'>) => {
  const requestHeaders = await headers();

  const requested = requestHeaders.get(LOCALE_HEADER);
  const locale = isLocale(requested) ? requested : DEFAULT_LOCALE;

  // Set by the proxy, and the same nonce the response policy carries. Next
  // nonces the scripts it emits itself by reading the policy off the request;
  // Emotion's style tags and MUI's colour-scheme script are not Next's and have
  // to be handed the value. See ADR 0011.
  const nonce = requestHeaders.get(NONCE_HEADER) ?? undefined;

  return (
    // InitColorSchemeScript sets data-mui-color-scheme before hydration, which
    // intentionally differs from what the server rendered.
    <html lang={locale} suppressHydrationWarning>
      <body>
        <InitColorSchemeScript attribute="data-mui-color-scheme" defaultMode="dark" nonce={nonce} />
        <ThemeRegistry nonce={nonce}>{children}</ThemeRegistry>
      </body>
    </html>
  );
};

export default RootLayout;
