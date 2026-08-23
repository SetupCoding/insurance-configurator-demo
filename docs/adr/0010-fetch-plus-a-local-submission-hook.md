# 10. Fetch plus a local submission hook, not a mutation library

## Status

Accepted. Supersedes the TanStack Query half of
[0004](0004-tanstack-query-and-msw-over-orval.md).

## Context

The one mutation in this app was driven by a TanStack Query `useMutation`. Two
of its defaults were wrong for this request, and neither was a configuration
detail:

- Mutations retried once automatically. A `POST` is not safely repeatable
  without an idempotency key, and whether to try again after a failure is a
  decision for the person who pressed the button, not for the transport.
- A mutation has no request to cancel. Reset stays available while a submission
  is in flight, and `mutation.reset()` cleared the UI while the `fetch` it
  belonged to stayed on the wire, free to resolve into a conversation the user
  had already restarted.

Working around both meant hand-rolling an `AbortController` and a staleness
guard anyway, at which point the library was providing the part that was easy
and none of the part that was hard.

## Decision

`useSubmitAnswers` (`src/features/flow/useSubmitAnswers.ts`) is a local hook
over `fetch`. It exposes the same discriminated status a mutation would
(`isIdle`, `isPending`, `isSuccess`, `isError`) and adds the two properties this
request needs:

- Each attempt owns an `AbortController` and a generation counter. `reset()`
  bumps the generation and aborts, so a response already in transit finds its
  attempt retired and is dropped rather than applied. Unmounting does the same.
- A synchronous `inFlight` ref blocks a second start. This matters because two
  clicks in the same tick both read the `isPending` of the render they were
  dispatched from, so React state alone cannot prevent the second request.

The submit button stays `aria-disabled` rather than natively `disabled`. A
natively disabled button leaves the tab order and stops being announced, which
is the wrong thing to do to the one control that is currently reporting
progress. A disabled attribute would also only have hidden the race, not
removed it; the ref guard removes it, and the test that proves this dispatches
real clicks at an `aria-disabled` button.

MSW stays. It mocks the network, not the client, so it was never coupled to this
choice.

## Consequences

- One fewer runtime dependency, and no provider in the tree for a single
  request.
- Retry is a button the user presses, and the test asserts that a failure
  produces exactly one request.
- Reset during a pending submission has defined behaviour, covered by a test
  that holds the response open until the reset has happened.
- The status flags are hand-maintained. If a second mutation ever appears, and
  especially if caching or invalidation is needed, revisit this: the argument
  above is about one non-idempotent request, not about mutation libraries in
  general.
