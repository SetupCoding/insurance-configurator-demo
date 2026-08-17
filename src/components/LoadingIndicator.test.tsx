import { describe, expect, it } from 'vitest';

import { renderWithTheme, screen } from '@/test/render';

import { LoadingIndicator } from './LoadingIndicator';

describe('LoadingIndicator', () => {
  it('renders nothing when not loading', () => {
    renderWithTheme(<LoadingIndicator isLoading={false} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('announces progress politely when loading', () => {
    renderWithTheme(<LoadingIndicator isLoading />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Sende Daten');
  });
});
