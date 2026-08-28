import { expect, test } from '@playwright/test';

import { completeFlow, COPY, QUESTIONS } from './helpers';

/**
 * Headers configured in next.config.ts. Asserted against a real response
 * rather than the config object, so a header that the framework drops or
 * overrides on the way out is caught.
 */
const EXPECTED = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'strict-transport-security': 'max-age=63072000; includeSubDomains',
};

declare global {
  interface Window {
    /** Filled by an init script below; see the CSP violation test. */
    __cspViolations?: string[];
  }
}

function nonceOf(policy: string | undefined): string | undefined {
  return /'nonce-([^']+)'/.exec(policy ?? '')?.[1];
}

test('serves the security headers on the page', async ({ page }) => {
  const response = await page.goto('/en');
  const headers = response!.headers();

  for (const [name, value] of Object.entries(EXPECTED)) {
    expect(headers[name], name).toBe(value);
  }
});

test('serves the security headers on the API route', async ({ request }) => {
  const response = await request.post('/api/conversation', {
    data: [{ name: 'liability', value: false }],
    failOnStatusCode: false,
  });

  const headers = response.headers();
  for (const [name, value] of Object.entries(EXPECTED)) {
    expect(headers[name], name).toBe(value);
  }
});

test('does not advertise the framework', async ({ page }) => {
  const response = await page.goto('/en');

  expect(response!.headers()['x-powered-by']).toBeUndefined();
});

test.describe('content security policy', () => {
  test('serves a nonce-based policy that allows no inline script', async ({ page }) => {
    const response = await page.goto('/en');
    const policy = response!.headers()['content-security-policy'];

    expect(policy).toBeDefined();
    expect(nonceOf(policy)).toBeTruthy();
    // Against the whole policy rather than one spelling of one directive: this
    // catches unsafe-inline, unsafe-eval and unsafe-hashes wherever they appear,
    // and cannot be sidestepped by reordering the sources within a directive.
    expect(policy).not.toContain('unsafe-');
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
  });

  test('nonces every inline script and style it serves', async ({ page }) => {
    // The point of the whole arrangement. One un-nonced inline script means
    // either a broken page or a policy that had to be widened to allow it.
    const response = await page.goto('/en');
    const nonce = nonceOf(response!.headers()['content-security-policy']);
    const html = await response!.text();

    const inlineScripts = html.match(/<script(?![^>]*\bsrc=)[^>]*>/g) ?? [];
    const styles = html.match(/<style[^>]*>/g) ?? [];

    expect(inlineScripts.length).toBeGreaterThan(0);
    expect(styles.length).toBeGreaterThan(0);
    for (const tag of [...inlineScripts, ...styles]) {
      expect(tag, tag).toContain(`nonce="${nonce}"`);
    }
  });

  test('renders no style attribute, which is what lets style-src stay nonce-only', async ({
    page,
  }) => {
    // A nonce cannot apply to a `style` attribute, so one rendered here would
    // be blocked, and the usual fix is to add style-src-attr 'unsafe-inline'.
    // The policy does not, because there are none. This is the test that turns
    // that from an assumption into a fact, and fails the moment it changes.
    const html = await (await page.goto('/en'))!.text();

    // Matches a `style` attribute on any tag: a space, then the attribute, so
    // that words merely ending in "style" do not count.
    expect(html).not.toMatch(/<[^>]+\sstyle="/);
  });

  test('mints a new nonce for every request', async ({ page }) => {
    // A nonce that repeats is worth no more than 'unsafe-inline', and is the
    // reason the page cannot be prerendered. See ADR 0011.
    const first = nonceOf((await page.goto('/en'))!.headers()['content-security-policy']);
    const second = nonceOf((await page.goto('/de'))!.headers()['content-security-policy']);

    expect(first).toBeTruthy();
    expect(first).not.toBe(second);
  });

  test('leaves the API route out of it, having nothing inline to nonce', async ({ request }) => {
    const response = await request.post('/api/conversation', {
      data: [{ name: 'liability', value: false }],
      failOnStatusCode: false,
    });

    // The proxy matcher skips /api on purpose: a JSON body has no inline
    // script or style, so a per-request nonce would buy nothing.
    expect(response.headers()['content-security-policy']).toBeUndefined();
  });

  test('runs the whole app without a single policy violation', async ({ page }) => {
    // The assertion that actually proves the policy is not merely present but
    // survivable: hydration, Emotion's runtime style insertion, the pending
    // spinner, the native dialog and the theme switch all happen under it.
    const consoleViolations: string[] = [];
    page.on('console', (message) => {
      if (/content security policy/i.test(message.text())) consoleViolations.push(message.text());
    });

    await page.addInitScript(() => {
      window.__cspViolations = [];
      document.addEventListener('securitypolicyviolation', (event) => {
        // The location matters: a violation with no source is unactionable.
        window.__cspViolations?.push(
          [
            `${event.violatedDirective} blocked ${event.blockedURI}`,
            `at ${event.sourceFile}:${event.lineNumber}:${event.columnNumber}`,
            event.sample ? `sample: ${event.sample}` : '',
          ]
            .filter(Boolean)
            .join(' '),
        );
      });
    });

    await page.goto('/en');
    await page.getByRole('button', { name: COPY.en.themeToggle }).click();
    await page
      .getByRole('group', { name: QUESTIONS.liability })
      .getByRole('button', { name: COPY.en.options.yes })
      .click();
    await page.getByRole('button', { name: COPY.en.reset }).click();
    await page.getByRole('dialog').getByRole('button', { name: COPY.en.cancel }).click();
    await completeFlow(page);

    expect(await page.evaluate(() => window.__cspViolations ?? [])).toEqual([]);
    expect(consoleViolations).toEqual([]);
  });
});
