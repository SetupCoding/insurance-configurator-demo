import { expect, test } from '@playwright/test';

import { choose, COPY } from './helpers';

const EN = COPY.en;
const DE = COPY.de;

/**
 * What these do and do not assert, because the line matters.
 *
 * `Accept-Language` is the browser's header to build, and two of the three do
 * not let a test own it. Measured against a bare HTTP server on a German
 * machine: Chromium ignores `extraHTTPHeaders['Accept-Language']` entirely and
 * sends its own, and WebKit appends the operating system locale to whatever is
 * asked for, so `locale: 'fr-FR'` arrives as `fr-FR, de-DE` and lands on German,
 * correctly. Only Firefox sends exactly what it is told.
 *
 * So the exact semantics of the header (quality ordering, `q=0`, wildcards,
 * region narrowing, and the `fr-FR, de-DE` shape WebKit produces) are asserted
 * in `src/lib/i18n/negotiate.test.ts` and `src/proxy.test.ts`, where the header
 * is an argument rather than a browser's opinion. The container job in CI checks
 * the fallback over real HTTP with curl.
 *
 * What is left here is the part only a browser can show: that a browser
 * configured for a language actually arrives on that language's page. Both
 * assertions below hold in all three engines, because appending `de-DE` does not
 * change the outcome when the first tag already matches.
 */
test.describe('locale negotiation', () => {
  test.describe('a browser configured for German', () => {
    test.use({ locale: 'de-AT' });

    test('lands on German, matching the language and not the region', async ({ page }) => {
      await page.goto('/');

      expect(new URL(page.url()).pathname).toBe('/de');
      await expect(page.getByRole('heading', { name: DE.questions.liability })).toBeVisible();
    });
  });

  test.describe('a browser configured for English', () => {
    test.use({ locale: 'en-GB' });

    test('lands on English', async ({ page }) => {
      await page.goto('/');

      expect(new URL(page.url()).pathname).toBe('/en');
      await expect(page.getByRole('heading', { name: EN.questions.liability })).toBeVisible();
    });
  });

  test('an explicit locale in the URL beats the browser preference', async ({ page }) => {
    // Playwright's browsers ask for English here, so German can only have come
    // from the path. Otherwise a link shared in one language would open in
    // another.
    await page.goto('/de');

    expect(new URL(page.url()).pathname).toBe('/de');
    await expect(page.getByRole('heading', { name: DE.questions.liability })).toBeVisible();
  });

  test('a path that is not a locale is not silently served', async ({ page }) => {
    const response = await page.goto('/nope');

    expect(response!.status()).toBe(404);
  });
});

