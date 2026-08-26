# Versicherungs-Konfigurator

Answer a short series of questions. The server then checks that your answers
really are a reachable path through its decision tree, and reads the resulting
configuration back to you.

**A technical demo, not an insurance product.** It gives no advice and stores
nothing. Ground-up modern rebuild of a 2022 coding challenge of mine, built as a
portfolio piece.

[![CI](https://github.com/SetupCoding/insurance-configurator-demo/actions/workflows/ci.yml/badge.svg)](https://github.com/SetupCoding/insurance-configurator-demo/actions/workflows/ci.yml)

| Start                                                                                 | Mid-conversation                                                                                      | Result                                                                                    |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| ![Start of the conversation](e2e/visual.spec.ts-snapshots/initial-chromium-linux.png) | ![Partway through the conversation](e2e/visual.spec.ts-snapshots/mid-conversation-chromium-linux.png) | ![The validated configuration](e2e/visual.spec.ts-snapshots/completed-chromium-linux.png) |

<sub>Those are the Chromium visual-regression baselines, referenced where they live rather than copied, so they cannot drift out of date.</sub>

## Run it

Needs Node 24 and pnpm 10 (see `engines`, `.nvmrc` and `packageManager` in
`package.json`).

```bash
pnpm install     # also activates the Husky git hooks
pnpm dev         # http://localhost:3000
```

That single command is the whole app. `pnpm dev` also serves the API route the
final "Absenden" submits to, so there is no separate backend to start.

Or as the production image, a multi-stage build of the Next.js standalone
server:

```bash
docker compose up --build    # http://localhost:3000
```

## What it does

- **It is a decision tree.** Each question narrows things down until the flow
  ends.
- **Nothing submits automatically.** An explicit "Absenden" click sends the
  answers.
- **Earlier answers stay editable** until that click. Changing one drops
  everything after it and replays; re-clicking an answer you already gave
  decides nothing new, so the questions it led to survive.
- **"Neu starten" asks first** (a native `<dialog>`), and aborts an in-flight
  submission rather than letting the response land in a conversation you have
  already restarted.
- **Progress survives a refresh** (`sessionStorage`, expiring after 24 hours)
  but is dropped once a submission is accepted, so a reload starts a fresh
  conversation instead of offering to submit a finished one again.
- **Dark by default**, with a toggle that eases the change rather than swapping
  it abruptly.

### Accessibility

- A skip link jumps keyboard users straight past the header to the conversation.
- Focus moves to the next question's first option as it appears, not to a
  heading, so they land on something actionable.
- Every interactive control gets the same visible focus ring.
- Checked against axe for WCAG 2.0/2.1 A and AA violations in both colour
  schemes, including under Windows forced-colors mode.

## What the server actually checks

`POST /api/conversation` does not just check that the payload is well formed. It
replays the answers through the flow graph, because for any set of choices
exactly one ordered sequence of answers is reachable.

| Rejected                                                                                                                                   | Status |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| Unknown question, repeated answer, wrong order, incomplete path, a value that was never offered, answers appended past the end of the flow | `422`  |
| Body is not JSON                                                                                                                           | `400`  |
| Body larger than 16 KB                                                                                                                     | `413`  |

What comes back is derived from that walk, which is why the result on screen is
the server's wording rather than the client's copy of it.

The flow definition itself is validated the same way, at import time:

- Unique step ids and names
- Option values matching the step's declared `valueType`
- Unique option values and texts within a step
- Every `nextId` resolving to a real step
- Every step reachable from the first
- No cycles

Those last two are the load-bearing pair. Acyclicity plus resolvable references
is what guarantees every conversation terminates: a walk can never revisit a
step, so it must eventually reach an option that ends the flow.

**Nothing is stored.** That makes the operation idempotent, which is why there is
no idempotency key, no request deduplication and no rate limiter here. See
[ADR 0009](docs/adr/0009-a-stateless-demo-that-really-validates.md) for why all
three become mandatory the moment persistence appears.

## Architecture

```
src/
  app/                    App Router pages and API routes (Server Components)
    api/conversation/     POST validates a submitted path and echoes it back
  features/flow/          The conversation state machine (pure reducer),
                          persistence, submission, the client component
  lib/
    schema/               Zod schemas, the single source of truth for types
    domain/               Rules that need the flow, not just a shape
    data/                 The bundled, validated flow fixture
    api/                  Client-side fetch wrapper
    mocks/                MSW handlers, shared by tests
  components/             Presentational UI (question, result, error states)
  theme/                  MUI theme and App Router SSR wiring
```

- `page.tsx` is a Server Component that loads and validates the flow at render
  time, so the first paint already has the opening question.
- Exactly one `'use client'` boundary (`InsuranceChat`) owns everything
  interactive below it.
- The flow is a plain `useReducer` state machine, and ships bundled with the
  app. There is no API call to fetch it.

## Decisions

Each one is a short ADR in [docs/adr/](docs/adr/).

| #                                                                  | Decision                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| [0001](docs/adr/0001-app-router-and-server-component-page.md)      | App Router with a Server Component page                             |
| [0002](docs/adr/0002-flow-as-a-reducer-state-machine.md)           | The conversation as a pure reducer state machine                    |
| [0003](docs/adr/0003-zod-as-single-source-of-truth.md)             | Zod schemas as the single source of truth for domain types          |
| [0004](docs/adr/0004-tanstack-query-and-msw-over-orval.md)         | TanStack Query and MSW over a generated client (superseded by 0010) |
| [0005](docs/adr/0005-self-hosted-fonts.md)                         | Self-hosted fonts, not `next/font/google`                           |
| [0006](docs/adr/0006-hoisted-node-linker-for-standalone-output.md) | `node-linker=hoisted` for Next.js standalone output                 |
| [0007](docs/adr/0007-visual-tests-outside-the-ci-gate.md)          | Visual regression tests outside the CI gate                         |
| [0008](docs/adr/0008-manual-colour-scheme-over-media-query.md)     | Manual colour scheme switching, not just `prefers-color-scheme`     |
| [0009](docs/adr/0009-a-stateless-demo-that-really-validates.md)    | A stateless demo whose server does real work                        |
| [0010](docs/adr/0010-fetch-plus-a-local-submission-hook.md)        | Fetch plus a local submission hook, not a mutation library          |

There is deliberately no Content-Security-Policy yet. `next.config.ts` says why.

## Scripts

| Script                              | Purpose                                                        |
| ----------------------------------- | -------------------------------------------------------------- |
| `pnpm dev`                          | Start the dev server                                           |
| `pnpm build`                        | Production build                                               |
| `pnpm start`                        | Run the production build                                       |
| `pnpm lint` / `pnpm lint:fix`       | ESLint                                                         |
| `pnpm format` / `pnpm format:check` | Prettier                                                       |
| `pnpm typecheck`                    | Next route types, then `tsc --noEmit`                          |
| `pnpm test` / `pnpm test:watch`     | Unit tests (Vitest and Testing Library)                        |
| `pnpm test:coverage`                | Unit tests with coverage, and the coverage gates               |
| `pnpm test:e2e`                     | Cross-browser flow and accessibility tests, excludes `@visual` |
| `pnpm test:visual`                  | Visual regression snapshots                                    |

Before opening a PR, `pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm build`
should pass. CI runs the same plus `test:e2e`. Commits follow
[Conventional Commits](https://www.conventionalcommits.org/) and are checked by
commitlint; a pre-commit hook runs ESLint and Prettier on staged files.

## Testing

```bash
pnpm test:coverage                     # unit tests, gated
pnpm exec playwright install           # once, to fetch browser binaries
pnpm test:e2e                          # flow, security headers, a11y, 3 browsers
```

Coverage has a floor rather than just a number. The flow validator, the
submission validator and the reducer are held to full statement, line and
function cover, because a silent regression there is the one that would matter.

Visual snapshots are not part of the gate, and cannot be regenerated on Windows
or macOS. Run the `Visual regression` workflow with `update_snapshots` and commit
the `visual-baselines` artifact. See
[ADR 0007](docs/adr/0007-visual-tests-outside-the-ci-gate.md).

## CI/CD

| Job                       | What it does                                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Lint, types, unit & build | Production dependency audit, Prettier, ESLint, typecheck, unit tests with coverage gates, production build |
| End-to-end                | Flow, security header and accessibility tests across Chromium, Firefox and WebKit                          |
| Container image           | Builds the image, waits for its own healthcheck, then posts a valid and a tampered path at it              |
| Visual regression         | On demand only, in a digest-pinned Playwright container                                                    |

The container job exists because the other jobs run against a dev server and
never touch the standalone bundle the image ships. Every action is pinned to a
commit SHA and both container images to a digest, so a moved tag cannot change
what runs. Dependabot keeps npm, Actions and Docker dependencies current.

## Deploy

Configured for [Vercel](https://vercel.com). `vercel.json` declares the
framework, so importing the repository needs no build configuration and no
environment variables. Every push to `main` deploys to production, and every
pull request gets a preview URL.

Security headers come from `next.config.ts` rather than platform configuration,
so they apply to the Docker image too. Standalone output is switched off on
Vercel, which builds its own output and fails while packaging that one;
`next.config.ts` explains it.

## Provenance

This repository modernises a coding challenge I wrote in 2022. Claude Code was
used for the modernisation in a compound-engineering workflow, and Codex agents
were used afterwards for an adversarial review of the result. The agents
contributed analysis, implementation drafts, tests and documentation review.
Product decisions, reading the diffs, judging the test output and final
acceptance are mine.

The early commit sequence was tidied up after the fact for presentation, so it
does not reflect the organic order the work happened in. Nothing is backdated,
and from this commit on the history is left alone: no amend, no squash, no
force-push.

## License

[MIT](LICENSE) © Anton "Setup" Schmidt
