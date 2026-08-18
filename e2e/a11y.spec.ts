import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { completeFlow, toggleColorScheme } from './helpers';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

test.describe('accessibility', () => {
  test('the initial page has no detectable violations', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });

  test('a completed conversation has no detectable violations', async ({ page }) => {
    await page.goto('/');
    await completeFlow(page);

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });

  test('the light colour scheme has no detectable violations', async ({ page }) => {
    await page.goto('/');
    await toggleColorScheme(page);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });
});
