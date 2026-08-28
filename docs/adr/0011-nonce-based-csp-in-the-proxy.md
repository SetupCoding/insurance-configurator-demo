# 11. A nonce-based Content-Security-Policy, in the proxy

## Status

Accepted

## Context

There was no Content-Security-Policy. `next.config.ts` said why, and what it
said was true: Emotion (which MUI renders through) and Next's own bootstrap both
inject inline style and script, so a useful policy needs a per-request nonce
threaded through the request into `AppRouterCacheProvider`, and a policy wide
enough to work without one would allow exactly what it is supposed to forbid.

That reasoning was correct and the conclusion did not follow from it. Threading
a nonce through is a documented path, not a research project: MUI passes
`options.nonce` into the Emotion cache and onto the `<style>` tags it inserts,
`InitColorSchemeScript` takes a `nonce` prop, and Next nonces the scripts it
emits itself. Leaving the gap "visible rather than papered over" was a fair
thing to do for a while, and a weak thing to keep saying once the work is an
afternoon.

The one real obstacle is not the wiring. It is that a nonce has to be different
per request, which means the document cannot be cached, which means giving up
prerendering. That is a cost worth naming rather than discovering.

## Decision

Ship the policy, built around a fresh nonce per request in `src/proxy.ts`.

The nonce has to reach the renderer, not just the browser. Next picks it up for
its own inline scripts by reading the `Content-Security-Policy` header off the
**request** (`app-render` does this), so the proxy sets the policy on the
forwarded request headers as well as on the response, and adds `x-nonce` so the
layout can read the value without parsing the policy back apart. The layout
hands that to `AppRouterCacheProvider` and to `InitColorSchemeScript`.

The policy itself, in `src/lib/security/csp.ts`:

```
default-src 'self'
script-src  'self' 'nonce-{fresh}' 'strict-dynamic'
style-src   'self' 'nonce-{fresh}'
font-src    'self'
img-src     'self' data:
connect-src 'self'
object-src  'none'
base-uri    'none'
form-action 'self'
frame-ancestors 'none'
```

Three things about it are deliberate:

- No `'unsafe-inline'`, in either `script-src` or `style-src`. That is the whole
  point of the nonce, and a policy carrying both would be decoration.
- No `'unsafe-eval'`, even though something asks for it. Zod decides whether it
  can use its compiled fast path by calling `new Function('')` in a try/catch.
  The throw is swallowed and the fallback works, but the browser still reports
  the blocked attempt, and a policy that fires violations during ordinary use is
  one people learn to scroll past. `src/lib/schema/zod.ts` sets Zod's `jitless`
  flag, which Zod documents for this and which skips the probe entirely. The
  interpreted path costs nothing here: the largest thing this app validates is a
  six-element array.
- No `style-src-attr 'unsafe-inline'`, which is the concession these policies
  usually end up making. A nonce cannot apply to a `style` attribute, so one in
  the server-rendered HTML would be blocked. This app renders none, and an e2e
  test asserts that instead of assuming it. Styles React sets after hydration
  are unaffected, because assigning to `element.style` goes through the CSSOM,
  which CSP does not govern.

The other security headers stay in `next.config.ts`. They do not vary per
request, and keeping them there means they also cover the routes the proxy
deliberately skips.

## Consequences

- **The page is no longer prerendered, and this is the real price.** `/` used to
  build as `compute: "static"` with the HTML generated once. Reading `headers()`
  for the nonce opts the route into dynamic rendering, and a per-request nonce is
  incompatible with a cached document in any case. The route table now shows
  `ƒ /[locale]`. Accepted because there is one page, it fetches nothing, and
  rendering it is a walk over five steps of a bundled fixture; if this app ever
  had a page whose render cost mattered, the trade would need revisiting.
- The proxy matcher excludes `/api`, `_next/static`, `_next/image` and the files
  in `public/`. Those need no nonce, and must not be made dynamic to get one.
  The API route therefore has no CSP, which an e2e test states on purpose so it
  reads as a decision rather than an oversight.
- The locale routing in ADR [0012](0012-localised-flow-data-and-a-locale-on-the-wire.md)
  is hand-rolled because of this. next-intl's middleware copies the incoming
  request headers, but it builds its own `NextResponse`, so injecting the policy
  into the request it forwards would mean reaching into Next's internal
  `x-middleware-override-headers` protocol. Reading that protocol in a test to
  verify the forwarding is fine; depending on it in production code is not.
- Verified rather than assumed. The e2e suite asserts that every inline script
  and style tag carries the request's nonce, that the nonce changes between
  requests, that no `style` attribute is rendered, and that using the app
  (hydration, the theme switch, the native dialog, a submission) produces no
  `securitypolicyviolation` at all. It runs in Chromium, Firefox and WebKit,
  which is what covers `strict-dynamic` being supported unevenly.
- One thing the policy still lacks is reporting. There is no `report-to`
  endpoint, because there is nothing here to collect reports.
- The file is `src/proxy.ts`, not `src/middleware.ts`. Next 16.3 renamed the
  convention and deprecates the old name; the runtime and API are unchanged, and
  the forwarded-request header protocol keeps its `x-middleware-*` names.
