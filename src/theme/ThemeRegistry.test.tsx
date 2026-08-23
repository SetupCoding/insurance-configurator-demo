import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ThemeRegistry } from './ThemeRegistry';

describe('ThemeRegistry', () => {
  it('renders its children inside the theme providers', () => {
    render(
      <ThemeRegistry>
        <p>Inhalt</p>
      </ThemeRegistry>,
    );

    expect(screen.getByText('Inhalt')).toBeInTheDocument();
  });
});
