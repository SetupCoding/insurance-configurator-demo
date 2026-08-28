import { NextRequest, type NextResponse } from 'next/server';
import { describe, expect, it } from 'vitest';

import { DEFAULT_LOCALE } from '@/lib/i18n/locales';

import { proxy } from './proxy';

function request(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${path}`, { headers });
}

/**
 * The request headers a NextResponse forwards to the renderer.
 *
 * `NextResponse.next({ request: { headers } })` encodes them onto the response
 * as `x-middleware-override-headers` plus one `x-middleware-request-*` entry
 * each, and that is the path by which the policy reaches `app-render`. Reading
 * it back is the only way to assert the forwarding from here; that it actually
 * works is then confirmed against a real browser in the e2e suite.
 */
function forwardedHeaders(response: NextResponse): Headers {
  const names = response.headers.get('x-middleware-override-headers')?.split(',') ?? [];
  const forwarded = new Headers();

  for (const name of names) {
    const value = response.headers.get(`x-middleware-request-${name.trim()}`);
    if (value !== null) forwarded.set(name.trim(), value);
  }

  return forwarded;
}

function nonceOf(policy: string | null): string | null {
  return /'nonce-([^']+)'/.exec(policy ?? '')?.[1] ?? null;
}

describe('locale routing', () => {
  it('sends a bare path to the default locale', () => {
    const response = proxy(request('/'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(`http://localhost/${DEFAULT_LOCALE}`);
  });

  it('negotiates the locale from Accept-Language', () => {
    // German rather than English, because English is the default and would be
    // the answer either way.
    const response = proxy(request('/', { 'accept-language': 'de-AT,de;q=0.9' }));

    expect(response.headers.get('location')).toBe('http://localhost/de');
  });

  it('falls back to the default when the header names nothing it ships', () => {
    const response = proxy(request('/', { 'accept-language': 'fr-FR,fr;q=0.9' }));

    expect(response.headers.get('location')).toBe(`http://localhost/${DEFAULT_LOCALE}`);
  });

  it('takes a supported language of lower quality over the default', () => {
    // Exactly the header WebKit sends for a French locale on a German machine,
    // because it appends the OS locale. German was asked for, so German is the
    // right answer, and this is the case the e2e suite cannot express: two of
    // the three browsers will not let a test own this header.
    const response = proxy(request('/', { 'accept-language': 'fr-FR, de-DE' }));

    expect(response.headers.get('location')).toBe('http://localhost/de');
  });

  it('keeps the rest of the path when it prefixes the locale', () => {
    const response = proxy(request('/impressum'));

    expect(response.headers.get('location')).toBe(`http://localhost/${DEFAULT_LOCALE}/impressum`);
  });

  it('keeps the query string', () => {
    const response = proxy(request('/?ref=cv'));

    expect(response.headers.get('location')).toBe(`http://localhost/${DEFAULT_LOCALE}?ref=cv`);
  });

  it('lets a path that already names a locale through', () => {
    for (const path of ['/de', '/en', '/de/impressum']) {
      expect(proxy(request(path)).headers.get('location')).toBeNull();
    }
  });

  it('does not redirect a locale path even when the header prefers the other one', () => {
    // An explicit URL beats a browser preference, or a shared link would never
    // open in the language it was shared in.
    const response = proxy(request('/en', { 'accept-language': 'de' }));
    expect(response.headers.get('location')).toBeNull();
  });
});

describe('content security policy', () => {
  it('sets a policy on a rendered response', () => {
    const policy = proxy(request('/de')).headers.get('content-security-policy');

    expect(policy).toContain("script-src 'self' 'nonce-");
    expect(nonceOf(policy)).not.toBeNull();
  });

  it('sets a policy on a redirect too, so no response leaves without one', () => {
    expect(proxy(request('/')).headers.get('content-security-policy')).toContain(
      "default-src 'self'",
    );
  });

  it('forwards the policy on the request, which is where Next reads the nonce', () => {
    const response = proxy(request('/de'));
    const forwarded = forwardedHeaders(response);

    expect(forwarded.get('content-security-policy')).toBe(
      response.headers.get('content-security-policy'),
    );
  });

  it('forwards the nonce for the layout to hand to Emotion and MUI', () => {
    const response = proxy(request('/de'));

    // The same value in both places, or the styles would be nonced with
    // something the browser was never told to trust.
    expect(forwardedHeaders(response).get('x-nonce')).toBe(
      nonceOf(response.headers.get('content-security-policy')),
    );
  });

  it('mints a fresh nonce per request', () => {
    const first = nonceOf(proxy(request('/de')).headers.get('content-security-policy'));
    const second = nonceOf(proxy(request('/de')).headers.get('content-security-policy'));

    // A nonce reused across requests is no better than 'unsafe-inline', and is
    // the reason the page cannot be prerendered. See ADR 0011.
    expect(first).not.toBe(second);
  });
});
