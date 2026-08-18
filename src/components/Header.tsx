'use client';

import { Box } from '@mui/material';
import type { ReactNode } from 'react';

import { ThemeToggle } from '@/theme/ThemeToggle';

type Props = {
  /** Rendered in the header's left slot; omit to leave it empty. */
  start?: ReactNode;
};

/**
 * Minimal header that scrolls with the page rather than staying pinned to
 * the viewport, so it can never overlap the title or main content on narrow
 * viewports the way fixed corner buttons could. Always rendered at a fixed
 * height so the (optional) start slot appearing or disappearing never shifts
 * the content below it.
 */
export const Header = ({ start }: Props) => {
  return (
    <Box
      component="header"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 48,
        px: { xs: 1, sm: 2 },
      }}
    >
      <Box>{start}</Box>
      <ThemeToggle />
    </Box>
  );
};
