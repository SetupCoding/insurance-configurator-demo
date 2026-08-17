# Contributing

This is primarily a portfolio project, but it's set up like a real one — issues
and PRs are welcome.

## Setup

```bash
pnpm install        # also activates the Husky git hooks
pnpm dev             # http://localhost:3000
```

Requires Node 22 and pnpm 10 (see `.nvmrc` / `packageManager` in `package.json`).

## Scripts

| Script                         | Purpose                                                                   |
| ------------------------------ | ------------------------------------------------------------------------- |
| `pnpm dev`                     | Start the dev server                                                      |
| `pnpm build`                   | Production build                                                          |
| `pnpm start`                   | Run the production build                                                  |
| `pnpm lint` / `lint:fix`       | ESLint                                                                    |
| `pnpm format` / `format:check` | Prettier                                                                  |
| `pnpm typecheck`               | `tsc --noEmit`                                                            |
| `pnpm test` / `test:watch`     | Unit tests (Vitest)                                                       |
| `pnpm test:coverage`           | Unit tests with coverage                                                  |
| `pnpm test:e2e`                | Cross-browser flow + accessibility tests (Playwright), excludes `@visual` |
| `pnpm test:visual`             | Visual regression snapshots                                               |

Before opening a PR, `pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm build`
should all pass — CI runs the same checks plus `test:e2e`.

## Commit convention

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) and
are linted by commitlint via a Husky `commit-msg` hook. Body lines must wrap at
100 characters or fewer.

```
<type>(<scope>): <short summary>

<optional body, wrapped at ≤100 chars per line>
```

Common types used in this repo: `feat`, `fix`, `test`, `docs`, `chore`, `ci`,
`build`. A pre-commit hook runs ESLint and Prettier on staged files.

## Architecture

See the [README](README.md#architecture) for an overview and [docs/adr/](docs/adr/)
for the reasoning behind the key decisions.
