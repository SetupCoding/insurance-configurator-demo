import { expect, type Page } from '@playwright/test';

/**
 * Every spec navigates to an explicit locale rather than to `/`.
 *
 * The proxy negotiates a bare path from Accept-Language, and Playwright's
 * browsers send en-US, so `/` would decide the language under test on the
 * browser's behalf. Negotiation itself has its own spec.
 */

export const LOCALES = ['en', 'de'] as const;

export type Locale = (typeof LOCALES)[number];

/**
 * Everything the specs need to say, in both languages.
 *
 * English first because it is the app's default locale. The German half is what
 * lets the visual and i18n specs assert the non-default language rather than
 * assuming a translation exists because a message file has a key for it.
 */
export const COPY = {
  en: {
    title: 'Insurance configurator',
    questions: {
      liability: 'Do you need liability insurance?',
      casco: 'Do you need collision damage insurance?',
      cascoType: 'Which kind of collision damage insurance do you need?',
      licensePlateType: 'Which kind of licence plate do you need?',
    },
    options: {
      yes: 'Yes',
      no: 'No',
      fullCasco: 'Full coverage',
      singlePlate: 'Single licence plate',
    },
    submit: 'Submit',
    summary: 'Your demo configuration',
    reset: 'Start over',
    cancel: 'Cancel',
    error: 'Something went wrong.',
    retry: 'Submit again',
    themeToggle: /Switch to the/,
    /** The language the switcher offers, which is the other one. */
    otherLocale: 'Deutsch',
  },
  de: {
    title: 'Versicherungs-Konfigurator',
    questions: {
      liability: 'Benötigen Sie eine Haftpflichtversicherung?',
      casco: 'Benötigen Sie eine Kasko?',
      cascoType: 'Welche Art von Kasko benötigen Sie?',
      licensePlateType: 'Welche Kennzeichenart benötigen Sie?',
    },
    options: {
      yes: 'Ja',
      no: 'Nein',
      fullCasco: 'Vollkasko',
      singlePlate: 'Einzelkennzeichen',
    },
    submit: 'Absenden',
    summary: 'Ihre Demo-Konfiguration',
    reset: 'Neu starten',
    cancel: 'Abbrechen',
    error: 'Ein Fehler ist aufgetreten.',
    retry: 'Erneut absenden',
    themeToggle: /Design wechseln/,
    otherLocale: 'English',
  },
} as const;

/** The default locale's questions, for the specs that only exercise that one. */
export const QUESTIONS = COPY.en.questions;

/** Clicks an option inside the question identified by its group label. */
export async function choose(page: Page, question: string, option: string) {
  await page.getByRole('group', { name: question }).getByRole('button', { name: option }).click();
}

/** Answers every question along a fixed path. Does not submit. */
export async function answerFlow(page: Page, locale: Locale = 'en') {
  const copy = COPY[locale];
  await choose(page, copy.questions.liability, copy.options.no);
  await choose(page, copy.questions.casco, copy.options.no);
  await choose(page, copy.questions.licensePlateType, copy.options.singlePlate);
}

/** Walks the flow to completion, submits it, and waits for the result. */
export async function completeFlow(page: Page, locale: Locale = 'en') {
  const copy = COPY[locale];
  await answerFlow(page, locale);
  await page.getByRole('button', { name: copy.submit }).click();
  await expect(page.getByRole('heading', { name: copy.summary })).toBeVisible();
}

/** Switches the colour scheme via the toggle button (dark is the default). */
export async function toggleColorScheme(page: Page, locale: Locale = 'en') {
  await page.getByRole('button', { name: COPY[locale].themeToggle }).click();
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
