import { describe, expect, it, vi } from 'vitest';

import { renderWithTheme, screen } from '@/test/render';

import HomePage from './page';

// `next-intl/server` deliberately throws outside a React Server Component
// render, and this test calls the page as the plain async function it is. What
// setRequestLocale is actually for, making /en render English instead of the
// default, is asserted end to end, where there is a real request to scope it to.
vi.mock('next-intl/server', () => ({ setRequestLocale: vi.fn() }));

/** The page as Next would call it, with the params it receives as a promise. */
function pageProps(locale: string) {
  return { params: Promise.resolve({ locale }), searchParams: Promise.resolve({}) };
}

describe('HomePage', () => {
  it('renders the conversation with the bundled flow, starting at the first question', async () => {
    // This covers the wiring the e2e tests assume: the flow is loaded and
    // validated on the server, not fetched by the client.
    renderWithTheme(await HomePage(pageProps('en')));

    expect(
      screen.getByRole('heading', { level: 1, name: 'Insurance configurator' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Do you need liability insurance?' }),
    ).toBeInTheDocument();
  });

  it('resolves the flow into the requested locale before it reaches the client', async () => {
    renderWithTheme(await HomePage(pageProps('de')), { locale: 'de' });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Versicherungs-Konfigurator' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Benötigen Sie eine Haftpflichtversicherung?' }),
    ).toBeInTheDocument();
    // The English wording is not merely hidden, it was never sent.
    expect(screen.queryByText('Do you need liability insurance?')).not.toBeInTheDocument();
  });
});
