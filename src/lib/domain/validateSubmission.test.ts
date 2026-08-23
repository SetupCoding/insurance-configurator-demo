import { describe, expect, it } from 'vitest';

import { getFlow } from '@/lib/data/flow';
import type { Submission } from '@/lib/schema/answer';

import { validateSubmission } from './validateSubmission';

const flow = getFlow();

/** The shortest valid path: no liability, no casco, single licence plate. */
const shortPath: Submission = [
  { name: 'liability', value: false },
  { name: 'casco', value: false },
  { name: 'licensePlateType', value: 'ekz' },
];

/** The longest valid path, exercising every step of the flow. */
const longPath: Submission = [
  { name: 'liability', value: true },
  { name: 'casco', value: true },
  { name: 'cascoType', value: 'full' },
  { name: 'licensePlateType', value: 'wkz' },
  { name: 'vehicles', value: 2 },
];

function detailOf(answers: Submission): string {
  const result = validateSubmission(flow, answers);
  return result.ok ? '' : result.detail;
}

describe('validateSubmission', () => {
  it('accepts the shortest valid path', () => {
    const result = validateSubmission(flow, shortPath);
    expect(result.ok).toBe(true);
  });

  it('accepts the longest valid path', () => {
    const result = validateSubmission(flow, longPath);
    expect(result.ok).toBe(true);
  });

  it('resolves each answer back to the question and option wording', () => {
    const result = validateSubmission(flow, shortPath);
    expect(result.ok && result.configuration).toEqual([
      {
        name: 'liability',
        question: 'Benötigen Sie eine Haftpflichtversicherung?',
        value: false,
        label: 'Nein',
      },
      { name: 'casco', question: 'Benötigen Sie eine Kasko?', value: false, label: 'Nein' },
      {
        name: 'licensePlateType',
        question: 'Welche Kennzeichenart benötigen Sie?',
        value: 'ekz',
        label: 'Einzelkennzeichen',
      },
    ]);
  });

  it('rejects an answer to a question the flow never asked', () => {
    const answers: Submission = [{ name: 'premium', value: true }, ...shortPath.slice(1)];
    expect(detailOf(answers)).toBe('Answer 0 must be "liability", got "premium".');
  });

  it('rejects a repeated answer', () => {
    const answers: Submission = [shortPath[0], shortPath[0], ...shortPath.slice(1)];
    expect(detailOf(answers)).toBe('Answer 1 must be "casco", got "liability".');
  });

  it('rejects answers given in the wrong order', () => {
    const answers: Submission = [shortPath[1], shortPath[0], shortPath[2]];
    expect(detailOf(answers)).toBe('Answer 0 must be "liability", got "casco".');
  });

  it('rejects a value that the step never offered', () => {
    const answers: Submission = [
      { name: 'liability', value: false },
      { name: 'casco', value: false },
      { name: 'licensePlateType', value: 'moped' },
    ];
    expect(detailOf(answers)).toBe('"moped" is not an option of "licensePlateType".');
  });

  it('rejects a value of the right shape but the wrong type', () => {
    // "false" passes submissionSchema (a string is a valid option value) but
    // the liability step only ever offered the booleans true and false.
    const answers: Submission = [{ name: 'liability', value: 'false' }];
    expect(detailOf(answers)).toBe('"false" is not an option of "liability".');
  });

  it('rejects a path that stops before the end', () => {
    const answers: Submission = shortPath.slice(0, 2);
    expect(detailOf(answers)).toBe('The path stops early: "licensePlateType" is unanswered.');
  });

  it('rejects a skipped question', () => {
    const answers: Submission = [shortPath[0], shortPath[2]];
    expect(detailOf(answers)).toBe('Answer 1 must be "casco", got "licensePlateType".');
  });

  it('rejects answers appended past the end of the flow', () => {
    const answers: Submission = [...shortPath, { name: 'vehicles', value: 2 }];
    expect(detailOf(answers)).toBe('Answer 3 ("vehicles") continues a finished path.');
  });

  it('rejects a branch that the earlier answers ruled out', () => {
    // Answering "Nein" to casco skips cascoType entirely, so an answer to it
    // is unreachable however plausible it looks on its own.
    const answers: Submission = [
      { name: 'liability', value: false },
      { name: 'casco', value: false },
      { name: 'cascoType', value: 'full' },
    ];
    expect(detailOf(answers)).toBe('Answer 2 must be "licensePlateType", got "cascoType".');
  });
});