test.describe('translation', () => {
  test('declares the language it is actually written in', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await page.goto('/de');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  });

  test('translates the questions and the surrounding copy together', async ({ page }) => {
    await page.goto('/de');

    await expect(page.getByRole('heading', { level: 1, name: DE.title })).toBeVisible();
    await expect(page.getByRole('heading', { name: DE.questions.liability })).toBeVisible();
    // The flow wording is data and the chrome is a message catalogue, so this
    // is the assertion that both were translated and not just one.
    await expect(page.getByText(EN.questions.liability)).toBeHidden();
  });

  test('keeps the theme painted and working across a locale switch', async ({ page }) => {
    // Regression. Switching locale through next/link remounted the [locale]
    // layout and AppRouterCacheProvider with it, so a second Emotion cache was
    // built while the first tore its global styles down. CssBaseline was left as
    // empty <style> tags: the page lost its background and the toggle looked
    // dead, because it still flipped data-mui-color-scheme with nothing to
    // repaint. Every other test passed throughout, because none of them looked
    // at whether anything was actually painted.
    const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    await page.goto('/en');
    const before = await background();
    expect(before).not.toBe('rgba(0, 0, 0, 0)');

    await page.getByRole('link', { name: EN.otherLocale }).click();
    await page.waitForURL('**/de');
    await expect(page.getByRole('heading', { name: DE.questions.liability })).toBeVisible();
    // Neither the URL nor the heading is a safe moment to sample. The theme
    // eases its background change, so losing the global styles showed up as a
    // fade to transparent over about 300ms rather than all at once, and an
    // earlier sample catches the old colour on its way out and passes whatever
    // the page settles on. Wait past the transition instead.
    await page.waitForTimeout(600);

    // The global styles survived, and the scheme came across with them.
    expect(await background()).toBe(before);

    // And the toggle still repaints, which is the half that looked broken.
    await page.getByRole('button', { name: DE.themeToggle }).click();
    await expect.poll(background).not.toBe(before);
  });

  test('switches locale via a real link, in both directions', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByRole('heading', { name: EN.questions.liability })).toBeVisible();

    const toGerman = page.getByRole('link', { name: EN.otherLocale });
    await expect(toGerman).toHaveAttribute('href', '/de');
    await toGerman.click();
    // A client-side navigation, so click() resolves before the route commits.
    await page.waitForURL('**/de');

    expect(new URL(page.url()).pathname).toBe('/de');
    await expect(page.getByRole('heading', { name: DE.questions.liability })).toBeVisible();

    // And back, which is the same control pointing the other way.
    await page.getByRole('link', { name: DE.otherLocale }).click();
    await page.waitForURL('**/en');
    expect(new URL(page.url()).pathname).toBe('/en');
    await expect(page.getByRole('heading', { name: EN.questions.liability })).toBeVisible();
  });

  test('validates and answers in the non-default locale end to end', async ({ page }) => {
    await page.goto('/de');

    await choose(page, DE.questions.liability, DE.options.no);
    await choose(page, DE.questions.casco, DE.options.no);
    await choose(page, DE.questions.licensePlateType, DE.options.singlePlate);
    await page.getByRole('button', { name: DE.submit }).click();

    await expect(page.getByRole('heading', { name: DE.summary })).toBeVisible();
    // The summary is the server's own wording, read back from its walk of the
    // flow, so seeing German here means the locale reached the API and the flow
    // data carried the translation.
    await expect(page.locator('dl dt', { hasText: DE.questions.liability })).toBeVisible();
    await expect(page.locator('dl dd', { hasText: DE.options.singlePlate })).toBeVisible();
  });

  test('reports a rejected submission in the page language', async ({ page }) => {
    await page.route('**/api/conversation*', (route) =>
      route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'invalid_path' }),
      }),
    );
    await page.goto('/de');

    await choose(page, DE.questions.liability, DE.options.no);
    await choose(page, DE.questions.casco, DE.options.no);
    await choose(page, DE.questions.licensePlateType, DE.options.singlePlate);
    await page.getByRole('button', { name: DE.submit }).click();

    // The failure code is language-neutral on the wire; the sentence is not.
    // Scoped by its own heading: Next mounts a role=alert route announcer too.
    await expect(page.getByRole('alert').filter({ hasText: DE.error })).toContainText(
      'Die Angaben passen nicht zum Gesprächsverlauf.',
    );
  });
});

test.describe('discoverability', () => {
  test('declares each locale as an alternate, and itself as canonical', async ({ page }) => {
    // Two URLs serving the same page in different languages is exactly the case
    // hreflang exists for; without it a crawler treats them as near-duplicates
    // and picks one.
    await page.goto('/de');

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', '/de');
    await expect(page.locator('link[rel="alternate"][hreflang="de"]')).toHaveAttribute(
      'href',
      '/de',
    );
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
      'href',
      '/en',
    );
  });

  test('points x-default at the locale a crawler would actually be served', async ({ page }) => {
    // x-default is for a visitor whose language matches neither, and it has to
    // agree with what the proxy negotiates for them, which is the default.
    await page.goto('/en');

    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
      'href',
      '/en',
    );
  });

  test('titles each locale in its own language', async ({ page }) => {
    await page.goto('/en');
    await expect(page).toHaveTitle(EN.title);

    await page.goto('/de');
    await expect(page).toHaveTitle(DE.title);
  });
});
