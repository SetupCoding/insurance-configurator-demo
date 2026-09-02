import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, onTestFinished, vi } from 'vitest';

import { getFlow } from '@/lib/data/flow';
import { localizeFlow } from '@/lib/domain/localizeFlow';
import { server } from '@/lib/mocks/server';
import { fireEvent, renderWithTheme, screen, waitFor, within } from '@/test/render';

import { InsuranceChat } from './InsuranceChat';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Resolved on the server in the real app, so the component only ever sees
// one locale of wording.
const flow = localizeFlow(getFlow(), 'en');

const ACCEPTED = {
  status: 'accepted',
  configuration: [
    {
      name: 'liability',
      question: 'Do you need liability insurance?',
      value: true,
      label: 'Yes',
    },
  ],
};

/**
 * A request the test holds open by hand. Timing out a fixed delay against the
 * test's own progress is the kind of race that only fails on a slow machine, so
 * anything that has to observe an in-flight request waits on this instead.
 */
function gate() {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { held, release };
}

/** Selects an option within the question identified by its heading/group label. */
async function choose(stepText: string, optionName: string) {
  const group = screen.getByRole('group', { name: stepText });
  await userEvent.click(within(group).getByRole('button', { name: optionName }));
}

/** Walks the flow to completion along a fixed path. Does not submit. */
async function completeFlow() {
  await choose('Do you need liability insurance?', 'Yes');
  await choose('Do you need collision damage insurance?', 'Yes');
  await choose('Which kind of collision damage insurance do you need?', 'Full coverage');
  await choose('Which kind of licence plate do you need?', 'Single licence plate');
}

/** Walks the flow to completion and submits it. */
async function submitFlow() {
  await completeFlow();
  await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
}

/**
 * jsdom has no layout, so what can be observed about a scroll is the call and
 * the element it was made on. Which element is the point here: scrolling the
 * button into view is not the same as scrolling the block it belongs to.
 */
function watchScrollIntoView() {
  const spy = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
  onTestFinished(() => spy.mockRestore());
  return spy;
}

