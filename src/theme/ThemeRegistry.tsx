'use client';

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import type { ReactNode } from 'react';

import { theme } from './theme';

type Props = {
  children: ReactNode;
  /**
   * The request's CSP nonce. Passed into the Emotion cache, which puts it on
   * the `<style>` tags it inserts during SSR and on the client, so the policy
   * can name a nonce for styles instead of allowing all inline ones. See
   * ADR 0011.
   */
  nonce?: string;
};

/**
 * The cache provider is what makes Emotion's style injection work during SSR;
 * without it the first paint arrives unstyled.
 *
 * Deliberately no theme toggle here: it lives in the page header so it scrolls
 * with the rest of the chrome rather than floating over the content.
 */
export const ThemeRegistry = ({ children, nonce }: Props) => {
  return (
    <AppRouterCacheProvider options={{ key: 'mui', nonce }}>
      <ThemeProvider theme={theme} defaultMode="dark">
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
};
