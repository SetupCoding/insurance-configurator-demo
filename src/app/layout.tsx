import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import './globals.css';

import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import type { Metadata, Viewport } from 'next';

import { THEME_COLORS } from '@/theme/theme';
import { ThemeRegistry } from '@/theme/ThemeRegistry';

import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Versicherungs-Helfer',
  description: 'Ein Chatbot, der Ihnen hilft, die passende Versicherung zu wählen.',
};

export const viewport: Viewport = {
  themeColor: THEME_COLORS,
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // InitColorSchemeScript sets data-mui-color-scheme before hydration, which
    // intentionally differs from what the server rendered.
    <html lang="de" suppressHydrationWarning>
      <body>
        <InitColorSchemeScript attribute="data-mui-color-scheme" defaultMode="dark" />
        <ThemeRegistry>
          <Providers>{children}</Providers>
        </ThemeRegistry>
      </body>
    </html>
  );
}
