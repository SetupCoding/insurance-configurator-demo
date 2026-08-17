import { http, HttpResponse } from 'msw';

/** Default mock: the conversation endpoint accepts the submission. */
export const handlers = [
  http.post('*/api/conversation', () => HttpResponse.json({ status: 'ok' }, { status: 200 })),
];
