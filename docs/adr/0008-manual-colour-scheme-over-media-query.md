# 8. Manual colour scheme switching, not just prefers-color-scheme

## Status

Accepted

## Context

MUI's CSS-variable theming can switch between colour schemes purely off the
`prefers-color-scheme` media query, with no extra wiring. That's enough if
the app should always just follow the OS setting. Here we also want dark to
be the default regardless of the visitor's system preference, and a toggle
the user can override it with, which a media-query-only setup can't do since
there is no state to flip.

## Decision

Set `colorSchemeSelector: 'data-mui-color-scheme'` on the theme so scheme
rules key off a `data-mui-color-scheme` attribute on `<html>` instead of the
media query. `InitColorSchemeScript` writes that attribute before hydration
(with `defaultMode="dark"` for a first-time visitor), and `ThemeProvider`
gets the same `defaultMode="dark"` so its own post-mount sync agrees with
what the script already set instead of resetting it back to the system
preference. `ThemeToggle` then flips it at runtime via `useColorScheme`,
persisted to `localStorage` by MUI.

## Consequences

- The scheme is dark by default, then whatever the visitor last chose,
  independent of their OS setting.
- Two things (the inline script and the provider) need to agree on the
  default; whichever build changes one of them has to keep the other in sync.
- If a plain "always follow the OS" toggle is ever wanted instead, dropping
  `colorSchemeSelector` back to the (default) `'media'` and removing the
  toggle is a small, local change.
