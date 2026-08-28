# 12. Localised flow data, and a locale on the wire

## Status

Accepted

## Context

The UI was hardcoded German, with the copy spread across eight components, and
there was no i18n layer at all. On its own that is a reasonable scope boundary
for a demo. What made it awkward was the claim sitting next to it: the response
schema described the API's failure codes as language-neutral so that "a new
locale never means changing the server".

Half of that was true. The failure codes really are neutral, and the client
really does own their wording. But the same response carries `question` and
`label`, which are display text, and those came out of `flow.json` in German.
A new locale would absolutely have meant changing the server, or rather changing
its data, and the comment was written as though it would not. The claim was
broader than the code.

Two ways out. Delete the claim and say the app ships one language on purpose, or
make the claim true. The second is more interesting, because the thing that
makes it non-trivial is precisely the property ADR
[0009](0009-a-stateless-demo-that-really-validates.md) is built on: the response
is rebuilt from the server's own walk of the flow, so that what appears on
screen is evidence validation ran. The wording has to come from the server. It
cannot be a client-side lookup without giving that up.

## Decision

Ship a real locale layer, and be exact about which parts of the contract are
language-neutral and which are not.

**Messages.** next-intl owns the UI copy, in `messages/de.json` and
`messages/en.json`. It earns its place for the message plumbing: catalogue
loading, the server/client boundary, `useTranslations`, ICU formatting.

**The default.** `DEFAULT_LOCALE` is English, even though the domain is German
insurance and the original challenge was German. Negotiation already serves a
German browser German and an English one English, so the default decides only
what reaches a browser asking for neither, a crawler sending no
`Accept-Language`, and a bare `curl`. For a portfolio piece that gets indexed and
poked at with curl, English is the more useful answer to all three.
`hreflang="x-default"` in the layout points at the same locale, because it has to
agree with what the proxy would actually negotiate for that visitor.

**Routing.** Every page lives under a locale segment (`/en`, `/de`), and the
prefix routing is hand-rolled in `src/proxy.ts` rather than delegated to
next-intl's middleware. The reason is the nonce in ADR
[0011](0011-nonce-based-csp-in-the-proxy.md): the policy has to be injected into
the request headers Next renders with, and next-intl builds its own
`NextResponse`, so composing around it means depending on an internal Next
protocol. Prefix routing for two locales is a redirect and an
`Accept-Language` parse; the library was offering the easy half and none of the
hard half, which is the same trade ADR
[0010](0010-fetch-plus-a-local-submission-hook.md) made about mutations.

A consequence of not using their middleware: `setRequestLocale` in the layout is
load-bearing, not decorative. Without it next-intl never learns which locale the
render is for, falls back to the default, and `/de` renders English.

**The flow data.** Every display text in `flow.json` becomes a record keyed by
locale. The graph stays single-sourced, so ids, names, `nextId`, reachability
and acyclicity are still checked once for one graph rather than once per
translation, and a translation can never disagree with the structure.

The type this gives is doing real work. Zod requires a record keyed by an enum
to be exhaustive, so a text that is missing a translation, or that carries one
for a locale not in `LOCALES`, fails at import time with the path of the
offending text. Translation completeness is an invariant of the data, checked by
the same mechanism as everything else about the flow, rather than a thing to
remember. Adding a locale to `LOCALES` makes the app refuse to start until every
question and option has been translated.

The one per-step check that had to change shape is the duplicate option text:
it is now per locale, because two options sharing a label matters in whichever
language shows it twice, and the German and English label sets are unrelated.

**Resolving.** `localizeFlow` in `lib/domain` collapses the locale-keyed flow to
one locale on the server, once per render. Below that boundary the flow is a
graph of plain strings, so the reducer, the persisted selections and every
component are untouched by this change and no component has to know a locale
exists. The types carry the distinction: `FlowDefinition`/`StepDefinition` are
the authored flow with every translation, `Flow`/`Step` are the resolved one.

**The wire.** `POST /api/conversation?locale=de|en`. Because the reply carries
wording, the request has to say which language. Absent means the default locale,
which keeps a bare `curl` working; present but unknown is a client bug and gets
`422 unsupported_locale` rather than a quiet downgrade to the default for
somebody who asked for something else. The locale is checked before the body is buffered.

The walk itself stays language-neutral: it matches on `name` and `value` and
never on text, so which locale is asked for cannot change whether a submission
is accepted. `detail` on a rejection stays English, because it is a diagnostic
for whoever holds the logs and is never shown.

