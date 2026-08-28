import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

/**
 * Response headers applied to every route, including the ones the proxy
 * does not run on (the API route, `_next` output, `public/`).
 *
 * The Content-Security-Policy is deliberately not here. It needs a fresh nonce
 * per request, and this config is evaluated once at build time, so it lives in
 * `src/proxy.ts` instead. See ADR 0011 for what that costs and why it is
 * worth it.
 */
const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // No part of this app is meant to be framed. The CSP says the same thing
  // with `frame-ancestors`; this is the header older browsers read instead.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Ignored over plain HTTP, so it is safe to set for local runs too.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  // Standalone output exists for the Docker image, which needs a
  // self-contained server plus the dependencies Next traces for it. Vercel
  // builds its own output and never consumes that, while its packaging step
  // does read the trace files this mode emits, and fails there with an ENOENT
  // on next-server.js.nft.json. That broke the first deploy on 16.3.1, and
  // 16.3.2 ships no fix for it. Emitting standalone only where something
  // actually consumes it keeps one deploy target from breaking the other.
  output: process.env.VERCEL ? undefined : 'standalone',
  // AGENTS.md and CLAUDE.md are hand-written here, so scaffolding is off: this
  // keeps `next dev` from regenerating over them.
  agentRules: false,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
