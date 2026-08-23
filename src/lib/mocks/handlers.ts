import { http, HttpResponse } from 'msw';

/**
 * Default mock: the conversation endpoint accepts the submission. The body
 * matches the real route's contract, which the client validates, so a mock
 * that drifts from it fails the test rather than passing a wrong shape on.
 */
export const handlers = [
  http.post('*/api/conversation', () =>
    HttpResponse.json({
      status: 'accepted',
      configuration: [
        {
          name: 'liability',
          question: 'Benötigen Sie eine Haftpflichtversicherung?',
          value: true,
          label: 'Ja',
        },
      ],
    }),
  ),
];
