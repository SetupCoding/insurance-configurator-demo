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
