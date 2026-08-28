/**
 * 128 bits of randomness, base64 encoded, which is what CSP Level 3 asks for.
 *
 * `crypto.getRandomValues` and `btoa` are the two spellings available in every
 * runtime this ships to (the Edge runtime the proxy runs in, Node in the
 * container, and the browser in tests). `Buffer` is not.
 */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * The policy, built around a per-request nonce.
 *
 * Two directives here are the ones worth explaining:
 *
 * - `script-src` carries the nonce plus `strict-dynamic`. Next inlines its own
 *   bootstrap and flight-data scripts, and those get the nonce because Next
 *   reads it from the request's own CSP header. `strict-dynamic` then lets that
 *   nonced code load the chunks it needs without listing every one, and makes
 *   a supporting browser ignore the host source entirely. `'self'` stays as the
 *   fallback for browsers that do not implement `strict-dynamic`.
 *
 *   No `'unsafe-eval'` either, which is worth stating because something does
 *   ask for it: Zod probes `new Function('')` to pick its compiled fast path.
 *   That probe is switched off at the source rather than allowed here. See
 *   `lib/schema/zod.ts`.
 *
 * - `style-src` carries the nonce because Emotion's server-inserted `<style>`
 *   tags carry it too: `AppRouterCacheProvider` passes `options.nonce` into the
 *   Emotion cache and onto those tags.
 *
 *   There is deliberately no `style-src-attr 'unsafe-inline'` beside it, which
 *   is the concession nonce policies usually end up making. A nonce cannot
 *   apply to a `style` attribute, so one in the server-rendered HTML would be
 *   blocked. This app renders none, and an e2e test asserts that rather than
 *   trusting it. Styles React sets after hydration are unaffected either way,
 *   because assigning to `element.style` goes through the CSSOM, which CSP does
 *   not govern. If a component ever does render an attribute, that is the point
 *   to revisit this, not a reason to widen it in advance.
 *
 * No `report-uri`/`report-to`: there is nothing here to collect reports.
 */
export function contentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    // Self-hosted fonts (ADR 0005), so no third-party font origin.
    "font-src 'self'",
    // `data:` covers the inlined icon/font data Next emits for small assets.
    "img-src 'self' data:",
    // The only request the client makes is the one to its own API route.
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    // Same intent as the X-Frame-Options header in next.config.ts, for
    // browsers that read the modern directive instead.
    "frame-ancestors 'none'",
  ].join('; ');
}

/**
 * Where the proxy puts the nonce for the renderer to find.
 *
 * The policy itself is also forwarded on the request, because that is where
 * Next looks when it nonces its own inline scripts. This header exists so the
 * layout can read the value without parsing a policy back apart.
 */
export const NONCE_HEADER = 'x-nonce';

/** The response and forwarded-request header the policy is set on. */
export const CSP_HEADER = 'content-security-policy';
