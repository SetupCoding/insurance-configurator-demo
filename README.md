# Versicherungs-Konfigurator

A technical demo, not an insurance product: answer a short series of questions
and the server checks that your answers really are a reachable path through its
decision tree, then reads the configuration back to you. It gives no advice and
stores nothing. Ground-up modern rebuild of a 2022 coding challenge of mine,
built as a portfolio piece.

[![CI](https://github.com/SetupCoding/insurance-configurator-demo/actions/workflows/ci.yml/badge.svg)](https://github.com/SetupCoding/insurance-configurator-demo/actions/workflows/ci.yml)

## Screenshots

| Start                                                                                 | Mid-conversation                                                                                      | Result                                                                                    |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| ![Start of the conversation](e2e/visual.spec.ts-snapshots/initial-chromium-linux.png) | ![Partway through the conversation](e2e/visual.spec.ts-snapshots/mid-conversation-chromium-linux.png) | ![The validated configuration](e2e/visual.spec.ts-snapshots/completed-chromium-linux.png) |

Those three images are the Chromium visual-regression baselines, referenced
where they live rather than copied into the README, so they cannot quietly
drift out of date.

## What it does

The conversation is a decision tree: each question narrows things down until you
reach the end, then an explicit "Absenden" button sends the answers. Nothing
submits automatically, and earlier answers stay editable right up until it is
clicked. You can go back and change an earlier answer, and everything after that
point is dropped and replayed; clicking an answer you already gave changes
nothing, so the questions it led to survive. "Neu starten" asks for confirmation
(a native `<dialog>`) before discarding anything, and if a submission is in
flight it aborts the request rather than leaving it to land in a conversation you
have already restarted.

The reset button lives in a small header that scrolls with the page rather than
floating fixed in a corner, so it can never overlap the conversation on narrow
viewports; once you have submitted, it moves to sit below the result. Progress
survives a page refresh (`sessionStorage`, expiring after 24 hours) but is
dropped once a submission is accepted, so a reload starts a fresh conversation
instead of offering to submit a finished one again. The theme toggle in that same
header switches between a dark theme (the default) and a light one, eased rather
than swapped abruptly.

A skip link lets keyboard users jump straight past the header to the
conversation, focus moves to the next question's first option as it appears (not
a heading, so keyboard users land on something actionable), and every interactive
control gets the same visible focus ring. The whole thing is checked against axe
for WCAG 2.0/2.1 A/AA violations in both colour schemes, including under Windows
forced-colors (high-contrast) mode.

### What the server actually checks

`POST /api/conversation` does not just check that the payload is well formed. It
replays the answers through the flow graph, because for any set of choices
exactly one ordered sequence of answers is reachable. Unknown questions,
repeated answers, a wrong order, an incomplete path, a value that was never
offered, and answers appended past the end of the flow are all rejected with
`422`. What comes back is derived from that walk, which is why the result on
screen is the server's wording rather than the client's copy of it.

The flow definition itself is validated the same way, at import time: unique step
ids and names, option values matching the step's declared type, unique option
values and texts, every `nextId` resolving to a real step, every step reachable
from the first, and no cycles. Acyclicity plus resolvable references is what
guarantees every conversation terminates.

Nothing is stored. That makes the operation idempotent, which is why there is no
idempotency key, no request deduplication and no rate limiter here; see
[ADR 0009](docs/adr/0009-a-stateless-demo-that-really-validates.md) for why
those become mandatory the moment persistence appears.

## Architecture

```
src/
  app/                    App Router pages and API routes (Server Components)
    api/conversation/     POST validates a submitted path and echoes it back
  features/flow/          The conversation state machine (pure reducer),
                          persistence, submission, and the client component
  lib/
    schema/               Zod schemas, the single source of truth for types
    domain/               Rules that need the flow, not just a shape
    data/                 The bundled, validated flow fixture
    api/                  Client-side fetch wrapper
    mocks/                MSW handlers, shared by tests
  components/             Presentational UI (question, result, error states)
  theme/                  MUI theme and App Router SSR wiring
```

`page.tsx` is a Server Component that loads and validates the flow at render
time; a single `'use client'` component (`InsuranceChat`) owns everything
interactive below it. The flow is a plain `useReducer` state machine: selecting
an option advances it, a terminal option completes it, and revising an earlier
answer truncates the steps after it. There is no external API call for the flow
definition; it ships bundled with the app.

The reasoning behind these choices, and a few others, is written up in
[docs/adr/](docs/adr/) — including why the submission is a local hook over
`fetch` rather than a mutation library, why the submit button is `aria-disabled`
instead of natively disabled, why fonts are self-hosted, why visual tests run
outside the CI gate, and why there is no Content-Security-Policy yet.

## Provenance

This repository modernises a coding challenge I wrote in 2022. Claude Code was
used for the modernisation in a compound-engineering workflow, and Codex agents
were used afterwards for an adversarial review of the result. The agents
contributed analysis, implementation drafts, tests and documentation review.
Product decisions, reading the diffs, judging the test output and final
acceptance are mine.

The early commit sequence was tidied up after the fact for presentation, so it
does not reflect the organic order the work happened in. From the commit that
added this section onwards, the history is left alone: no backdating, no amend,
no squash, no force-push.

## Getting started

Requires Node 22 and pnpm 10 (see `.nvmrc` and `packageManager` in
`package.json`).

```bash
pnpm install     # also activates the Husky git hooks
pnpm dev         # http://localhost:3000
```

That single command is the whole app: answering questions runs entirely in the
browser, and `pnpm dev` also serves the API route the final "Absenden" submits
to, so there is no separate backend to start.

## Scripts

| Script                              | Purpose                                                                     |
| ----------------------------------- | --------------------------------------------------------------------------- |
| `pnpm dev`                          | Start the dev server                                                        |
| `pnpm build`                        | Production build                                                            |
| `pnpm start`                        | Run the production build                                                    |
| `pnpm lint` / `pnpm lint:fix`       | ESLint                                                                      |
| `pnpm format` / `pnpm format:check` | Prettier                                                                    |
| `pnpm typecheck`                    | `tsc --noEmit`                                                              |
| `pnpm test` / `pnpm test:watch`     | Unit tests (Vitest + Testing Library)                                       |
| `pnpm test:coverage`                | Unit tests with coverage, and the coverage gates                            |
| `pnpm test:e2e`                     | Cross-browser flow and accessibility tests (Playwright), excludes `@visual` |
| `pnpm test:visual`                  | Visual regression snapshots                                                 |

Before opening a PR, `pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm build`
should all pass; CI runs the same checks plus `test:e2e`. Commits follow
[Conventional Commits](https://www.conventionalcommits.org/) and are checked by
commitlint on commit; a pre-commit hook runs ESLint and Prettier on staged files.

## Testing

```bash
pnpm test:coverage                     # unit tests, gated (see vitest.config.mts)
pnpm exec playwright install           # once, to fetch browser binaries
pnpm test:e2e                          # flow, security headers and a11y, 3 browsers
```

Coverage has a floor rather than just a number: the suite must stay above the
global thresholds, and the flow validator, the submission validator and the
reducer are held to full statement, line and function cover, because a silent
regression there is the one that would matter.

Visual snapshots are not part of the gate and cannot be regenerated locally on
Windows or macOS; run the `Visual regression` workflow with `update_snapshots`
and commit the `visual-baselines` artifact. See
[ADR 0007](docs/adr/0007-visual-tests-outside-the-ci-gate.md).

## Docker

```bash
docker compose up --build              # http://localhost:3000
```

The image is a multi-stage build producing a Next.js standalone server, see
[Dockerfile](Dockerfile) and [ADR 0006](docs/adr/0006-hoisted-node-linker-for-standalone-output.md)
for why `.npmrc` pins `node-linker=hoisted`.

## CI/CD

GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs a
production dependency audit, Prettier, ESLint, typecheck, unit tests with
coverage gates, the production build, and cross-browser e2e, security-header and
accessibility tests on every push and PR to `main`. A separate job builds the
Docker image, waits for its own healthcheck and posts both a valid and a
tampered path at it, because the other jobs run against a dev server and never
touch the standalone bundle the image ships. Visual regression runs separately,
on demand, in a digest-pinned Playwright container. Every action is pinned to a
commit SHA and both container images to a digest, so a moved tag cannot change
what runs; Dependabot keeps npm, Actions and Docker dependencies current.

## Deploy

Configured for [Vercel](https://vercel.com): `vercel.json` declares the
framework, so importing the repository needs no further build configuration.
Once the project is connected, every push to `main` deploys to production and
every pull request gets a preview URL. Security headers come from
`next.config.ts` rather than platform configuration, so they apply to the Docker
image too.

## License

[MIT](LICENSE) © Anton "Setup" Schmidt
