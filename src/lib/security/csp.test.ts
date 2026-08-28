import { describe, expect, it } from 'vitest';

import { contentSecurityPolicy, createNonce } from './csp';

/**
 * The shape Next accepts. Copied from `getScriptNonceFromHeader` in
 * `next/dist/server/app-render`, which silently ignores a nonce it cannot parse
 * rather than failing, so a malformed one would show up as a page whose scripts
 * are all blocked and nothing pointing at why.
 */
const NEXT_NONCE_SOURCE = /^'nonce-([A-Za-z0-9+/_-]+={0,2})'$/;

/** Returns one directive from a policy string, without its name. */
function directive(policy: string, name: string): string | undefined {
  const found = policy.split('; ').find((part) => part === name || part.startsWith(`${name} `));
  return found?.slice(name.length).trim();
}

describe('createNonce', () => {
  it('produces a value Next will actually read', () => {
    expect(`'nonce-${createNonce()}'`).toMatch(NEXT_NONCE_SOURCE);
  });

  it('carries at least 128 bits of randomness', () => {
    // Base64 of 16 bytes. A nonce shorter than this is guessable, which defeats
    // the point of naming one.
    expect(createNonce()).toHaveLength(24);
  });

  it('is different every time', () => {
    const nonces = new Set(Array.from({ length: 50 }, createNonce));
    expect(nonces.size).toBe(50);
  });
});

describe('contentSecurityPolicy', () => {
  const policy = contentSecurityPolicy('test-nonce');

  it('nonces both scripts and styles', () => {
    expect(directive(policy, 'script-src')).toContain("'nonce-test-nonce'");
    expect(directive(policy, 'style-src')).toContain("'nonce-test-nonce'");
  });

  it('never allows inline script', () => {
    // The whole reason the nonce exists. `unsafe-inline` here would make the
    // policy decorative.
    expect(directive(policy, 'script-src')).not.toContain('unsafe-inline');
  });

  it('never allows inline style elements', () => {
    expect(directive(policy, 'style-src')).not.toContain('unsafe-inline');
  });

  it('makes no exception for style attributes either', () => {
    // The concession a nonce policy usually ends up making, and not needed
    // here: the server renders no style attributes, which an e2e test asserts.
    // What React sets after hydration goes through the CSSOM, which CSP does
    // not govern.
    expect(directive(policy, 'style-src-attr')).toBeUndefined();
  });

  it('never allows eval', () => {
    // Zod would take it if it were offered. lib/schema/zod.ts stops it asking
    // instead, so the policy does not have to give ground here.
    expect(directive(policy, 'script-src')).not.toContain('unsafe-eval');
  });

  it('carries strict-dynamic, so nonced code can load its own chunks', () => {
    expect(directive(policy, 'script-src')).toContain("'strict-dynamic'");
  });

  it('keeps self as the fallback for browsers without strict-dynamic', () => {
    expect(directive(policy, 'script-src')).toContain("'self'");
  });

  it('shuts the doors that have no legitimate use here', () => {
    expect(directive(policy, 'object-src')).toBe("'none'");
    expect(directive(policy, 'base-uri')).toBe("'none'");
    expect(directive(policy, 'frame-ancestors')).toBe("'none'");
  });

  it('restricts what the page may load and where it may talk', () => {
    expect(directive(policy, 'default-src')).toBe("'self'");
    expect(directive(policy, 'font-src')).toBe("'self'");
    expect(directive(policy, 'connect-src')).toBe("'self'");
    expect(directive(policy, 'form-action')).toBe("'self'");
  });

  it('allows the inline image data Next emits for small assets', () => {
    expect(directive(policy, 'img-src')).toBe("'self' data:");
  });

  it('puts a real nonce through unchanged', () => {
    const nonce = createNonce();
    expect(contentSecurityPolicy(nonce)).toContain(`'nonce-${nonce}'`);
  });
});
