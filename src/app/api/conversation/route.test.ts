import { describe, expect, it } from 'vitest';

import { POST } from './route';

function postRequest(body: string) {
  return new Request('http://localhost/api/conversation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

describe('POST /api/conversation', () => {
  it('accepts a valid submission', async () => {
    const response = await POST(postRequest(JSON.stringify([{ name: 'liability', value: true }])));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: 'ok', received: 1 });
  });

  it('rejects malformed JSON with 400', async () => {
    const response = await POST(postRequest('not-json'));
    expect(response.status).toBe(400);
  });

  it('rejects an invalid submission with 422', async () => {
    const response = await POST(postRequest(JSON.stringify([{ name: '', value: null }])));
    expect(response.status).toBe(422);
  });

  it('rejects an empty submission with 422', async () => {
    const response = await POST(postRequest(JSON.stringify([])));
    expect(response.status).toBe(422);
  });
});
