import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import './globals.css';

import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import type { Metadata, Viewport } from 'next';

import { THEME_COLORS } from '@/theme/theme';
import { ThemeRegistry } from '@/theme/ThemeRegistry';

export const metadata: Metadata = {
  title: 'Versicherungs-Konfigurator',
  description:
    'Technische Demo eines Versicherungs-Konfigurators. Keine Beratung, keine Speicherung.',
};

export const viewport: Viewport = {
  themeColor: THEME_COLORS,
  width: 'device-width',
  initialScale: 1,
};

const RootLayout = ({ children }: LayoutProps<'/'>) => {
  return (
    // InitColorSchemeScript sets data-mui-color-scheme before hydration, which
    // intentionally differs from what the server rendered.
    <html lang="de" suppressHydrationWarning>
      <body>
        <a href="#main-content" className="skip-link">
          Zum Inhalt springen
        </a>
        <InitColorSchemeScript attribute="data-mui-color-scheme" defaultMode="dark" />
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
};

export default RootLayout;
