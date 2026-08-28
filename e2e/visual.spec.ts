import { expect, test } from '@playwright/test';

import {
  answerFlow,
  choose,
  completeFlow,
  COPY,
  LOCALES,
  scrollToTop,
  toggleColorScheme,
} from './helpers';

/**
 * Visual regression. Rendering is environment-specific, so these run only on
 * Chromium and are executed in a pinned Playwright container (see the visual
 * workflow) rather than in the main CI gate. Regenerate baselines with
 * `pnpm test:visual --update-snapshots` in that same container.
 *
 * The tolerance is the global 2% from playwright.config.ts. These used to allow
 * 5% each, which is enough to hide a whole control changing.
 *
 * Every snapshot goes through scrollToTop first. Answering a question scrolls
 * the next one into view, and a scrolled page captured with fullPage renders
 * the fixed background displaced; see the helper for why.
 *
 * Both locales are captured, and the locale is in every snapshot name. German
 * compounds are longer than their English equivalents ("Haftpflichtversicherung"
 * against "liability insurance"), so the two languages wrap differently and a
 * layout that survives one is not evidence about the other. That is worth most
 * on the narrow viewport, where the difference decides how many lines a heading
 * takes. The cost is that every baseline exists twice and has to be reviewed
 * twice.
 */
const options = { fullPage: true } as const;

for (const locale of LOCALES) {
  const copy = COPY[locale];

  test.describe(`visual regression ${locale} @visual`, () => {
    test.skip(({ browserName }) => browserName !== 'chromium', 'baselines are Chromium-only');

    test('initial page', async ({ page }) => {
      await page.goto(`/${locale}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await scrollToTop(page);
      await expect(page).toHaveScreenshot(`initial-${locale}.png`, options);
    });

    test('mid conversation', async ({ page }) => {
      await page.goto(`/${locale}`);
      await choose(page, copy.questions.liability, copy.options.yes);
      await choose(page, copy.questions.casco, copy.options.yes);
      await expect(page.getByRole('heading', { name: copy.questions.cascoType })).toBeVisible();
      await scrollToTop(page);
      await expect(page).toHaveScreenshot(`mid-conversation-${locale}.png`, options);
    });

    test('completed conversation', async ({ page }) => {
      await page.goto(`/${locale}`);
      await completeFlow(page, locale);
      await scrollToTop(page);
      await expect(page).toHaveScreenshot(`completed-${locale}.png`, options);
    });

    test('failed submission', async ({ page }) => {
      // The bad case is a layout in its own right: a heading, the reason the
      // server gave, and a destructive-coloured retry. Nothing else captures it,
      // and it is the state a user is most likely to be reading carefully.
      await page.route('**/api/conversation*', (route) =>
        route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'invalid_path' }),
        }),
      );
      await page.goto(`/${locale}`);
      await answerFlow(page, locale);
      await page.getByRole('button', { name: copy.submit }).click();
      // Scoped by its own heading: Next mounts a role=alert route announcer too.
      await expect(page.getByRole('alert').filter({ hasText: copy.error })).toBeVisible();
      await scrollToTop(page);
      await expect(page).toHaveScreenshot(`error-${locale}.png`, options);
    });

    test('light colour scheme', async ({ page }) => {
      await page.goto(`/${locale}`);
      await toggleColorScheme(page, locale);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await scrollToTop(page);
      await expect(page).toHaveScreenshot(`light-${locale}.png`, options);
    });

    test('reset confirmation dialog', async ({ page }) => {
      await page.goto(`/${locale}`);
      await choose(page, copy.questions.liability, copy.options.yes);
      await page.getByRole('button', { name: copy.reset }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      // No scrollToTop here: one answer does not make the page scroll, and an
      // open modal <dialog> blocks scrolling anyway.
      await expect(page).toHaveScreenshot(`reset-dialog-${locale}.png`, options);
    });

    test('narrow viewport', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 700 });
      await page.goto(`/${locale}`);
      await choose(page, copy.questions.liability, copy.options.yes);
      await choose(page, copy.questions.casco, copy.options.yes);
      await expect(page.getByRole('heading', { name: copy.questions.cascoType })).toBeVisible();
      await scrollToTop(page);
      await expect(page).toHaveScreenshot(`narrow-viewport-${locale}.png`, options);
    });
  });

  test.describe(`forced-colors ${locale} @visual`, () => {
    test.skip(
      ({ browserName }) => browserName !== 'chromium',
      'forced-colors emulation is Chromium-only',
    );

    test('initial page', async ({ page }) => {
      await page.emulateMedia({ forcedColors: 'active' });
      await page.goto(`/${locale}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await scrollToTop(page);
      await expect(page).toHaveScreenshot(`forced-colors-initial-${locale}.png`, options);
    });

    test('selected option', async ({ page }) => {
      await page.emulateMedia({ forcedColors: 'active' });
      await page.goto(`/${locale}`);
      await choose(page, copy.questions.liability, copy.options.yes);
      await expect(page.getByRole('heading', { name: copy.questions.casco })).toBeVisible();
      await scrollToTop(page);
      await expect(page).toHaveScreenshot(`forced-colors-selected-${locale}.png`, options);
    });
  });
}
