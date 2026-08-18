'use client';

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import type { ReactNode } from 'react';

import { theme } from './theme';
import { ThemeToggle } from './ThemeToggle';

/**
 * Wires MUI into the App Router: the cache provider handles Emotion style
 * injection during SSR, and the theme provider exposes the design tokens.
 */
export const ThemeRegistry = ({ children }: { children: ReactNode }) => {
  return (
    <AppRouterCacheProvider options={{ key: 'mui' }}>
      <ThemeProvider theme={theme} defaultMode="dark">
        <CssBaseline />
        <ThemeToggle />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
};
