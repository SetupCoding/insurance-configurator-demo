import { createTheme, responsiveFontSizes } from '@mui/material/styles';

/**
 * Brand colour, exported so it can also drive the document `theme-color`
 * meta tag in the root layout without reaching into the theme object.
 */
export const THEME_COLOR = '#1f6feb';

const baseTheme = createTheme({
  // CSS theme variables render the palette as CSS custom properties, which
  // avoids a colour flash on first paint during server-side rendering.
  cssVariables: true,
  palette: {
    primary: { main: THEME_COLOR },
    background: { default: '#f6f8fb' },
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
  },
});

export const theme = responsiveFontSizes(baseTheme);
