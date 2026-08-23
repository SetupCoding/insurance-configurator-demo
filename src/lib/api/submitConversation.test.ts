import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { Answer } from '@/features/flow/types';
import { server } from '@/lib/mocks/server';

import { submitConversation } from './submitConversation';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const answers: Answer[] = [{ name: 'liability', value: true }];

const ACCEPTED = {
  status: 'accepted',
  configuration: [
    {
      name: 'liability',
      question: 'Benötigen Sie eine Haftpflichtversicherung?',
      value: true,
      label: 'Ja',
    },
  ],
};

describe('submitConversation', () => {
  it('returns the configuration from an accepted response', async () => {
    server.use(http.post('*/api/conversation', () => HttpResponse.json(ACCEPTED)));

    await expect(submitConversation(answers)).resolves.toEqual(ACCEPTED.configuration);
  });

  it('translates a known failure code into German', async () => {
    server.use(
      http.post('*/api/conversation', () =>
        HttpResponse.json({ error: 'invalid_path' }, { status: 422 }),
      ),
    );

    await expect(submitConversation(answers)).rejects.toThrow(/passen nicht zum Gesprächsverlauf/);
  });

  it('falls back to the status code when the error body is not one of ours', async () => {
    server.use(
      http.post('*/api/conversation', () => HttpResponse.text('gateway down', { status: 502 })),
    );

    await expect(submitConversation(answers)).rejects.toThrow(/Status 502/);
  });

  it('rejects a 2xx response whose shape does not match the contract', async () => {
    server.use(http.post('*/api/conversation', () => HttpResponse.json({ status: 'ok' })));

    await expect(submitConversation(answers)).rejects.toThrow(/unerwartet aufgebaut/);
  });

  it('rejects when the request is aborted', async () => {
    const controller = new AbortController();
    server.use(
      http.post('*/api/conversation', async () => {
        controller.abort();
        return HttpResponse.json(ACCEPTED);
      }),
    );

    await expect(submitConversation(answers, controller.signal)).rejects.toThrow();
  });
});
