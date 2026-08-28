import { http, HttpResponse } from 'msw';

/**
 * The wording the real route would resolve for the first step, per locale. Kept
 * here so the mock honours `?locale=` the way the route does, rather than
 * answering in German whatever was asked for.
 */
const FIRST_STEP = {
  de: { question: 'Benötigen Sie eine Haftpflichtversicherung?', label: 'Ja' },
  en: { question: 'Do you need liability insurance?', label: 'Yes' },
};

/**
 * Default mock: the conversation endpoint accepts the submission. The body
 * matches the real route's contract, which the client validates, so a mock
 * that drifts from it fails the test rather than passing a wrong shape on.
 */
export const handlers = [
  http.post('*/api/conversation', ({ request }) => {
    const requested = new URL(request.url).searchParams.get('locale');
    const locale = requested === 'de' ? 'de' : 'en';

    return HttpResponse.json({
      status: 'accepted',
      configuration: [{ name: 'liability', value: true, ...FIRST_STEP[locale] }],
    });
  }),
];
