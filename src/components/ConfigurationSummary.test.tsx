import { describe, expect, it } from 'vitest';

import type { Configuration } from '@/lib/schema/conversation';
import { renderWithTheme, screen } from '@/test/render';

import { ConfigurationSummary } from './ConfigurationSummary';

const configuration: Configuration = [
  {
    name: 'liability',
    question: 'Do you need liability insurance?',
    value: true,
    label: 'Yes',
  },
  {
    name: 'casco',
    question: 'Do you need collision damage insurance?',
    value: false,
    label: 'No',
  },
];

describe('ConfigurationSummary', () => {
  it('lists every question with the option label that was chosen', () => {
    renderWithTheme(<ConfigurationSummary configuration={configuration} />);

    expect(screen.getByText('Do you need liability insurance?')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('Do you need collision damage insurance?')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('states that nothing was stored', () => {
    renderWithTheme(<ConfigurationSummary configuration={configuration} />);

    expect(screen.getByText(/nothing was stored/i)).toBeInTheDocument();
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
