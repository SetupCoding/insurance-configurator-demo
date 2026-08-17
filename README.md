# Versicherungs-Helfer

A small, well-tested insurance-advisor chatbot: answer a short series of
questions and it narrows down which type of insurance fits your situation.
Ground-up modern rebuild of a 2022 project of the same name, built as a
portfolio piece with a clean, atomic, Conventional-Commits history.

[![CI](https://github.com/SetupCoding/chat-bot-anton-schmidt/actions/workflows/ci.yml/badge.svg)](https://github.com/SetupCoding/chat-bot-anton-schmidt/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-vercel-black)](https://chat-bot-anton-schmidt.vercel.app)

## Screenshots

| Start                                                               | Mid-conversation                                                                    | Completed                                                          |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| ![Start of the conversation](docs/media/initial-chromium-linux.png) | ![Partway through the conversation](docs/media/mid-conversation-chromium-linux.png) | ![Completed conversation](docs/media/completed-chromium-linux.png) |

## Features

- **Guided conversation** — a decision-tree flow of questions, one at a time,
  with the full history of previous answers visible above the current one.
- **Revise an earlier answer** — changing an earlier selection truncates and
  replays the conversation from that point, no full restart needed.
- **Survives a refresh** — progress is persisted to `sessionStorage` and
  restored on load.
- **Accessible by default** — focus moves to each new question as it appears,
  reduced-motion is honored, and the app passes automated axe (WCAG 2.0/2.1
  A/AA) checks.
- **Validated data everywhere** — the flow fixture and every API payload are
  parsed through the same [Zod](https://zod.dev/) schemas that produce the
  TypeScript types, so the two can't drift apart.

## Architecture

```
src/
  app/                    App Router pages & API routes (Server Components)
    api/flow/              GET  — serves the validated flow
    api/conversation/       POST — validates and accepts a submission
  features/flow/          The conversation state machine (pure reducer),
                           persistence, and the client component that owns it
  lib/
    schema/                Zod schemas — single source of truth for types
    data/                  The bundled, validated flow fixture
    api/                    Client-side fetch wrapper
    mocks/                 MSW handlers, shared by tests
  components/             Presentational UI (question, loading, error states)
  theme/                  MUI theme + App Router SSR wiring
```

- **App Router + Server Component page**: `page.tsx` loads and validates the
  flow at render time; a single `'use client'` component
  (`InsuranceChat`) owns all interactive state.
- **Flow as a pure reducer state machine**: select → advance; a terminal
  option completes the flow; changing an earlier answer truncates everything
  after it. See [ADR 2](docs/adr/0002-flow-as-a-reducer-state-machine.md).
- **Zod as the single source of truth** for every domain shape — TypeScript
  types are inferred, never hand-written. See [ADR 3](docs/adr/0003-zod-as-single-source-of-truth.md).
- **Self-contained data**: the flow ships bundled in the repo instead of being
  fetched from an external spec at request time.
- **Submission** goes through a TanStack Query mutation (loading/error/retry),
  mocked with MSW in tests. See [ADR 4](docs/adr/0004-tanstack-query-and-msw-over-orval.md).

The full set of decisions, with context and trade-offs, is in
[docs/adr/](docs/adr/).

## Getting started

Requires Node 22 and pnpm 10 (see `.nvmrc` / `packageManager`).

```bash
pnpm install     # also activates the Husky git hooks
pnpm dev         # http://localhost:3000
```

## Scripts

| Script                              | Purpose                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `pnpm dev`                          | Start the dev server                                                      |
| `pnpm build`                        | Production build                                                          |
| `pnpm start`                        | Run the production build                                                  |
| `pnpm lint` / `pnpm lint:fix`       | ESLint                                                                    |
| `pnpm format` / `pnpm format:check` | Prettier                                                                  |
| `pnpm typecheck`                    | `tsc --noEmit`                                                            |
| `pnpm test` / `pnpm test:watch`     | Unit tests (Vitest + Testing Library)                                     |
| `pnpm test:coverage`                | Unit tests with coverage                                                  |
| `pnpm test:e2e`                     | Cross-browser flow + accessibility tests (Playwright), excludes `@visual` |
| `pnpm test:visual`                  | Visual regression snapshots                                               |

## Testing

```bash
pnpm test:coverage                     # unit tests, ~91% line coverage
pnpm exec playwright install           # once, to fetch browser binaries
pnpm test:e2e                          # flow + accessibility, 3 browsers
pnpm test:visual                       # pixel snapshots (see ADR 7)
```

## Docker

```bash
docker compose up --build              # http://localhost:3000
```

The image is a multi-stage build producing a Next.js standalone server — see
[Dockerfile](Dockerfile) and [ADR 6](docs/adr/0006-hoisted-node-linker-for-standalone-output.md)
for why `.npmrc` pins `node-linker=hoisted`.

## CI/CD

GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs
Prettier, ESLint, typecheck, unit tests with coverage, the production build,
and cross-browser e2e/accessibility tests on every push and PR to `main`.
Visual regression runs separately, on demand, in a pinned Playwright
container (see [ADR 7](docs/adr/0007-visual-tests-outside-the-ci-gate.md)).
Dependabot keeps npm and Actions dependencies current.

## Deploy

Deployed on [Vercel](https://vercel.com) — the framework is auto-detected via
`vercel.json`. Every push to `main` deploys to production; every PR gets a
preview URL.

## License

[MIT](LICENSE) © Anton Schmidt
