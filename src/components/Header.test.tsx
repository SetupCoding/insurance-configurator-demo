import { describe, expect, it } from 'vitest';

import { renderWithTheme, screen } from '@/test/render';

import { Header } from './Header';

describe('Header', () => {
  it('always renders the theme toggle', () => {
    renderWithTheme(<Header />);
    expect(screen.getByRole('button', { name: /Design wechseln/ })).toBeInTheDocument();
  });

  it('renders the start slot when given one', () => {
    renderWithTheme(<Header start={<button>Neu starten</button>} />);
    expect(screen.getByRole('button', { name: 'Neu starten' })).toBeInTheDocument();
  });

  it('renders nothing extra in the start slot by default', () => {
    renderWithTheme(<Header />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
