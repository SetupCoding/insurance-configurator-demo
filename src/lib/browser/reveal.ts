function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Scrolls something that has just appeared into view.
 *
 * Animated unless the operating system asks for reduced motion, which is
 * exactly what that setting is about. The scroll itself still happens: leaving
 * the new content off screen is not the accessible alternative to animating.
 */
export function revealElement(element: HTMLElement | null, block: ScrollLogicalPosition) {
  element?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block });
}
