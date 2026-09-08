# Working on this repository

Constraints for anyone changing this code, human or agent. It covers what the
code does not already say. Everything that was a decision rather than a detail is
argued in [docs/adr/](docs/adr/); read the relevant one before changing what it
decided, and see [README.md](README.md) for what the app is.

## Ground rules

- **Verify rather than assume.** Measure headers, numbers and browser behaviour
  instead of reasoning about them. Two decisions here exist because a
  measurement contradicted a plausible assumption: a dependency probing for
  `eval` under the CSP (ADR [0011](docs/adr/0011-nonce-based-csp-in-the-proxy.md))
  and two of three browsers refusing to let a test set `Accept-Language`
  (ADR [0012](docs/adr/0012-localised-flow-data-and-a-locale-on-the-wire.md)).
- **A green test is not proof.** Check that the input is actually under the
  test's control. The locale fallback test passed on WebKit for the wrong reason
  until the default locale changed, because WebKit had been appending the
  operating system's locale to every request all along.
- **Comments explain why, never what.** A comment that restates the code should
  be deleted. A non-obvious decision without one is unfinished.
- **No escape hatches.** `any`, `as any`, `@ts-ignore`, `@ts-expect-error` and
  `eslint-disable` do not appear anywhere in `src/` or `e2e/` and should not
  start. Nor do `console.*`, `TODO` or `FIXME`.
- **No em-dashes or en-dashes** in prose, comments or commit messages.

## Conventions the code follows without stating

- JSX components are `const Name = (props) => ...`. Logic, hooks and helpers are
  `function name() {}`.
- `FlowDefinition`, `StepDefinition` and `ValueOptionDefinition` are the authored
  flow, carrying every locale. `Flow`, `Step` and `ValueOption` are resolved to a
  single locale by `localizeFlow` on the server. Keep them apart; that boundary
  is the point of the arrangement.
- Import `z` from `@/lib/schema/zod`, never from `zod` directly. That module
  configures `jitless`, and bypassing it reintroduces a CSP violation. Do not
  call `z.compile()` from it either: that API ignores `jitless` by design, so
  it reintroduces the same violation from a module that looks correct.

## Things that will bite

- **Never widen the Content-Security-Policy.** No `unsafe-inline`, no
  `unsafe-eval`, no `style-src-attr`. If a dependency wants one, switch the
  behaviour off at its source, as `src/lib/schema/zod.ts` does. The e2e suite
  asserts zero policy violations in all three engines, so a shortcut here fails
  loudly.
- **No user-facing string belongs in a component.** UI copy goes in
  `messages/<locale>.json`. Question and option wording goes in
  `src/lib/data/flow.json`, translated for every locale in `LOCALES`, or the app
  fails at import with the path of the text that is missing one.
- **Visual baselines cannot be regenerated on Windows or macOS.** They write
  `-win32`/`-darwin` files CI will never compare against. Use the pinned
  container or the `Visual regression` workflow. Delete the PNGs first:
  `--update-snapshots` silently declines to rewrite a baseline whose difference
  falls under the comparator threshold, so a stale one survives and reports as a
  pass. Every snapshot exists per locale.
- **Coverage floors are not there to be lowered** so a change fits. The domain
  and security modules are held to full statement, line and function cover in
  `vitest.config.mts`.
- **The pnpm version is pinned in three places** and they have to agree:
  `packageManager` in `package.json`, `corepack prepare` in the `Dockerfile`, and
  `installCommand` and `buildCommand` in `vercel.json`. The workflows read the
  first one, so they need no edit. `vercel.json` names it twice because Vercel
  supports pnpm 6 to 10 only: its container pnpm reads `packageManager`, tries to
  switch to 12 and dies with "the installed pnpm wrapper is missing". Both hooks
  have to route around it, and the build one is easy to miss because overriding
  only the install still leaves `pnpm run build` going through the broken engine.
  npx is what makes it work: it installs the per-platform binary pnpm 12 ships as
  an optional dependency, which Vercel's own installer does not. Drop both once
  vercel/vercel#17434 ships, and note that JSON takes no comment, which is why
  this is written here.
- The proxy is `src/proxy.ts`, not `middleware.ts`. Next 16.3 renamed the
  convention and deprecates the old name.
- `next start` warning about `output: standalone` is expected locally. Standalone
  is emitted everywhere except Vercel, and `next.config.ts` says why.

## Tests

- **Query by role.** There are 132 `getByRole` calls against 9 `getByText`, and
  no `data-testid` anywhere. Find a control the way a user would; reach for
  `getByText` only when the text is the thing under test, as in the summary that
  reads the server's own wording back.
- **Assert behaviour, not implementation.** Names say what the app does
  ("keeps downstream answers when the same option is clicked again"), not which
  function ran.
- **Where identity is the point, assert identity.** `expect(again).toBe(completed)`
  in `reducer.test.ts` proves the reducer returned the very same object, so React
  can skip the re-render. `toEqual` would pass while the guarantee was gone.
- **Prove a negative assertion can fail.** `expect(html).not.toMatch(...)` passes
  just as happily when the pattern is wrong as when the condition holds. This bit
  here: a lost `\s` turned the style-attribute check into a regex matching
  nothing, and it reported green for as long as it existed. After writing one,
  break the thing it guards on purpose and watch it fail.
- Tests render in the default locale unless they pass the other one, which is how
  a claim that something is translated gets proved rather than assumed.

## Before opening a PR

```bash
pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm build
pnpm test:e2e
```

CI runs the same, plus a job that builds the container image and posts real
requests at it. Do not skip hooks to get past a failure; the failure is the
point.

## Commits

commitlint enforces the shape on `commit-msg`: a type from the Conventional
Commits enum, lower case, no trailing full stop, header at most 100 characters,
body lines at most 100. It cannot enforce either of the things that actually
matter.

**One logical change per commit.** That is not the same as one file.
`build(deps): move to Node 24, the current LTS line` touches seven, because the
version has to agree across `.nvmrc`, `engines`, both workflows, the Dockerfile
and the README, and a commit that moved only some of them would leave the
repository inconsistent. The test is whether the change can be described without
listing unrelated effects, and whether reverting it would undo exactly one
decision.

**The subject says what the commit is for, not what it edited.** Imperative, and
readable as the completion of "this commit will". From the history:

```
fix(deploy): emit standalone output only where something consumes it
ci(deps): keep Dependabot on the Node line this project targets
refactor: stop exporting what only its own module uses
```

Not `make output conditional on VERCEL`: the diff already says that.

**The body carries the reasoning for anything non-trivial.** In this order,
skipping what does not apply: the problem or the state before it, why this is the
answer, the verification actually performed, and what deliberately did not
change. The verification is the part most worth writing, because it is the part
nobody can reconstruct afterwards:

> Verified both ways: with the variable unset the standalone directory is still
> emitted and the image still builds, with it set the directory is not produced
> at all.

No `--no-verify`, no agent co-author trailers, no backdating, and no rewriting
history that has been pushed.

## When to write an ADR

If a change contradicts the premise of an existing ADR, supersede or amend that
ADR in the same commit rather than letting the code and the record diverge. There
is precedent for both: [0010](docs/adr/0010-fetch-plus-a-local-submission-hook.md)
supersedes half of [0004](docs/adr/0004-tanstack-query-and-msw-over-orval.md), and
[0009](docs/adr/0009-a-stateless-demo-that-really-validates.md) carries a
correction to its own reasoning rather than quietly rewriting it.
