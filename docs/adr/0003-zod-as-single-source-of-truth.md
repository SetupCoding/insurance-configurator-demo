# 3. Zod schemas as the single source of truth for domain types

## Status

Accepted

## Context

The domain has a handful of shapes (flow steps, options, submitted answers)
that need both compile-time types and runtime validation — the flow is
external-ish data (a bundled JSON fixture today, potentially a real API
tomorrow) and the `/api/conversation` submission is genuinely untrusted input.
Hand-writing TypeScript interfaces alongside separate runtime checks invites
the two to drift.

## Decision

Define every domain shape once as a Zod schema (`src/lib/schema/flow.ts`,
`src/lib/schema/answer.ts`) and derive the TypeScript types from it with
`z.infer`. The bundled flow fixture is parsed through `flowSchema` at module
load (`src/lib/data/flow.ts`); the conversation submission is parsed through
`submissionSchema` in the route handler.

## Consequences

- Types and validation can never disagree — there is only one definition.
- A malformed flow fixture fails fast at build/import time rather than
  producing confusing UI bugs.
- Untrusted input (`POST /api/conversation`) is validated the same way as
  trusted local data, using the same schema-building blocks.
