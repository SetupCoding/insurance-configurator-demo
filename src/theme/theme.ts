import { createTheme, responsiveFontSizes } from '@mui/material/styles';

const LIGHT_THEME_COLOR = '#1f6feb';
const DARK_THEME_COLOR = '#58a6ff';

/**
 * Drives the document `theme-color` meta tag in the root layout, one entry
 * per colour scheme, so the browser UI matches whichever scheme is active.
 */
export const THEME_COLORS = [
  { media: '(prefers-color-scheme: dark)', color: DARK_THEME_COLOR },
  { media: '(prefers-color-scheme: light)', color: LIGHT_THEME_COLOR },
];

const baseTheme = createTheme({
  // CSS theme variables render the palette as CSS custom properties, which
  // avoids a colour flash on first paint during server-side rendering and
  // lets the colour scheme switch at runtime without re-rendering React.
  // Scheme switching is driven by a data attribute (set by InitColorSchemeScript
  // and the toggle), not the OS `prefers-color-scheme` media query, so a manual
  // choice sticks regardless of the system setting.
  cssVariables: {
    colorSchemeSelector: 'data-mui-color-scheme',
  },
  defaultColorScheme: 'dark',
  colorSchemes: {
    light: {
      palette: {
        primary: { main: LIGHT_THEME_COLOR },
        background: { default: '#f6f8fb' },
      },
    },
    dark: {
      palette: {
        primary: { main: DARK_THEME_COLOR },
        background: { default: '#0d1117', paper: '#161b22' },
      },
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
  },
  components: {
    // Preserve a single visual scale while keeping the heading levels
    // semantically correct (one <h1> per page, then <h2>, ...).
    MuiTypography: {
      defaultProps: {
        variantMapping: { h2: 'h1', h3: 'h2' },
      },
    },
    // MuiButtonBase removes the native focus outline unconditionally, and
    // leaves it up to each component to supply one. Setting it once here
    // gives every button, toggle and icon button the same focus ring instead
    // of each needing its own.
    MuiButtonBase: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&.Mui-focusVisible': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
          },
        }),
      },
    },
  },
});

export const theme = responsiveFontSizes(baseTheme);
