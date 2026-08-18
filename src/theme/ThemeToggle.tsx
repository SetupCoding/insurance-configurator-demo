'use client';

import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import IconButton from '@mui/material/IconButton';
import { useColorScheme } from '@mui/material/styles';

const sx = {
  position: 'fixed',
  top: 16,
  right: 16,
  zIndex: 'tooltip',
  // The default icon-button colour is a low-contrast "action" tone; this
  // needs to read clearly against the page background in both schemes.
  color: 'text.primary',
} as const;

/**
 * Toggles between the light and dark colour schemes. Rendered once, fixed to
 * the top-right corner. `mode` is `undefined` during SSR and on the client's
 * first render (the actual preference lives in localStorage, which isn't
 * available server-side), settling to the real value once MUI reads it after
 * mount, so a disabled placeholder is shown until then to avoid a hydration
 * mismatch.
 */
export function ThemeToggle() {
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
}
