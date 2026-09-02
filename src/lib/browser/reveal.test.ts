import { describe, expect, it, vi } from 'vitest';

import { revealElement } from './reveal';

/**
 * Each test states the preference it is about rather than leaning on the
 * default in setup.ts, so neither one depends on running first. Only `matches`
 * is read, so the rest of the MediaQueryList is not built.
 */
function answerReducedMotionWith(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches } as MediaQueryList);
}

describe('revealElement', () => {
  it('scrolls the element into view on the edge it was given', () => {
    answerReducedMotionWith(false);
    const element = document.createElement('div');
    const scrollIntoView = vi.spyOn(element, 'scrollIntoView');

    revealElement(element, 'end');

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'end' });
  });

  it('drops the animation when the system asks for reduced motion', () => {
    answerReducedMotionWith(true);
    const element = document.createElement('div');
    const scrollIntoView = vi.spyOn(element, 'scrollIntoView');

    revealElement(element, 'center');

    // Still scrolled: the setting is about the animation, not about leaving
    // what just appeared off screen.
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' });
  });

  it('does nothing when there is no element', () => {
    expect(() => revealElement(null, 'end')).not.toThrow();
  });
});
