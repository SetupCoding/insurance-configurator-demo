import { describe, expect, it } from 'vitest';

import { renderWithTheme, screen } from '@/test/render';

import HomePage from './page';

describe('HomePage', () => {
  it('renders the conversation with the bundled flow, starting at the first question', () => {
    // A synchronous Server Component, so it can be called like any other
    // component here. This covers the wiring the e2e tests assume: the flow is
    // loaded and validated on the server, not fetched by the client.
    renderWithTheme(<HomePage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Versicherungs-Konfigurator' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Benötigen Sie eine Haftpflichtversicherung?' }),
    ).toBeInTheDocument();
  });
});
