import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { Answer } from '@/features/flow/types';
import { server } from '@/lib/mocks/server';

import { SubmissionError, submitConversation } from './submitConversation';

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

/** The failure code a rejection carried, or the raw cause if it was not ours. */
async function codeOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
    return 'resolved';
  } catch (cause) {
    return cause instanceof SubmissionError ? cause.code : cause;
  }
}

describe('submitConversation', () => {
  it('returns the configuration from an accepted response', async () => {
    server.use(http.post('*/api/conversation', () => HttpResponse.json(ACCEPTED)));

    await expect(submitConversation(answers, 'de')).resolves.toEqual(ACCEPTED.configuration);
  });

  it('sends the locale on the query string', async () => {
    // The server resolves the reply's wording, so a locale the client forgets
    // to send is a bug that shows up as German text in an English UI.
    let requested: string | null = null;
    server.use(
      http.post('*/api/conversation', ({ request }) => {
        requested = new URL(request.url).searchParams.get('locale');
        return HttpResponse.json(ACCEPTED);
      }),
    );

    await submitConversation(answers, 'en');
    expect(requested).toBe('en');
  });

  it('reports the failure code the server sent', async () => {
    server.use(
      http.post('*/api/conversation', () =>
        HttpResponse.json({ error: 'invalid_path' }, { status: 422 }),
      ),
    );

    await expect(codeOf(submitConversation(answers, 'de'))).resolves.toBe('invalid_path');
  });

  it('reports unexpected_response when the error body is not one of ours', async () => {
    server.use(
      http.post('*/api/conversation', () => HttpResponse.text('gateway down', { status: 502 })),
    );

    await expect(codeOf(submitConversation(answers, 'de'))).resolves.toBe('unexpected_response');
  });

  it('reports unexpected_response for a 2xx whose shape does not match the contract', async () => {
    server.use(http.post('*/api/conversation', () => HttpResponse.json({ status: 'ok' })));

    await expect(codeOf(submitConversation(answers, 'de'))).resolves.toBe('unexpected_response');
  });

  it('reports transport when the request never reaches a server', async () => {
    server.use(http.post('*/api/conversation', () => HttpResponse.error()));

    await expect(codeOf(submitConversation(answers, 'de'))).resolves.toBe('transport');
  });

  it('rethrows an abort unchanged rather than reporting it as a failure', async () => {
    // The caller aborted on purpose and drops the result, so turning this into
    // a SubmissionError would put a message on screen for something the user
    // asked for.
    const controller = new AbortController();
    server.use(
      http.post('*/api/conversation', async () => {
        controller.abort();
        return HttpResponse.json(ACCEPTED);
      }),
    );

    const cause = await codeOf(submitConversation(answers, 'de', controller.signal));
    expect(cause).toBeInstanceOf(Error);
    expect((cause as Error).name).toBe('AbortError');
  });
});
