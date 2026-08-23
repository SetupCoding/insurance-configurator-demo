# 9. Position this as a stateless demo, and make the server do real work

## Status

Accepted

## Context

The app previously called itself a Versicherungs-Helfer, claimed to narrow down
a suitable type of insurance, and ended with "Herzlichen Dank für Ihre
Angaben!". None of that was true. `POST /api/conversation` checked the shape of
the payload, waited 600 ms to make the loading state visible, discarded the
answers and replied `{ status: 'ok' }`. There was no recommendation, no
persistence and nothing the response actually said about the submission.

That is a defensible thing to build and an indefensible thing to claim. The
choice was to implement the product for real, which means an insurance domain,
a data protection decision and a storage story, or to be a demo and say so.

## Decision

Be a demo, and be explicit about it in the two places someone will look: the
deployed page and the README. The title is Versicherungs-Konfigurator, a
subtitle states in one line that this is a technical demo which gives no advice
and stores nothing, and the result view is called "Ihre Demo-Konfiguration".

Being a demo is not a licence for the server to do nothing. The artificial delay
is gone and the endpoint now replays the submission against the flow
(ADR [0003](0003-zod-as-single-source-of-truth.md)) and answers with the
configuration it derived from that path, resolved back to the question and
option wording. The client renders the server's version, not its own copy, so
the result on screen is evidence that validation ran.

Nothing is stored, server-side or in a database, and that is a property rather
than a placeholder.

## Consequences

- The operation is idempotent because it has no effects, which is what makes an
  idempotency key, request deduplication and a distributed rate limiter
  genuinely unnecessary here rather than merely missing. If persistence ever
  arrives, all three become required in the same commit.
- The pending state is now driven by real latency. Locally it is a flash; on a
  deployed instance it is a real round trip.
- A reviewer can distinguish "validated" from "accepted anything": submitting a
  tampered path returns 422 and shows an error, which is observable from the UI.
- `sessionStorage` is the only place answers persist, it expires after 24 hours,
  and it is cleared once a submission is accepted
  (`src/features/flow/persistence.ts`).
- The claim in the UI is now falsifiable. If persistence is ever added and the
  subtitle is not changed, the app is lying again; the subtitle is deliberately
  specific enough for that to be caught in review.
