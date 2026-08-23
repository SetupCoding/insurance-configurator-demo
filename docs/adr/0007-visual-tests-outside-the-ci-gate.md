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
image that matches the Playwright version in `package.json`, the same
environment the baselines should be regenerated from.

## Consequences

- The required CI gate can't be blocked by environment-dependent pixel noise.
- Regenerating baselines is a deliberate, on-demand action: run `visual.yml`
  with `update_snapshots` and commit the `visual-baselines` artifact. The
  container is not optional, since a local run on Windows or macOS writes
  `-win32`/`-darwin` files that CI will never compare against.
- Snapshots are held to the global 2% pixel tolerance. They previously allowed
  5% each, which is enough slack for a whole control to change unnoticed.
- A pixel-ratio limit only catches what the per-pixel comparator considers
  different at all, and that comparator is amplitude-based. A background
  gradient displaced by the scroll offset measured 31/255 across a third of the
  image and passed at every threshold that does not also flag antialiasing
  noise. So this suite guards against changes in shape and position, not
  against faint large-area ones; those have to be prevented at capture time.
  The capture is normalised for exactly that reason: every snapshot scrolls the
  page to the top first, because a `fullPage` capture leaves a background with
  `attachment: fixed` anchored at the current scroll offset, which renders a
  seam the browser itself never paints.
- A real visual regression only surfaces when someone runs the visual suite;
  it is not caught automatically on every PR.
