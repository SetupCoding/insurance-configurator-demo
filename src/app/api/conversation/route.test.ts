import { describe, expect, it } from 'vitest';

import type { Submission } from '@/lib/schema/answer';

import { POST } from './route';

function postRequest(body: string, locale?: string) {
  const url = new URL('http://localhost/api/conversation');
  if (locale !== undefined) url.searchParams.set('locale', locale);

  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

function post(body: unknown, locale?: string) {
  return POST(postRequest(JSON.stringify(body), locale));
}

const validPath: Submission = [
  { name: 'liability', value: false },
  { name: 'casco', value: false },
  { name: 'licensePlateType', value: 'ekz' },
];

describe('POST /api/conversation', () => {
  it('accepts a complete path and echoes the resolved configuration', async () => {
    // No locale on the query string, so the reply comes back in the default one.
    const response = await post(validPath);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'accepted',
      configuration: [
        {
          name: 'liability',
          question: 'Do you need liability insurance?',
          value: false,
          label: 'No',
        },
        {
          name: 'casco',
          question: 'Do you need collision damage insurance?',
          value: false,
          label: 'No',
        },
        {
          name: 'licensePlateType',
          question: 'Which kind of licence plate do you need?',
          value: 'ekz',
          label: 'Single licence plate',
        },
      ],
    });
  });

  it('answers in the locale the query string asked for', async () => {
    const response = await post(validPath, 'de');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      configuration: [
        {
          name: 'liability',
          question: 'Benötigen Sie eine Haftpflichtversicherung?',
          label: 'Nein',
        },
        { name: 'casco', question: 'Benötigen Sie eine Kasko?', label: 'Nein' },
        {
          name: 'licensePlateType',
          question: 'Welche Kennzeichenart benötigen Sie?',
          label: 'Einzelkennzeichen',
        },
      ],
    });
  });

  it('accepts the same path whatever the locale', async () => {
    // The walk is language-neutral, so the locale decides the wording of the
    // reply and never whether the submission is valid.
    for (const locale of [undefined, 'de', 'en']) {
      expect((await post(validPath, locale)).status).toBe(200);
    }
  });

  it('rejects a locale it does not ship with 422', async () => {
    const response = await post(validPath, 'fr');

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ error: 'unsupported_locale' });
  });

  it('rejects an unknown locale before it buffers the body', async () => {
    // An oversized body would otherwise be reported as payload_too_large, so
    // getting unsupported_locale back is what proves the order.
    const response = await POST(postRequest(`[${'"x",'.repeat(5_000)}"x"]`, 'fr'));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ error: 'unsupported_locale' });
  });

  it('rejects malformed JSON with 400', async () => {
    const response = await POST(postRequest('not-json'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'malformed_json' });
  });

  it('rejects a body that is not a submission with 422', async () => {
    const response = await post([{ name: '', value: null }]);

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ error: 'invalid_submission' });
  });

  it('rejects an empty submission with 422', async () => {
    const response = await post([]);

    expect(response.status).toBe(422);
  });

  it('rejects a well-formed payload that is not a path through the flow', async () => {
    const response = await post([{ name: 'liability', value: false }]);

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: 'invalid_path' });
  });

  it('rejects an answer the flow never offered', async () => {
    const response = await post([{ name: 'premium', value: 999 }]);

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: 'invalid_path' });
  });

  it('rejects an oversized body with 413 without parsing it', async () => {
    const response = await POST(postRequest(`[${'"x",'.repeat(5_000)}"x"]`));

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ error: 'payload_too_large' });
  });
});
