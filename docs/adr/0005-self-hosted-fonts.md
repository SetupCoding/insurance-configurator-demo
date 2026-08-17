# 5. Self-hosted fonts via @fontsource, not next/font/google

## Status

Accepted

## Context

`next/font/google` fetches font files from Google Fonts at build time. The
sandbox this project was originally built in couldn't reach Google Fonts,
which would have made the build non-reproducible in restricted network
environments (CI runners with tight egress rules, offline dev, some Docker
build contexts).

## Decision

Depend on `@fontsource/roboto` and import the weight-specific CSS files
directly in `src/app/layout.tsx`. The font files ship as regular npm package
assets and are bundled like any other static asset.

## Consequences

- Build and Docker image builds have no network dependency on Google Fonts.
- Adding a new weight/style means adding an import line, not a config change.
- Slightly larger `node_modules` (the font files live in the package) in
  exchange for build reproducibility.
