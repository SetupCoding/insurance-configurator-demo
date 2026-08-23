import { expect, test } from '@playwright/test';

import { answerFlow, choose, QUESTIONS } from './helpers';

test('shows the first question on load', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'Versicherungs-Helfer' })).toBeVisible();
  await expect(page.getByRole('heading', { name: QUESTIONS.liability })).toBeVisible();
  await expect(page.getByRole('heading', { name: QUESTIONS.casco })).toBeHidden();
});

test('does not submit until "Absenden" is clicked, and answers stay editable', async ({ page }) => {
  await page.goto('/');

  await answerFlow(page);

  await expect(page.getByRole('button', { name: 'Absenden' })).toBeVisible();
  await expect(page.getByText('Herzlichen Dank für Ihre Angaben!')).toBeHidden();
  await expect(
    page.getByRole('group', { name: QUESTIONS.liability }).getByRole('button', { name: 'Ja' }),
  ).toBeEnabled();
});

test('confirms before resetting the conversation', async ({ page }) => {
  await page.goto('/');

  await choose(page, QUESTIONS.liability, 'Ja');
  await page.getByRole('button', { name: 'Neu starten' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // Cancelling leaves the conversation untouched.
  await dialog.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { name: QUESTIONS.casco })).toBeVisible();

  // Confirming resets to the first question.
  await page.getByRole('button', { name: 'Neu starten' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Neu starten' }).click();
  await expect(page.getByRole('heading', { name: QUESTIONS.casco })).toBeHidden();
});

test('walks through the flow to a thank-you message', async ({ page }) => {
  await page.goto('/');

  await choose(page, QUESTIONS.liability, 'Ja');
  await choose(page, QUESTIONS.casco, 'Nein');
  await choose(page, QUESTIONS.licensePlate, 'Einzelkennzeichen');
  await page.getByRole('button', { name: 'Absenden' }).click();

  await expect(page.getByText('Herzlichen Dank für Ihre Angaben!')).toBeVisible();
});

test('removes downstream steps when an earlier answer changes', async ({ page }) => {
  await page.goto('/');

  await choose(page, QUESTIONS.liability, 'Ja');
  await choose(page, QUESTIONS.casco, 'Ja');
  await expect(page.getByRole('heading', { name: QUESTIONS.cascoType })).toBeVisible();

  // Change the second answer: the casco-type question must disappear.
  await choose(page, QUESTIONS.casco, 'Nein');
  await expect(page.getByRole('heading', { name: QUESTIONS.cascoType })).toBeHidden();
  await expect(page.getByRole('heading', { name: QUESTIONS.licensePlate })).toBeVisible();
});

test('header does not overlap the title on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/');

  // The header has a fixed min-height regardless of whether the reset
  // button is showing in it, so this holds whether or not one has answered.
  const headerBox = (await page.locator('header').boundingBox())!;
  const titleBox = (await page.getByRole('heading', { level: 1 }).boundingBox())!;
  expect(titleBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height);
});

test('has no horizontal overflow on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/');

  // Long, unbroken German compound words (as headings and button labels)
  // must wrap instead of overflowing.
  await choose(page, QUESTIONS.liability, 'Ja');
  await choose(page, QUESTIONS.casco, 'Ja');
  await choose(page, QUESTIONS.cascoType, 'Vollkasko');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(overflow).toBeLessThanOrEqual(320);
});

test('shows an error and recovers when submission fails then succeeds', async ({ page }) => {
  // Fail the first submission.
  await page.route('**/api/conversation', (route) => route.fulfill({ status: 500 }));
  await page.goto('/');

  await choose(page, QUESTIONS.liability, 'Nein');
  await choose(page, QUESTIONS.casco, 'Nein');
  await choose(page, QUESTIONS.licensePlate, 'Einzelkennzeichen');
  await page.getByRole('button', { name: 'Absenden' }).click();

  await expect(page.getByText('Ein Fehler ist aufgetreten.')).toBeVisible();

  // Make the endpoint healthy and retry.
  await page.unroute('**/api/conversation');
  await page.getByRole('button', { name: 'Erneut absenden' }).click();

  await expect(page.getByText('Herzlichen Dank für Ihre Angaben!')).toBeVisible();
});
