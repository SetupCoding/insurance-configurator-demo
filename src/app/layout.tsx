import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import './globals.css';

import type { Metadata, Viewport } from 'next';

import { THEME_COLOR } from '@/theme/theme';
import { ThemeRegistry } from '@/theme/ThemeRegistry';

export const metadata: Metadata = {
  title: 'Versicherungs-Helfer',
  description: 'Ein Chatbot, der Ihnen hilft, die passende Versicherung zu wählen.',
};

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="de">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
