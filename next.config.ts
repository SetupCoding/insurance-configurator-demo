import type { NextConfig } from 'next';

/**
 * Response headers applied to every route.
 *
 * There is deliberately no Content-Security-Policy here. Emotion (which MUI
 * renders through) and Next's own bootstrap both inject inline style and
 * script, so a useful policy needs a per-request nonce threaded through
 * middleware into AppRouterCacheProvider. A policy wide enough to work without
 * that would allow exactly what it is supposed to forbid, so the gap is left
 * visible rather than papered over.
 */
const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // No part of this app is meant to be framed.
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
  // Don't scaffold AGENTS.md/CLAUDE.md on every `next dev`.
  agentRules: false,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
