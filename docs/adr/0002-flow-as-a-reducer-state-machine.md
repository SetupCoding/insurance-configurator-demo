# 2. Model the conversation as a pure reducer state machine

## Status

Accepted

## Context

The conversation is a decision tree: each step offers options, each option
points at the next step (or ends the flow). The UI needs to show the full
history of answered steps, let the user revise an earlier answer, and detect
completion, without ad hoc boolean flags scattered across components.

## Decision

Model it as a pure `(state, action) => state` reducer (`src/features/flow/reducer.ts`),
built by `createFlowReducer(flow)` so the flow definition is captured once and
the reducer itself stays a pure function. State is `{ steps, status }`, where
`steps` is the ordered list of steps shown so far, each paired with its
selection (`null` while unanswered). Selecting an option on an earlier step
truncates everything after it, since those answers are no longer valid.

Steps are treated as immutable: the selection is tracked alongside each step
entry rather than mutating the step, so no deep copying of the flow is ever
needed.

`useInsuranceFlow` (`src/features/flow/useInsuranceFlow.ts`) wraps this in
`useReducer`, restoring persisted selections after mount and persisting new
ones as they're made.

## Consequences

- The core logic (`reducer.ts`) has no React dependency and is trivially unit
  tested (see `reducer.test.ts`).
- "Change an earlier answer" is one code path (truncate + re-select), not a
  special case.
- Referential integrity (every `nextId` pointing at a real step) is enforced by
  `flowSchema`, which no flow reaches the reducer without passing. The reducer
  relies on that rather than re-checking it: the fallback it used to carry for a
  missing step was unreachable once the schema became the guarantee, and
  unreachable code cannot be tested.
- Re-selecting the value a step already holds returns the same state object, so
  the downstream answers survive and React skips the render. Only a genuine
  change truncates.
