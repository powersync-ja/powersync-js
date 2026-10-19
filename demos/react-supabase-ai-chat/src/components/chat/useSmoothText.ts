import React from 'react';

/** Unrevealed text shrinks by about two thirds over this time, so the reveal never falls far behind. */
const CATCH_UP_MS = 400;
/** The slowest pace, in characters per millisecond. */
const MIN_SPEED = 0.3;

/**
 * Reveals text appended to `text` at a steady pace, instead of in the steps it arrives in: one per write by the AI
 * worker, and some models send large chunks. Text that is already there on mount, such as earlier replies, shows
 * straight away.
 */
export function useSmoothText(text: string): string {
  const [length, setLength] = React.useState(text.length);

  // The text was replaced by a shorter one, e.g. a retried reply that starts over.
  if (length > text.length) {
    setLength(text.length);
  }

  const revealing = length < text.length;

  React.useEffect(() => {
    if (!revealing) return;

    let frame = 0;
    let previous = performance.now();
    const step = (now: number) => {
      const elapsed = now - previous;
      previous = now;
      setLength((shown) => {
        const speed = Math.max((text.length - shown) / CATCH_UP_MS, MIN_SPEED);
        return Math.min(text.length, shown + Math.max(1, Math.ceil(speed * elapsed)));
      });
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [text.length, revealing]);

  return revealing ? text.slice(0, length) : text;
}
