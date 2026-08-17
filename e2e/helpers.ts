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

/** Walks the flow to completion and waits for the thank-you message. */
export async function completeFlow(page: Page) {
  await choose(page, QUESTIONS.liability, 'Nein');
  await choose(page, QUESTIONS.casco, 'Nein');
  await choose(page, QUESTIONS.licensePlate, 'Einzelkennzeichen');
  await expect(page.getByText('Herzlichen Dank für Ihre Angaben!')).toBeVisible();
}
