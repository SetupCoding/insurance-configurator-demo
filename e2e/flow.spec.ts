import { expect, test } from '@playwright/test';

import { choose, QUESTIONS } from './helpers';

test('shows the first question on load', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'Versicherungs-Helfer' })).toBeVisible();
  await expect(page.getByRole('heading', { name: QUESTIONS.liability })).toBeVisible();
  await expect(page.getByRole('heading', { name: QUESTIONS.casco })).toBeHidden();
});

test('walks through the flow to a thank-you message', async ({ page }) => {
  await page.goto('/');

  await choose(page, QUESTIONS.liability, 'Ja');
  await choose(page, QUESTIONS.casco, 'Nein');
  await choose(page, QUESTIONS.licensePlate, 'Einzelkennzeichen');

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

test('shows an error and recovers when submission fails then succeeds', async ({ page }) => {
  // Fail the first submission.
  await page.route('**/api/conversation', (route) => route.fulfill({ status: 500 }));
  await page.goto('/');

  await choose(page, QUESTIONS.liability, 'Nein');
  await choose(page, QUESTIONS.casco, 'Nein');
  await choose(page, QUESTIONS.licensePlate, 'Einzelkennzeichen');

  await expect(page.getByText('Ein Fehler ist aufgetreten.')).toBeVisible();

  // Make the endpoint healthy and retry.
  await page.unroute('**/api/conversation');
  await page.getByRole('button', { name: 'Erneut absenden' }).click();

  await expect(page.getByText('Herzlichen Dank für Ihre Angaben!')).toBeVisible();
});
