# 6. `node-linker=hoisted` for Next.js standalone output

## Status

Accepted

## Context

pnpm's default linker uses a strict, symlinked `node_modules` structure.
Next.js's standalone output (`output: 'standalone'`, used by the production
Docker image) traces runtime dependencies by walking `node_modules` on disk;
with pnpm's default linker this trace missed transitive deps that are only
ever required at runtime rather than imported directly, notably
`@swc/helpers`, producing a build that fails at container start with
`Cannot find module '@swc/helpers/...'`.

## Decision

Set `node-linker=hoisted` in `.npmrc`, which gives pnpm a flat `node_modules`
layout closer to npm/Yarn classic. Next's file tracing resolves correctly
against that layout.

## Consequences

- The Docker image (see [Dockerfile](../../Dockerfile)) builds and runs
  correctly with the standalone server.
- `.npmrc` has to be copied into the dependency stage explicitly. Omitting it
  is silent: the install falls back to the symlinked layout, every other gate
  still passes, and the container dies at start on `@swc/helpers`. CI now builds
  the image and waits for its healthcheck so this cannot pass unnoticed again.
- Loses some of pnpm's strict dependency isolation (a package can technically
  `require` something it didn't declare). Acceptable trade-off for an app of
  this size; revisit if that isolation becomes valuable enough to instead fix
  via explicit `outputFileTracingIncludes`.

## Update, September 2026

pnpm 11 stopped reading anything but auth and registry settings from `.npmrc`,
so moving this project to pnpm 12 moved the setting into
[pnpm-workspace.yaml](../../pnpm-workspace.yaml) as `nodeLinker: hoisted`, and
`.npmrc` is gone. The decision is unchanged; only the file holding it is, which
also retires the consequence above about copying `.npmrc` into the dependency
stage.

What did change is the gate. Building the image with the setting removed was
measured rather than assumed during that move, and it still produces the broken
bundle this ADR describes: `@swc/helpers` is absent from the standalone output
and `require.resolve` for it throws inside the container. But on Next 16.3.3 the
container no longer dies for it. It starts, reports healthy, serves both locales,
answers every API assertion in the container job and logs nothing at all.

So the failure has gone from loud to latent, and the container job is no longer
proof that this setting is present. Anything that reintroduces the symlinked
layout now passes CI and ships a bundle missing a transitive dependency.
Restoring a real gate, or removing the need for one with the explicit
`outputFileTracingIncludes` the consequences above already float, is worth its
own change rather than a footnote to this one.
