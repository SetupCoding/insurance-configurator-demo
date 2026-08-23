import { describe, expect, it } from 'vitest';

import type { Configuration } from '@/lib/schema/conversation';
import { renderWithTheme, screen } from '@/test/render';

import { ConfigurationSummary } from './ConfigurationSummary';

const configuration: Configuration = [
  {
    name: 'liability',
    question: 'Benötigen Sie eine Haftpflichtversicherung?',
    value: true,
    label: 'Ja',
  },
  { name: 'casco', question: 'Benötigen Sie eine Kasko?', value: false, label: 'Nein' },
];

describe('ConfigurationSummary', () => {
  it('lists every question with the option label that was chosen', () => {
    renderWithTheme(<ConfigurationSummary configuration={configuration} />);

    expect(screen.getByText('Benötigen Sie eine Haftpflichtversicherung?')).toBeInTheDocument();
    expect(screen.getByText('Ja')).toBeInTheDocument();
    expect(screen.getByText('Benötigen Sie eine Kasko?')).toBeInTheDocument();
    expect(screen.getByText('Nein')).toBeInTheDocument();
  });

  it('states that nothing was stored', () => {
    renderWithTheme(<ConfigurationSummary configuration={configuration} />);

    expect(screen.getByText(/nichts gespeichert/i)).toBeInTheDocument();
  });

  it('pairs each question with its answer as a description list', () => {
    const { container } = renderWithTheme(<ConfigurationSummary configuration={configuration} />);

    // dt/dd rather than two columns of plain text, so the association is
    // available to assistive technology and not only visually.
    const terms = [...container.querySelectorAll('dl > dt')].map((node) => node.textContent);
    const details = [...container.querySelectorAll('dl > dd')].map((node) => node.textContent);
    expect(terms).toEqual(configuration.map((entry) => entry.question));
    expect(details).toEqual(configuration.map((entry) => entry.label));
  });
});
