import { expect, test } from '@playwright/test';

import { answerFlow, choose, completeFlow, COPY, QUESTIONS } from './helpers';

const EN = COPY.en;

test('shows the first question on load', async ({ page }) => {
  await page.goto('/en');

  await expect(page.getByRole('heading', { level: 1, name: EN.title })).toBeVisible();
  await expect(page.getByRole('heading', { name: QUESTIONS.liability })).toBeVisible();
  await expect(page.getByRole('heading', { name: QUESTIONS.casco })).toBeHidden();
});

test('does not submit until the submit button is clicked, and answers stay editable', async ({
  page,
}) => {
  await page.goto('/en');

  await answerFlow(page);

  await expect(page.getByRole('button', { name: EN.submit })).toBeVisible();
  await expect(page.getByRole('heading', { name: EN.summary })).toBeHidden();
  await expect(
    page
      .getByRole('group', { name: QUESTIONS.liability })
      .getByRole('button', { name: EN.options.yes }),
  ).toBeEnabled();
});

test('confirms before resetting the conversation', async ({ page }) => {
  await page.goto('/en');

  await choose(page, QUESTIONS.liability, EN.options.yes);
  await page.getByRole('button', { name: EN.reset }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // Cancelling leaves the conversation untouched.
  await dialog.getByRole('button', { name: EN.cancel }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { name: QUESTIONS.casco })).toBeVisible();

  // Confirming resets to the first question.
  await page.getByRole('button', { name: EN.reset }).click();
  await page.getByRole('dialog').getByRole('button', { name: EN.reset }).click();
  await expect(page.getByRole('heading', { name: QUESTIONS.casco })).toBeHidden();
});

test('walks through the flow to the validated configuration', async ({ page }) => {
  await page.goto('/en');

  await choose(page, QUESTIONS.liability, EN.options.yes);
  await choose(page, QUESTIONS.casco, EN.options.no);
  await choose(page, QUESTIONS.licensePlateType, EN.options.singlePlate);
  await page.getByRole('button', { name: EN.submit }).click();

  await expect(page.getByRole('heading', { name: EN.summary })).toBeVisible();
});

test('brings the result into view rather than adding it below the fold', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/en');

  // The longest path, so the conversation above the result is taller than the
  // viewport and the page genuinely has to move to show what came back.
  await choose(page, QUESTIONS.liability, EN.options.yes);
  await choose(page, QUESTIONS.casco, EN.options.yes);
  await choose(page, QUESTIONS.cascoType, EN.options.fullCasco);
  await choose(page, QUESTIONS.licensePlateType, EN.options.singlePlate);
  await page.getByRole('button', { name: EN.submit }).click();

  // Rendered is not the same as seen: the result has to be on screen from its
  // heading down to the button that follows it, with the keyboard there too.
  await expect(page.getByRole('heading', { name: EN.summary })).toBeInViewport();
  await expect(page.getByRole('button', { name: EN.reset })).toBeInViewport();
  await expect(page.getByRole('button', { name: EN.reset })).toBeFocused();
});

test('removes downstream steps when an earlier answer changes', async ({ page }) => {
  await page.goto('/en');

  await choose(page, QUESTIONS.liability, EN.options.yes);
  await choose(page, QUESTIONS.casco, EN.options.yes);
  await expect(page.getByRole('heading', { name: QUESTIONS.cascoType })).toBeVisible();

  await choose(page, QUESTIONS.casco, EN.options.no);
  await expect(page.getByRole('heading', { name: QUESTIONS.cascoType })).toBeHidden();
  await expect(page.getByRole('heading', { name: QUESTIONS.licensePlateType })).toBeVisible();
});

test('keeps downstream answers when the same option is clicked again', async ({ page }) => {
  await page.goto('/en');

  await choose(page, QUESTIONS.liability, EN.options.yes);
  await choose(page, QUESTIONS.casco, EN.options.yes);
  await choose(page, QUESTIONS.cascoType, EN.options.fullCasco);
  await expect(page.getByRole('heading', { name: QUESTIONS.licensePlateType })).toBeVisible();

  // Clicking an already-selected earlier answer decides nothing new, so the
  // questions it led to must stay.
  await choose(page, QUESTIONS.casco, EN.options.yes);
  await expect(page.getByRole('heading', { name: QUESTIONS.cascoType })).toBeVisible();
  await expect(page.getByRole('heading', { name: QUESTIONS.licensePlateType })).toBeVisible();
});

test('header does not overlap the title on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/en');

  // The header has a fixed min-height regardless of whether the reset
  // button is showing in it, so this holds whether or not one has answered.
  const headerBox = (await page.locator('header').boundingBox())!;
  const titleBox = (await page.getByRole('heading', { level: 1 }).boundingBox())!;
  expect(titleBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height);
});

test('has no horizontal overflow on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  // The one German test in this file, on purpose. This guards against long,
  // unbroken compound words overflowing ("Haftpflichtversicherung",
  // "Wechselkennzeichen"), and English has nothing of that length to break on,
  // so running it in the default locale would assert almost nothing.
  await page.goto('/de');

  const de = COPY.de;
  await choose(page, de.questions.liability, de.options.yes);
  await choose(page, de.questions.casco, de.options.yes);
  await choose(page, de.questions.cascoType, de.options.fullCasco);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(overflow).toBeLessThanOrEqual(320);
});

test('keeps unanswered progress across a reload', async ({ page }) => {
  await page.goto('/en');
  await choose(page, QUESTIONS.liability, EN.options.yes);

  await page.reload();

  await expect(page.getByRole('heading', { name: QUESTIONS.casco })).toBeVisible();
});

test('starts a fresh conversation after reloading a submitted one', async ({ page }) => {
  await page.goto('/en');
  await completeFlow(page);

  await page.reload();

  // The submitted answers are gone from storage, so the reload cannot restore
  // a finished conversation that offers to submit itself again.
  await expect(page.getByRole('heading', { name: QUESTIONS.liability })).toBeVisible();
  await expect(page.getByRole('heading', { name: QUESTIONS.casco })).toBeHidden();
  await expect(page.getByRole('button', { name: EN.submit })).toBeHidden();
  await expect(page.getByRole('heading', { name: EN.summary })).toBeHidden();
});

test('shows an error and recovers when submission fails then succeeds', async ({ page }) => {
  // Fail the first submission.
  await page.route('**/api/conversation*', (route) => route.fulfill({ status: 500 }));
  await page.goto('/en');

  await choose(page, QUESTIONS.liability, EN.options.no);
  await choose(page, QUESTIONS.casco, EN.options.no);
  await choose(page, QUESTIONS.licensePlateType, EN.options.singlePlate);
  await page.getByRole('button', { name: EN.submit }).click();

  await expect(page.getByText(EN.error)).toBeVisible();

  // Make the endpoint healthy and retry.
  await page.unroute('**/api/conversation*');
  await page.getByRole('button', { name: EN.retry }).click();

  await expect(page.getByRole('heading', { name: EN.summary })).toBeVisible();
});
