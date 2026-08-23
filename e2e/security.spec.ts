import { expect, test } from '@playwright/test';

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

test('serves the security headers on the page', async ({ page }) => {
  const response = await page.goto('/');
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
  const response = await page.goto('/');

  expect(response!.headers()['x-powered-by']).toBeUndefined();
});
