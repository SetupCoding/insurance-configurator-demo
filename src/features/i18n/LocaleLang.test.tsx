import { describe, expect, it } from 'vitest';

import { renderWithTheme } from '@/test/render';

import { LocaleLang } from './LocaleLang';

describe('LocaleLang', () => {
  it('puts the locale on the document element', () => {
    renderWithTheme(<LocaleLang locale="de" />);
    expect(document.documentElement.lang).toBe('de');
  });

  it('follows a change of locale', () => {
    // The case it exists for: on a client-side switch the root layout is not
    // re-rendered, so nothing else updates `lang`.
    const { rerender } = renderWithTheme(<LocaleLang locale="de" />);
    expect(document.documentElement.lang).toBe('de');

    rerender(<LocaleLang locale="en" />);
    expect(document.documentElement.lang).toBe('en');
  });

  it('renders nothing of its own', () => {
    const { container } = renderWithTheme(<LocaleLang locale="en" />);
    expect(container).toBeEmptyDOMElement();
  });
});
