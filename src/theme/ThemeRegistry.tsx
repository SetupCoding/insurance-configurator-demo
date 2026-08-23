'use client';

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import type { ReactNode } from 'react';

import { theme } from './theme';

/**
 * The cache provider is what makes Emotion's style injection work during SSR;
 * without it the first paint arrives unstyled.
 *
 * Deliberately no theme toggle here: it lives in the page header so it scrolls
 * with the rest of the chrome rather than floating over the content.
 */
export const ThemeRegistry = ({ children }: { children: ReactNode }) => {
  return (
    <AppRouterCacheProvider options={{ key: 'mui' }}>
      <ThemeProvider theme={theme} defaultMode="dark">
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
};
