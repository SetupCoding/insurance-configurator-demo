import { ThemeProvider } from '@mui/material/styles';
import { render, type RenderOptions } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { FunctionComponent, ReactElement, ReactNode } from 'react';

import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/locales';
import { theme } from '@/theme/theme';

import de from '../../messages/de.json';
import en from '../../messages/en.json';

const Themed = ({ children }: { children: ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

// The real catalogues rather than a fixture, so a component asking for a key
// that does not exist fails the test the same way it would fail in the app.
const GermanProviders = ({ children }: { children: ReactNode }) => (
  <NextIntlClientProvider locale="de" messages={de}>
    <Themed>{children}</Themed>
  </NextIntlClientProvider>
);

const EnglishProviders = ({ children }: { children: ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={en}>
    <Themed>{children}</Themed>
  </NextIntlClientProvider>
);

/**
 * One wrapper per locale, declared rather than generated, so each keeps a
 * stable identity across renders (a fresh component type would remount the
 * tree on `rerender`) and shows up named in the React tree.
 */
const PROVIDERS: Record<Locale, FunctionComponent<{ children: ReactNode }>> = {
  de: GermanProviders,
  en: EnglishProviders,
};

type Options = Omit<RenderOptions, 'wrapper'> & {
  /** Defaults to the app's own default; pass the other to prove a string is translated. */
  locale?: Locale;
};

export function renderWithTheme(ui: ReactElement, options?: Options) {
  const { locale = DEFAULT_LOCALE, ...renderOptions } = options ?? {};
  return render(ui, { wrapper: PROVIDERS[locale], ...renderOptions });
}

// Re-exported so a test gets `screen`, `waitFor` and the themed render from one
// import, and cannot reach for the unthemed `render` by accident.
export * from '@testing-library/react';
