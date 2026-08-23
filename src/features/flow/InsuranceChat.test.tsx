import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { getFlow } from '@/lib/data/flow';
import { server } from '@/lib/mocks/server';
import { fireEvent, renderWithTheme, screen, waitFor, within } from '@/test/render';

import { InsuranceChat } from './InsuranceChat';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const flow = getFlow();

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
  await choose('Benötigen Sie eine Haftpflichtversicherung?', 'Ja');
  await choose('Benötigen Sie eine Kasko?', 'Ja');
  await choose('Welche Art von Kasko benötigen Sie?', 'Vollkasko');
  await choose('Welche Kennzeichenart benötigen Sie?', 'Einzelkennzeichen');
}

/** Walks the flow to completion and submits it. */
async function submitFlow() {
  await completeFlow();
  await userEvent.click(screen.getByRole('button', { name: 'Absenden' }));
}

describe('InsuranceChat', () => {
  it('does not submit automatically once every question is answered', async () => {
    renderWithTheme(<InsuranceChat flow={flow} />);

    await completeFlow();

    expect(screen.getByRole('button', { name: 'Absenden' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Ihre Demo-Konfiguration' }),
    ).not.toBeInTheDocument();
  });

  it('submits the answers and shows the configuration the server validated', async () => {
    renderWithTheme(<InsuranceChat flow={flow} />);

    await submitFlow();

    expect(
      await screen.findByRole('heading', { name: 'Ihre Demo-Konfiguration' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Absenden' })).not.toBeInTheDocument();
  });

  it('renders the configuration from the response, not from local state', async () => {
    server.use(
      http.post('*/api/conversation', () =>
        HttpResponse.json({
          status: 'accepted',
          configuration: [
            {
              name: 'liability',
              question: 'Frage vom Server',
              value: true,
              label: 'Antwort vom Server',
            },
          ],
        }),
      ),
    );

    renderWithTheme(<InsuranceChat flow={flow} />);
    await submitFlow();

    // The server is the authority on what was accepted, so the summary has
    // to show its wording even where it differs from the local answers.
    expect(await screen.findByText('Frage vom Server')).toBeInTheDocument();
    expect(screen.getByText('Antwort vom Server')).toBeInTheDocument();
  });

  it('marks the submit button busy and locks earlier answers while in flight', async () => {
    const request = gate();
    server.use(
      http.post('*/api/conversation', async () => {
        await request.held;
        return HttpResponse.json(ACCEPTED);
      }),
    );

    renderWithTheme(<InsuranceChat flow={flow} />);
    await completeFlow();
    await userEvent.click(screen.getByRole('button', { name: 'Absenden' }));

    const pendingButton = screen.getByRole('button', { name: 'Wird gesendet…' });
    expect(pendingButton).toHaveAttribute('aria-busy', 'true');
    expect(pendingButton).toHaveAttribute('aria-disabled', 'true');

    const firstGroup = screen.getByRole('group', {
      name: 'Benötigen Sie eine Haftpflichtversicherung?',
    });
    expect(within(firstGroup).getByRole('button', { name: 'Ja' })).toBeDisabled();

    request.release();
    expect(
      await screen.findByRole('heading', { name: 'Ihre Demo-Konfiguration' }),
    ).toBeInTheDocument();
  });

  it('sends one request even when "Absenden" is clicked twice in a row', async () => {
    let requests = 0;
    server.use(
      http.post('*/api/conversation', async () => {
        requests += 1;
        await delay(50);
        return HttpResponse.json(ACCEPTED);
      }),
    );

    renderWithTheme(<InsuranceChat flow={flow} />);
    await completeFlow();

    // aria-disabled does not stop a click from being delivered, which is the
    // point: the guard has to hold without the native attribute.
    const button = screen.getByRole('button', { name: 'Absenden' });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(
      await screen.findByRole('heading', { name: 'Ihre Demo-Konfiguration' }),
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

    renderWithTheme(<InsuranceChat flow={flow} />);
    await completeFlow();
    await userEvent.click(screen.getByRole('button', { name: 'Absenden' }));
    expect(screen.getByRole('button', { name: 'Wird gesendet…' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Neu starten' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Neu starten' }));

    await waitFor(() => expect(aborts).toBe(1));

    // Back at the first question.
    expect(
      screen.queryByRole('heading', { name: 'Benötigen Sie eine Kasko?' }),
    ).not.toBeInTheDocument();

    // Now let the response the server had already prepared go out. The attempt
    // it belongs to has been retired, so it must not pull the finished state
    // back in. The wait is long enough that a missing guard would show up.
    pending.release();
    await delay(100);
    expect(
      screen.queryByRole('heading', { name: 'Ihre Demo-Konfiguration' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps earlier answers editable once finished but before submitting', async () => {
    renderWithTheme(<InsuranceChat flow={flow} />);

    await completeFlow();

    const firstGroup = screen.getByRole('group', {
      name: 'Benötigen Sie eine Haftpflichtversicherung?',
    });
    expect(within(firstGroup).getByRole('button', { name: 'Ja' })).not.toBeDisabled();
  });

  it('keeps downstream questions when the same option is clicked again', async () => {
    renderWithTheme(<InsuranceChat flow={flow} />);

    await completeFlow();
    await choose('Benötigen Sie eine Kasko?', 'Ja');

    expect(
      screen.getByRole('heading', { name: 'Welche Art von Kasko benötigen Sie?' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Welche Kennzeichenart benötigen Sie?' }),
    ).toBeInTheDocument();
  });

  it('hides the reset button before any answer is given', () => {
    renderWithTheme(<InsuranceChat flow={flow} />);
    expect(screen.queryByRole('button', { name: 'Neu starten' })).not.toBeInTheDocument();
  });

  it('resets to the first question once "Neu starten" is confirmed', async () => {
    renderWithTheme(<InsuranceChat flow={flow} />);

    await choose('Benötigen Sie eine Haftpflichtversicherung?', 'Ja');
    await userEvent.click(screen.getByRole('button', { name: 'Neu starten' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Neu starten' }));

    expect(
      screen.getByRole('heading', { name: 'Benötigen Sie eine Haftpflichtversicherung?' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Benötigen Sie eine Kasko?' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Neu starten' })).not.toBeInTheDocument();
  });

  it('moves the reset button from the header to next to the result', async () => {
    renderWithTheme(<InsuranceChat flow={flow} />);

    await completeFlow();
    expect(screen.getByRole('button', { name: 'Neu starten' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Absenden' }));
    await screen.findByRole('heading', { name: 'Ihre Demo-Konfiguration' });

    // Exactly one reset button exists post-submission, right after the
    // result, not still sitting in the header too.
    expect(screen.getAllByRole('button', { name: 'Neu starten' })).toHaveLength(1);
  });

  it('shows an error with a working retry when submission fails', async () => {
    server.use(
      http.post('*/api/conversation', () =>
        HttpResponse.json({ error: 'invalid_path' }, { status: 422 }),
      ),
    );

    renderWithTheme(<InsuranceChat flow={flow} />);
    await submitFlow();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Ein Fehler ist aufgetreten.');

    // Recover: the retry should succeed once the endpoint is healthy again.
    server.use(http.post('*/api/conversation', () => HttpResponse.json(ACCEPTED)));
    await userEvent.click(screen.getByRole('button', { name: 'Erneut absenden' }));

    expect(
      await screen.findByRole('heading', { name: 'Ihre Demo-Konfiguration' }),
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

    renderWithTheme(<InsuranceChat flow={flow} />);
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

    renderWithTheme(<InsuranceChat flow={flow} />);
    await submitFlow();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Ihre Demo-Konfiguration' }),
    ).not.toBeInTheDocument();
  });
});
