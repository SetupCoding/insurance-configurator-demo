import { afterEach, describe, expect, it } from 'vitest';

// Smoke test that guards the test environment itself: jsdom is active and
// the jest-dom matchers are registered via the setup file.
describe('test environment', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('provides a jsdom DOM with jest-dom matchers', () => {
    const element = document.createElement('div');
    element.textContent = 'ready';
    document.body.appendChild(element);

    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('ready');
  });
});