describe('InsuranceChat', () => {
  it('does not submit automatically once every question is answered', async () => {
    renderWithTheme(<InsuranceChat flow={flow} locale="en" />);

    await completeFlow();

    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Your demo configuration' }),
    ).not.toBeInTheDocument();
  });

  it('submits the answers and shows the configuration the server validated', async () => {
    renderWithTheme(<InsuranceChat flow={flow} locale="en" />);

    await submitFlow();

    expect(
      await screen.findByRole('heading', { name: 'Your demo configuration' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
  });

  it('renders the configuration from the response, not from local state', async () => {
    server.use(
      http.post('*/api/conversation', () =>
        HttpResponse.json({
          status: 'accepted',
          configuration: [
            {
              name: 'liability',
              question: 'Question from the server',
              value: true,
              label: 'Answer from the server',
            },
          ],
        }),
      ),
    );

    renderWithTheme(<InsuranceChat flow={flow} locale="en" />);
    await submitFlow();

    // The server is the authority on what was accepted, so the summary has
    // to show its wording even where it differs from the local answers.
    expect(await screen.findByText('Question from the server')).toBeInTheDocument();
    expect(screen.getByText('Answer from the server')).toBeInTheDocument();
  });

  it('marks the submit button busy and locks earlier answers while in flight', async () => {
    const request = gate();
    server.use(
      http.post('*/api/conversation', async () => {
        await request.held;
        return HttpResponse.json(ACCEPTED);
      }),
    );

    renderWithTheme(<InsuranceChat flow={flow} locale="en" />);
    await completeFlow();
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    const pendingButton = screen.getByRole('button', { name: 'Sending…' });
    expect(pendingButton).toHaveAttribute('aria-busy', 'true');
    expect(pendingButton).toHaveAttribute('aria-disabled', 'true');

    const firstGroup = screen.getByRole('group', {
      name: 'Do you need liability insurance?',
    });
    expect(within(firstGroup).getByRole('button', { name: 'Yes' })).toBeDisabled();

    request.release();
    expect(
      await screen.findByRole('heading', { name: 'Your demo configuration' }),
    ).toBeInTheDocument();
  });

  it('sends one request even when submit is clicked twice in a row', async () => {
    let requests = 0;
    server.use(
      http.post('*/api/conversation', async () => {
        requests += 1;
        await delay(50);
        return HttpResponse.json(ACCEPTED);
      }),
    );

    renderWithTheme(<InsuranceChat flow={flow} locale="en" />);
    await completeFlow();

    // aria-disabled does not stop a click from being delivered, which is the
    // point: the guard has to hold without the native attribute.
    const button = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(
      await screen.findByRole('heading', { name: 'Your demo configuration' }),
    ).toBeInTheDocument();
    expect(requests).toBe(1);
  });

  it('aborts an in-flight submission when the conversation is reset', async () => {
    let aborts = 0;
    const pending = gate();
    server.use(
      http.post('*/api/conversation', async ({ request }) => {
        request.signal.addEventListener('abort', () => {
          aborts += 1;
        });
        await pending.held;
        return HttpResponse.json(ACCEPTED);
      }),
    );

    renderWithTheme(<InsuranceChat flow={flow} locale="en" />);
    await completeFlow();
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Start over' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Start over' }));

    await waitFor(() => expect(aborts).toBe(1));

    // Back at the first question.
    expect(
      screen.queryByRole('heading', { name: 'Do you need collision damage insurance?' }),
    ).not.toBeInTheDocument();

    // Now let the response the server had already prepared go out. The attempt
    // it belongs to has been retired, so it must not pull the finished state
    // back in. The wait is long enough that a missing guard would show up.
    pending.release();
    await delay(100);
    expect(
      screen.queryByRole('heading', { name: 'Your demo configuration' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps earlier answers editable once finished but before submitting', async () => {
    renderWithTheme(<InsuranceChat flow={flow} locale="en" />);

    await completeFlow();

    const firstGroup = screen.getByRole('group', {
      name: 'Do you need liability insurance?',
    });
    expect(within(firstGroup).getByRole('button', { name: 'Yes' })).not.toBeDisabled();
  });

  it('keeps downstream questions when the same option is clicked again', async () => {
    renderWithTheme(<InsuranceChat flow={flow} locale="en" />);

    await completeFlow();
    await choose('Do you need collision damage insurance?', 'Yes');

    expect(
      screen.getByRole('heading', {
        name: 'Which kind of collision damage insurance do you need?',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Which kind of licence plate do you need?' }),
    ).toBeInTheDocument();
  });

  it('hides the reset button before any answer is given', () => {
    renderWithTheme(<InsuranceChat flow={flow} locale="en" />);
    expect(screen.queryByRole('button', { name: 'Start over' })).not.toBeInTheDocument();
  });

  it('resets to the first question once the reset is confirmed', async () => {
    renderWithTheme(<InsuranceChat flow={flow} locale="en" />);

    await choose('Do you need liability insurance?', 'Yes');
    await userEvent.click(screen.getByRole('button', { name: 'Start over' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Start over' }));

    expect(
      screen.getByRole('heading', { name: 'Do you need liability insurance?' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Do you need collision damage insurance?' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start over' })).not.toBeInTheDocument();
  });

  it('moves the reset button from the header to next to the result', async () => {
    renderWithTheme(<InsuranceChat flow={flow} locale="en" />);

    await completeFlow();
    expect(screen.getByRole('button', { name: 'Start over' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await screen.findByRole('heading', { name: 'Your demo configuration' });

    // Exactly one reset button exists post-submission, right after the
    // result, not still sitting in the header too.
    expect(screen.getAllByRole('button', { name: 'Start over' })).toHaveLength(1);
  });

  it('brings the result into view and puts focus on the action beside it', async () => {
    renderWithTheme(<InsuranceChat flow={flow} locale="en" />);
    await completeFlow();

    // Spied on only now, so the scrolls the questions do on their way past are
    // not mistaken for this one.
    const scrollIntoView = watchScrollIntoView();
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    const heading = await screen.findByRole('heading', { name: 'Your demo configuration' });

    expect(scrollIntoView.mock.contexts.at(-1)).toContainElement(heading);
    expect(screen.getByRole('button', { name: 'Start over' })).toHaveFocus();
  });

  it('brings a failure into view and puts focus on the retry', async () => {
    server.use(
      http.post('*/api/conversation', () =>
        HttpResponse.json({ error: 'invalid_path' }, { status: 422 }),
      ),
    );

    renderWithTheme(<InsuranceChat flow={flow} locale="en" />);
    await completeFlow();

    const scrollIntoView = watchScrollIntoView();
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    const alert = await screen.findByRole('alert');

    expect(scrollIntoView.mock.contexts.at(-1)).toContainElement(alert);
    expect(screen.getByRole('button', { name: 'Submit again' })).toHaveFocus();
  });

  it('shows an error with a working retry when submission fails', async () => {
    server.use(
      http.post('*/api/conversation', () =>
        HttpResponse.json({ error: 'invalid_path' }, { status: 422 }),
      ),
    );

    renderWithTheme(<InsuranceChat flow={flow} locale="en" />);
    await submitFlow();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong.');

    // Recover: the retry should succeed once the endpoint is healthy again.
    server.use(http.post('*/api/conversation', () => HttpResponse.json(ACCEPTED)));
    await userEvent.click(screen.getByRole('button', { name: 'Submit again' }));

    expect(
      await screen.findByRole('heading', { name: 'Your demo configuration' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not retry a failed submission on its own', async () => {
    let requests = 0;
    server.use(
      http.post('*/api/conversation', () => {
        requests += 1;
        return HttpResponse.json({ error: 'invalid_path' }, { status: 422 });
      }),
    );

    renderWithTheme(<InsuranceChat flow={flow} locale="en" />);
    await submitFlow();

    await screen.findByRole('alert');
    // A POST is not safely repeatable without an idempotency key, so trying
    // again has to stay the user's decision.
    expect(requests).toBe(1);
  });

  it('reports an unexpected response shape instead of showing it as success', async () => {
    server.use(
      http.post('*/api/conversation', () => HttpResponse.json({ status: 'ok' }, { status: 200 })),
    );

    renderWithTheme(<InsuranceChat flow={flow} locale="en" />);
    await submitFlow();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Your demo configuration' }),
    ).not.toBeInTheDocument();
  });
});

describe('InsuranceChat in another locale', () => {
  const germanFlow = localizeFlow(getFlow(), 'de');

  it('renders its own copy and the flow in the same language', () => {
    renderWithTheme(<InsuranceChat flow={germanFlow} locale="de" />, { locale: 'de' });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Versicherungs-Konfigurator' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Benötigen Sie eine Haftpflichtversicherung?' }),
    ).toBeInTheDocument();
  });

  it('submits in the locale it was rendered in, and shows the reply in it', async () => {
    // The wording of the result comes from the server, so a locale the client
    // fails to send would show English text inside a German page.
    let requested: string | null = null;
    server.use(
      http.post('*/api/conversation', ({ request }) => {
        requested = new URL(request.url).searchParams.get('locale');
        return HttpResponse.json({
          status: 'accepted',
          configuration: [
            {
              name: 'liability',
              question: 'Benötigen Sie eine Haftpflichtversicherung?',
              value: true,
              label: 'Ja',
            },
          ],
        });
      }),
    );

    renderWithTheme(<InsuranceChat flow={germanFlow} locale="de" />, { locale: 'de' });

    await choose('Benötigen Sie eine Haftpflichtversicherung?', 'Ja');
    await choose('Benötigen Sie eine Kasko?', 'Ja');
    await choose('Welche Art von Kasko benötigen Sie?', 'Vollkasko');
    await choose('Welche Kennzeichenart benötigen Sie?', 'Einzelkennzeichen');
    await userEvent.click(screen.getByRole('button', { name: 'Absenden' }));

    expect(
      await screen.findByRole('heading', { name: 'Ihre Demo-Konfiguration' }),
    ).toBeInTheDocument();
    expect(requested).toBe('de');
  });

  it('reports a failure in its own language', async () => {
    server.use(
      http.post('*/api/conversation', () =>
        HttpResponse.json({ error: 'invalid_path' }, { status: 422 }),
      ),
    );

    renderWithTheme(<InsuranceChat flow={germanFlow} locale="de" />, { locale: 'de' });

    await choose('Benötigen Sie eine Haftpflichtversicherung?', 'Nein');
    await choose('Benötigen Sie eine Kasko?', 'Nein');
    await choose('Welche Kennzeichenart benötigen Sie?', 'Einzelkennzeichen');
    await userEvent.click(screen.getByRole('button', { name: 'Absenden' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Ein Fehler ist aufgetreten.');
    expect(alert).toHaveTextContent('Die Angaben passen nicht zum Gesprächsverlauf.');
  });
});
