import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderWithTheme, screen } from '@/test/render';

import { ThemeToggle } from './ThemeToggle';

const LIGHT_LABEL = 'Zum dunklen Design wechseln';
const DARK_LABEL = 'Zum hellen Design wechseln';

describe('ThemeToggle', () => {
  it('renders a labelled, clickable button', () => {
    renderWithTheme(<ThemeToggle />);

    const button = screen.getByRole('button');
    expect([LIGHT_LABEL, DARK_LABEL]).toContain(button.getAttribute('aria-label'));
  });

  it('flips the colour scheme, and its label, when clicked', async () => {
    renderWithTheme(<ThemeToggle />);

    const button = screen.getByRole('button');
    const initialLabel = button.getAttribute('aria-label');
    const otherLabel = initialLabel === LIGHT_LABEL ? DARK_LABEL : LIGHT_LABEL;

    await userEvent.click(button);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', otherLabel);

    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', initialLabel);
  });
});
