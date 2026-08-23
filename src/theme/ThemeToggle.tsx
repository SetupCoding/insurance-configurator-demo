'use client';

import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import IconButton from '@mui/material/IconButton';
import { useColorScheme } from '@mui/material/styles';

const sx = {
  // The default icon-button colour is a low-contrast "action" tone; this
  // needs to read clearly against the page background in both schemes.
  color: 'text.primary',
} as const;

/**
 * `mode` is `undefined` during SSR and on the client's first render, because
 * the stored preference lives in localStorage and the server cannot read it. It
 * settles once MUI reads it after mount, so a placeholder holds the space until
 * then rather than rendering an icon the first paint would have to correct.
 */
export const ThemeToggle = () => {
  const { mode, setMode } = useColorScheme();

  if (!mode) {
    return <IconButton disabled aria-hidden="true" sx={sx} />;
  }

  const isDark = mode === 'dark';

  return (
    <IconButton
      onClick={() => setMode(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Zum hellen Design wechseln' : 'Zum dunklen Design wechseln'}
      sx={sx}
    >
      {isDark ? <LightModeIcon /> : <DarkModeIcon />}
    </IconButton>
  );
};
