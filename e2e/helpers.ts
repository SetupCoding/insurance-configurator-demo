import { expect, type Page } from '@playwright/test';

export const QUESTIONS = {
  liability: 'Benötigen Sie eine Haftpflichtversicherung?',
  casco: 'Benötigen Sie eine Kasko?',
  cascoType: 'Welche Art von Kasko benötigen Sie?',
  licensePlate: 'Welche Kennzeichenart benötigen Sie?',
} as const;

/** Clicks an option inside the question identified by its group label. */
export async function choose(page: Page, question: string, option: string) {
  await page.getByRole('group', { name: question }).getByRole('button', { name: option }).click();
}

/** Answers every question along a fixed path. Does not submit. */
export async function answerFlow(page: Page) {
  await choose(page, QUESTIONS.liability, 'Nein');
  await choose(page, QUESTIONS.casco, 'Nein');
  await choose(page, QUESTIONS.licensePlate, 'Einzelkennzeichen');
}

/** Walks the flow to completion, submits it, and waits for the result. */
export async function completeFlow(page: Page) {
  await answerFlow(page);
  await page.getByRole('button', { name: 'Absenden' }).click();
  await expect(page.getByRole('heading', { name: 'Ihre Demo-Konfiguration' })).toBeVisible();
}

/** Switches the colour scheme via the toggle button (dark is the default). */
export async function toggleColorScheme(page: Page) {
  await page.getByRole('button', { name: /Design wechseln/ }).click();
  // Let the background-colour transition settle: axe can otherwise sample a
  // transient, low-contrast colour mid-transition, and a screenshot taken
  // here would be flaky.
  await page.waitForTimeout(250);
}

/**
 * Puts the page back at the top before a snapshot.
 *
 * A fullPage capture expands past the viewport, but a background with
 * `attachment: fixed` stays anchored at whatever the scroll offset happens to
 * be, so the background lands displaced by exactly that many pixels and the
 * image shows a hard seam no browser ever paints. Answering a question scrolls
 * the next one into view, which is why only the interactive snapshots were
 * affected.
 */
export async function scrollToTop(page: Page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
}
