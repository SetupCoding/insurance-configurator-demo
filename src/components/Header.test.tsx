import { describe, expect, it } from 'vitest';

import { renderWithTheme, screen } from '@/test/render';

import { Header } from './Header';

describe('Header', () => {
  it('always renders the theme toggle', () => {
    renderWithTheme(<Header />);
    expect(screen.getByRole('button', { name: /Switch to the/ })).toBeInTheDocument();
  });

  it('always offers the other locale, as a link', () => {
    renderWithTheme(<Header />);

    // A link rather than a button, because switching locale is navigation.
    const link = screen.getByRole('link', { name: 'Deutsch' });
    expect(link).toHaveAttribute('href', '/de');
    expect(link).toHaveAttribute('hreflang', 'de');
  });

  it('points back at English from the German page', () => {
    renderWithTheme(<Header />, { locale: 'de' });
    expect(screen.getByRole('link', { name: 'English' })).toHaveAttribute('href', '/en');
  });

  it('renders the start slot when given one', () => {
    renderWithTheme(<Header start={<button>Start over</button>} />);
    expect(screen.getByRole('button', { name: 'Start over' })).toBeInTheDocument();
  });

  it('renders nothing extra in the start slot by default', () => {
    renderWithTheme(<Header />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
