import { describe, expect, it } from 'vitest';

import type { Submission } from '@/lib/schema/answer';

import { POST } from './route';

function postRequest(body: string) {
  return new Request('http://localhost/api/conversation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

function post(body: unknown) {
  return POST(postRequest(JSON.stringify(body)));
}

const validPath: Submission = [
  { name: 'liability', value: false },
  { name: 'casco', value: false },
  { name: 'licensePlateType', value: 'ekz' },
];

describe('POST /api/conversation', () => {
  it('accepts a complete path and echoes the resolved configuration', async () => {
    const response = await post(validPath);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'accepted',
      configuration: [
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
      ],
    });
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
