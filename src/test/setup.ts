import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Persisted answers survive a jsdom reset, so without clearing storage a test
// would restore the previous test's conversation.
afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  window.localStorage.clear();
});

// jsdom does not implement matchMedia, which MUI's useMediaQuery relies on.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// jsdom does not implement scrollIntoView, used for focus management.
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// jsdom's <dialog> is an empty stub with no showModal/close, used for the
// reset confirmation dialog. Toggling the `open` attribute is enough for
// Testing Library's role queries to see it appear and disappear.
if (!window.HTMLDialogElement.prototype.showModal) {
  window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
}
