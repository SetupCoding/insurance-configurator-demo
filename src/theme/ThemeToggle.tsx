'use client';

import IconButton from '@mui/material/IconButton';
import { useColorScheme } from '@mui/material/styles';

const iconProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function SunIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

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
  const sx = { position: 'fixed', top: 16, right: 16, zIndex: 'tooltip' } as const;

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
      {isDark ? <SunIcon /> : <MoonIcon />}
    </IconButton>
  );
}
