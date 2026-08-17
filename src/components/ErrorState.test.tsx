import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithTheme, screen } from '@/test/render';

import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('renders nothing without a message', () => {
    renderWithTheme(<ErrorState />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a "try later" hint when there is no retry handler', () => {
    renderWithTheme(<ErrorState message="boom" />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ein Fehler ist aufgetreten. Bitte versuchen Sie es in ein paar Minuten erneut.',
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers a retry button that calls the handler', async () => {
    const onRetry = vi.fn();
    renderWithTheme(<ErrorState message="boom" onRetry={onRetry} />);

    await userEvent.click(screen.getByRole('button', { name: 'Erneut absenden' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
