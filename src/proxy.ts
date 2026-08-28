import { type NextRequest, NextResponse } from 'next/server';

import { isLocale } from '@/lib/i18n/locales';
import { negotiateLocale } from '@/lib/i18n/negotiate';
import { contentSecurityPolicy, createNonce, CSP_HEADER, NONCE_HEADER } from '@/lib/security/csp';

/**
 * Every path that renders HTML, and nothing else.
 *
 * The exclusions are not just an optimisation. The nonce is what forces a page
 * to be rendered per request, so anything that does not need one must not go
 * through here: the API route returns JSON with no inline anything, and Next's
 * build output and the files in `public/` are static. They still get the
 * headers from `next.config.ts`, which apply to every route.
 */
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)'],
};

/**
 * Does two things, and does them together because the second needs the first.
 *
 * 1. Locale routing. Every page lives under a locale segment, so a path that
 *    does not start with one is redirected to the visitor's negotiated locale.
 * 2. The Content-Security-Policy, built around a fresh nonce per request.
 *
 * This is what Next used to call middleware. The file and the exported function
 * are named `proxy` because 16.3 renamed the convention and deprecated the old
 * one; the runtime and the API are unchanged, and the request-header protocol
 * below still uses the `x-middleware-*` names.
 *
 * The nonce has to reach the renderer, not just the browser. Next picks it up
 * for its own inline scripts by reading the CSP header off the *request*
 * (`app-render` does this), which is why the policy is set on the forwarded
 * request headers as well as on the response.
 *
 * That forwarding is also why the locale routing is hand-rolled rather than
 * delegated to next-intl's middleware. next-intl copies the incoming request
 * headers, but it builds its own `NextResponse`, so injecting a header into the
 * request it forwards means reaching into Next's internal
 * `x-middleware-override-headers` protocol. next-intl still owns the part that
 * is actually work, which is messages and formatting; prefix routing for two
 * locales is a redirect. See ADR 0011 and ADR 0012.
 */
export function proxy(request: NextRequest) {
  const nonce = createNonce();
  const policy = contentSecurityPolicy(nonce);

  const { pathname, search } = request.nextUrl;
  const [, firstSegment] = pathname.split('/');

  if (!isLocale(firstSegment)) {
    const locale = negotiateLocale(request.headers.get('accept-language'));
    const target = new URL(`/${locale}${pathname === '/' ? '' : pathname}${search}`, request.url);

    // Nothing is rendered for a redirect, so the nonce in this policy is never
    // used. It is still set, so that no response leaves without a policy.
    const redirect = NextResponse.redirect(target);
    redirect.headers.set(CSP_HEADER, policy);
    return redirect;
  }

  const headers = new Headers(request.headers);
  headers.set(CSP_HEADER, policy);
  headers.set(NONCE_HEADER, nonce);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set(CSP_HEADER, policy);
  return response;
}
