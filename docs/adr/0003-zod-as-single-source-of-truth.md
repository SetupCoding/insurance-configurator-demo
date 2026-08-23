# 3. Zod schemas as the single source of truth for domain types

## Status

Accepted

## Context

The domain has a handful of shapes (flow steps, options, submitted answers)
that need both compile-time types and runtime validation. The flow is
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

Shapes alone are not the domain, so the schemas carry the rules too.
`flowSchema` adds a `superRefine` for the graph invariants: unique step ids and
names, option values that match the step's `valueType`, unique option values and
texts, every `nextId` resolving to a real step, every step reachable from the
first, and no cycles. Acyclicity plus resolvable references is what guarantees
every conversation terminates.

One rule genuinely cannot live in a schema. Whether a submission is a
_reachable path_ depends on the flow it is checked against, so
`validateSubmission` (`src/lib/domain/validateSubmission.ts`) replays the
answers through the graph. `submissionSchema` says the payload is well formed;
the replay says it is a conversation that could actually have happened.

## Consequences

- Types and validation can never disagree, since there is only one definition.
- A malformed flow fixture fails fast at import time rather than producing
  confusing UI bugs, and the failure names the invariant it broke.
- Untrusted input (`POST /api/conversation`) is checked for shape by the same
  schema building blocks and for meaning by the domain validator, so a
  hand-written payload cannot pass as a conversation.
- The response contract lives in `src/lib/schema/conversation.ts` and is used on
  both sides, so the client validates what it receives with the schema the route
  produced it with.
