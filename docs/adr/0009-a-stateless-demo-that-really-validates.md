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

- The operation has no effects, so it is idempotent, and that is what makes an
  idempotency key and request deduplication genuinely unnecessary here rather
  than merely missing: there is no duplicate effect to prevent. If persistence
  ever arrives, both become required in the same commit.
- A rate limiter is a separate question with a different answer, and there is
  not one. See the correction below.
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

## Correction: the rate limiter

An earlier version of the first consequence above put a rate limiter in the same
sentence as the idempotency key and the request deduplication, and called all
three "genuinely unnecessary rather than merely missing". Two of those three
were right. The rate limiter was not, and a review that pushed on exactly this
sentence was correct to.

Statelessness defends against duplicate **effects**. A rate limiter defends
against **resource consumption**, and the two are unrelated. `POST
/api/conversation` reads a body of up to 16 KB, parses it, and walks the flow
graph on every request. Serving that as fast as somebody cares to ask for it is
a denial-of-service surface whether or not a single byte is ever stored. What
would make a limiter necessary is being reachable, not being persistent, so
tying it to persistence was the error.

The honest statement is therefore that a rate limiter is **missing**, not
unnecessary. It is still not implemented, and the reasons belong here as reasons
rather than dressed up as a decision:

- The deployed instance is not naked, but not because of anything in this
  repository. Vercel terminates requests in front of the app and applies
  platform-level DDoS mitigation. That is a mitigation this project does not
  own, and it does nothing for the Docker image, which anyone can run anywhere.
- An in-process limiter would be per-instance. On serverless the effective limit
  becomes instances times limit, with counters that vanish whenever an instance
  is recycled, so it would advertise a bound it does not actually hold.
- A limiter that does hold needs shared state, which means Redis or equivalent,
  which means a service, credentials and environment variables. The README
  claims this repository imports with no build configuration and no environment
  variables, and that claim is worth more to a reader than an approximate
  limiter is.

What changes the answer: authentication, persistence, per-request work worth
paying for, or any endpoint whose cost is not bounded by a 16 KB body and a
five-step graph. At that point the limiter arrives together with the shared
store it needs, and this ADR is superseded rather than amended again.