## Consequences

- Adding a locale is: one entry in `LOCALES`, a translation for every text in
  `flow.json`, and a message file. Nothing in the route, the schema or the
  components changes, and the build fails until the data is complete.
- The neutrality claim is now precise instead of flattering. The failure codes
  are language-neutral; `question` and `label` are display text resolved in the
  requested locale, and that is deliberate because they are the evidence the
  server walked the flow.
- The client payload carries one language rather than all of them, which is a
  consequence of resolving on the server rather than shipping the whole
  dictionary. A test asserts the English wording is absent from `/de`.
- Failure codes are now translated in the UI, which fixed a latent bug rather
  than only moving strings. `ErrorState` used to take a message, use it solely to
  decide whether to render, and then display a generic heading instead, so every
  per-code sentence the API layer built was discarded and a rejected path read
  identically to an unreachable server. It takes a code now and shows the
  reason.
- The header has a locale link, so `/en` is reachable without editing the URL.
  It is a link and not a toggle because changing locale is navigation: it works
  before JavaScript, survives being opened in a new tab, and can be crawled.
- That link is a plain anchor rather than `next/link`, so the browser replaces
  the document instead of patching it. Partly because that is what a locale
  change is, with `html[lang]`, the metadata, the alternates and every string
  changing together, and assistive technology reading the language of the
  document it parsed. Mostly because the soft navigation was broken: it remounted
  the `[locale]` layout and `AppRouterCacheProvider` with it, so a second Emotion
  cache was built while the first tore its global styles down. CssBaseline was
  left as empty `<style>` tags, the page lost its background, and the theme
  toggle looked dead because it still flipped `data-mui-color-scheme` with
  nothing to repaint. The whole suite stayed green throughout, because nothing
  in it asked whether the page was still painted. There is a test for it now.
- Every visual baseline now exists twice, once per locale, with the locale in
  the filename. German compounds are longer than their English equivalents
  ("Haftpflichtversicherung" against "liability insurance"), so the two languages
  wrap differently and a layout that survives one is not evidence about the
  other. That matters most on the 320px viewport, where the difference decides
  how many lines a heading takes. The cost is that every baseline has to be
  reviewed twice. They stay outside the CI gate (ADR
  [0007](0007-visual-tests-outside-the-ci-gate.md)) and still have to be
  regenerated in the pinned container.
- Translating a German insurance product is a judgment call, not a lookup.
  `Kasko` has no clean English equivalent: it is own-damage cover, and the
  nearest readable rendering is "collision damage insurance", with `Vollkasko`
  and `Teilkasko` as "full" and "partial coverage". Calling `Teilkasko`
  "partially comprehensive" would have been worse than it looks, because what it
  actually covers is theft, fire and glass rather than a partial share of
  collision. The German remains the authoritative wording for the domain; the
  English is a faithful gloss of it.
- `Accept-Language` negotiation means a bare `/` serves the visitor's language,
  and an explicit `/de` or `/en` always wins over it, so a shared link opens in
  the language it was shared in.
- The e2e suite navigates to an explicit locale rather than to `/`. Playwright's
  browsers send `en-US`, so `/` would have quietly moved every assertion onto the
  English page.
- Where negotiation gets asserted had to be worked out rather than assumed,
  because `Accept-Language` is the browser's header and two of the three will not
  let a test own it. Measured against a bare HTTP server on a German machine:
  Chromium ignores `extraHTTPHeaders['Accept-Language']` and sends its own, and
  WebKit appends the OS locale to whatever is set, so `locale: 'fr-FR'` arrives as
  `fr-FR, de-DE` and lands on German, which is the correct response to that
  header. Only Firefox sends exactly what it is told.

  So the exact semantics live where the header is an argument:
  `negotiate.test.ts` for parsing and precedence, `proxy.test.ts` for the redirect
  it produces, both including the `fr-FR, de-DE` shape. The container job asserts
  the fallback over real HTTP with curl, which does own its headers. The e2e suite
  keeps only what a browser can actually demonstrate: that one configured for a
  language arrives on that language.

  This was not spotted for free. While the default was German, the fallback test
  passed on WebKit not because the fallback worked but because WebKit had been
  asking for German all along. Flipping the default is what exposed it, which is
  a reminder that a green test proves less than it looks when the input is
  something the test does not control.
