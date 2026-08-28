import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithTheme, screen } from '@/test/render';

import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('renders nothing without a failure', () => {
    renderWithTheme(<ErrorState />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a "try later" hint when there is no retry handler', () => {
    renderWithTheme(<ErrorState failure="transport" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Please try again in a few minutes.');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('says what actually went wrong, not just that something did', () => {
    // The whole point of carrying a code: a rejected path and an unreachable
    // server must not read identically.
    renderWithTheme(<ErrorState failure="invalid_path" />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The answers do not match the conversation. Please start over.',
    );
  });

  it('distinguishes one failure from another', () => {
    const { unmount } = renderWithTheme(<ErrorState failure="payload_too_large" />);
    expect(screen.getByRole('alert')).toHaveTextContent('The request was too large.');
    unmount();

    renderWithTheme(<ErrorState failure="transport" />);
    expect(screen.getByRole('alert')).toHaveTextContent('The submission failed.');
  });

  it('translates the reason with the rest of the UI', () => {
    renderWithTheme(<ErrorState failure="invalid_path" />, { locale: 'de' });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Die Angaben passen nicht zum Gesprächsverlauf. Bitte starten Sie neu.',
    );
  });

  it('offers a retry button that calls the handler', async () => {
    const onRetry = vi.fn();
    renderWithTheme(<ErrorState failure="transport" onRetry={onRetry} />);

    await userEvent.click(screen.getByRole('button', { name: 'Submit again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
