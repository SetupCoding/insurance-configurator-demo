'use client';

import { Box } from '@mui/material';
import type { ReactNode } from 'react';

import { ThemeToggle } from '@/theme/ThemeToggle';

type Props = {
  start?: ReactNode;
};

/**
 * Scrolls with the page rather than staying pinned to the viewport, so it can
 * never overlap the title or the conversation on a narrow viewport the way
 * fixed corner buttons did.
 *
 * The fixed min-height holds even when the start slot is empty, so a reset
 * button appearing or disappearing does not shift the content below it.
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
