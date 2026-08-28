import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithTheme, screen, within } from '@/test/render';

import { ResetButton } from './ResetButton';

describe('ResetButton', () => {
  it('opens a confirmation dialog instead of resetting immediately', async () => {
    const onConfirm = vi.fn();
    renderWithTheme(<ResetButton onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole('button', { name: 'Start over' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirms and closes the dialog when "Start over" is clicked inside it', async () => {
    const onConfirm = vi.fn();
    renderWithTheme(<ResetButton onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole('button', { name: 'Start over' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Start over' }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not confirm when "Cancel" is clicked', async () => {
    const onConfirm = vi.fn();
    renderWithTheme(<ResetButton onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole('button', { name: 'Start over' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes without confirming when the backdrop is clicked', async () => {
    const onConfirm = vi.fn();
    renderWithTheme(<ResetButton onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole('button', { name: 'Start over' }));
    // A click on the dialog element itself (not a descendant) is a backdrop click.
    await userEvent.click(screen.getByRole('dialog'));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
