import { expect, test } from '@playwright/test';

import { choose, completeFlow, QUESTIONS, toggleColorScheme } from './helpers';

/**
 * Visual regression. Rendering is environment-specific, so these run only on
 * Chromium and are executed in a pinned Playwright container (see the visual
 * workflow) rather than in the main CI gate. Regenerate baselines with
 * `pnpm test:visual --update-snapshots` in that same container.
 */
test.describe('visual regression @visual', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'baselines are Chromium-only');

  const options = { fullPage: true, maxDiffPixelRatio: 0.05 } as const;

  test('initial page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page).toHaveScreenshot('initial.png', options);
  });

  test('mid conversation', async ({ page }) => {
    await page.goto('/');
    await choose(page, QUESTIONS.liability, 'Ja');
    await choose(page, QUESTIONS.casco, 'Ja');
    await expect(page.getByRole('heading', { name: QUESTIONS.cascoType })).toBeVisible();
    await expect(page).toHaveScreenshot('mid-conversation.png', options);
  });

  test('completed conversation', async ({ page }) => {
    await page.goto('/');
    await completeFlow(page);
    await expect(page).toHaveScreenshot('completed.png', options);
  });

  test('light colour scheme', async ({ page }) => {
    await page.goto('/');
    await toggleColorScheme(page);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page).toHaveScreenshot('light.png', options);
  });

  test('reset confirmation dialog', async ({ page }) => {
    await page.goto('/');
    await choose(page, QUESTIONS.liability, 'Ja');
    await page.getByRole('button', { name: 'Neu starten' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page).toHaveScreenshot('reset-dialog.png', options);
  });
});

test.describe('forced-colors @visual', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'forced-colors emulation is Chromium-only',
  );

  const options = { fullPage: true, maxDiffPixelRatio: 0.05 } as const;

  test('initial page', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page).toHaveScreenshot('forced-colors-initial.png', options);
  });

  test('selected option', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('/');
    await choose(page, QUESTIONS.liability, 'Ja');
    await expect(page.getByRole('heading', { name: QUESTIONS.casco })).toBeVisible();
    await expect(page).toHaveScreenshot('forced-colors-selected.png', options);
  });
});
