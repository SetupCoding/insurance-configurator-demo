# 1. App Router with a Server Component page

## Status

Accepted

## Context

The original project used Next.js Pages Router with a custom `_document` and
manual Emotion SSR wiring to get MUI's styles rendered server-side. Next.js 16
and MUI's App Router integration make that boilerplate unnecessary.

## Decision

Use the App Router. `src/app/page.tsx` is a Server Component that loads and
validates the conversation flow at render time via `getFlow()`, then hands it
as a prop to a single `'use client'` component (`InsuranceChat`) that owns all
interactive state. `@mui/material-nextjs/v16-appRouter`'s
`AppRouterCacheProvider` handles Emotion's SSR style injection, replacing the
old `_document`.

## Consequences

- No client-side fetch for the flow: it's embedded in the initial HTML.
- Exactly one client boundary (`InsuranceChat`); everything above it stays a
  Server Component.
- MUI's SSR setup is a few lines instead of a hand-rolled `_document`.
