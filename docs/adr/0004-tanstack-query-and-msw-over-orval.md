# 4. TanStack Query + MSW instead of an Orval-generated client

## Status

Superseded by [0010](0010-fetch-plus-a-local-submission-hook.md). The reasoning
about code generation and MSW still holds; the TanStack Query part does not.

## Context

The original project consumed an external SwaggerHub OpenAPI spec via a
generated client. That spec's availability couldn't be confirmed for this
rebuild, and generating a client from a spec adds a build-time dependency on
an external service for what is, here, a single `POST` endpoint.

## Decision

Write `submitConversation` as a plain `fetch` call
(`src/lib/api/submitConversation.ts`) and drive it through a TanStack Query
`useMutation` (`useSubmitAnswers`) for loading/error/retry state. Mock the
endpoint in tests with MSW (`src/lib/mocks/`) rather than stubbing `fetch`
directly, so the same request/response contract is exercised in tests as in
the browser.

## Consequences

- No code generation step, no dependency on an external spec being reachable.
- Retry, loading and error states come from TanStack Query's mutation state
  machine instead of being hand-rolled.
- If the API surface grows, revisit: a generated client (Orval or otherwise)
  pays off once there are enough endpoints to make hand-written fetch wrappers
  tedious. One endpoint doesn't meet that bar yet.
