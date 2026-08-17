import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { ReactElement } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { getFlow } from '@/lib/data/flow';
import { server } from '@/lib/mocks/server';
import { renderWithTheme, screen, within } from '@/test/render';

import { InsuranceChat } from './InsuranceChat';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const flow = getFlow();

function renderChat(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return renderWithTheme(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

/** Selects an option within the question identified by its heading/group label. */
async function choose(stepText: string, optionName: string) {
  const group = screen.getByRole('group', { name: stepText });
  await userEvent.click(within(group).getByRole('button', { name: optionName }));
}

/** Walks the flow to completion along a fixed path. */
async function completeFlow() {
  await choose('Benötigen Sie eine Haftpflichtversicherung?', 'Ja');
  await choose('Benötigen Sie eine Kasko?', 'Ja');
  await choose('Welche Art von Kasko benötigen Sie?', 'Vollkasko');
  await choose('Welche Kennzeichenart benötigen Sie?', 'Einzelkennzeichen');
}

describe('InsuranceChat', () => {
  it('submits the answers and shows a thank-you message on success', async () => {
    renderChat(<InsuranceChat flow={flow} />);

    await completeFlow();

    expect(await screen.findByText(/Herzlichen Dank für Ihre Angaben!/i)).toBeInTheDocument();
  });

  it('shows an error with a working retry when submission fails', async () => {
    server.use(
      http.post('*/api/conversation', () => HttpResponse.json({ error: 'boom' }, { status: 500 })),
    );

    renderChat(<InsuranceChat flow={flow} />);
    await completeFlow();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Ein Fehler ist aufgetreten.');

    // Recover: the retry should succeed once the endpoint is healthy again.
    server.use(
      http.post('*/api/conversation', () => HttpResponse.json({ status: 'ok' }, { status: 200 })),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Erneut absenden' }));

    expect(await screen.findByText(/Herzlichen Dank für Ihre Angaben!/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
