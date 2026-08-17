# 7. Keep visual regression tests out of the CI gate

## Status

Accepted

## Context

Playwright's pixel snapshots are sensitive to the exact rendering environment
(OS font rendering, GPU/software compositing, browser build). Baselines
generated on one machine reliably diff against a different one even with no
real UI change, which turns a flaky rendering difference into a blocked PR.

## Decision

Tag visual specs `@visual` (`e2e/visual.spec.ts`) and exclude them from the
main e2e run: `test:e2e` runs `playwright test --grep-invert @visual`, so the
required CI job (`ci.yml`) never runs them. They run instead via
`pnpm test:visual`, and in CI only on demand through a separate
`visual.yml` workflow pinned to the `mcr.microsoft.com/playwright` container
image that matches the Playwright version in `package.json` — the same
environment the baselines should be regenerated from.

## Consequences

- The required CI gate can't be blocked by environment-dependent pixel noise.
- Regenerating baselines is a deliberate, on-demand action
  (`pnpm test:visual -- --update-snapshots`, ideally inside the pinned
  container) rather than something that happens implicitly on every push.
- A real visual regression only surfaces when someone runs the visual suite —
  it is not caught automatically on every PR.
