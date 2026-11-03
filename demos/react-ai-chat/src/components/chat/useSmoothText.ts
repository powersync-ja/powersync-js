import React from 'react';

/** Until a second arrival shows how often text comes in, each arrival is revealed over this long. */
const FIRST_GAP_MS = 300;
/** The least time an arrival is revealed over. The slack absorbs uneven arrivals, so the reveal doesn't stutter. */
const MIN_GAP_MS = 100;
/** The most time an arrival is revealed over, so a pause in the stream doesn't slow the text after it to a crawl. */
const MAX_GAP_MS = 1000;
/** Roughly how long the pace takes to change, so the reveal speeds up and slows down gradually. */
const EASE_MS = 250;
/** The fastest pace, in characters per millisecond. Fast models send text far quicker than this. */
const MAX_SPEED = 0.15;
/** Past MAX_SPEED, the pace still reveals waiting text within this long, so the reveal doesn't fall far behind. */
const MAX_LAG_MS = 3000;
/** Set VITE_SMOOTH_TEXT=false to show text in the steps it arrives in. */
const ENABLED = import.meta.env.VITE_SMOOTH_TEXT !== 'false';

/**
 * Reveals text appended to `text` at a steady pace, instead of in the steps it arrives in: one per synced write in
 * Postgres mode, or one per SSE event in SSE mode. Each arrival is revealed by the time the next one is expected, so the
 * reveal keeps flowing between arrivals instead of rushing ahead and waiting. Text that is already there on mount,
 * such as earlier replies, shows straight away.
 */
export function useSmoothText(text: string): string {
  const [length, setLength] = React.useState(text.length);
  const pace = React.useRef({
    /** The length of the text when it last changed. */
    textLength: text.length,
    /** How much of the text is revealed, in fractional characters. */
    shown: text.length,
    /** Characters per millisecond. */
    speed: 0,
    /** The average time between arrivals. */
    gap: FIRST_GAP_MS,
    arrivedAt: 0,
    /** When the next arrival is expected, and the current text should be fully revealed. */
    dueAt: 0
  });

  // The text was replaced by a shorter one, e.g. a retried reply that starts over.
  if (length > text.length) {
    setLength(text.length);
  }

  const revealing = ENABLED && length < text.length;

  React.useEffect(() => {
    const p = pace.current;
    const now = performance.now();
    if (text.length < p.textLength) {
      Object.assign(p, { shown: text.length, speed: 0, gap: FIRST_GAP_MS, arrivedAt: 0 });
    } else if (text.length > p.textLength) {
      if (p.arrivedAt) {
        const gap = Math.min(Math.max(now - p.arrivedAt, MIN_GAP_MS), MAX_GAP_MS);
        p.gap += (gap - p.gap) * 0.3;
      }
      p.arrivedAt = now;
      p.dueAt = now + p.gap;
    }
    p.textLength = text.length;
  }, [text.length]);

  React.useEffect(() => {
    if (!revealing) return;

    let frame = 0;
    let previous = performance.now();
    const step = (now: number) => {
      const p = pace.current;
      const elapsed = Math.max(0, now - previous);
      previous = now;
      // The pace that reveals the rest of the text when the next arrival is due, capped at MAX_SPEED unless the reveal
      // is falling behind.
      const waiting = text.length - p.shown;
      const target = Math.min(waiting / Math.max(p.dueAt - now, MIN_GAP_MS), Math.max(MAX_SPEED, waiting / MAX_LAG_MS));
      p.speed += (target - p.speed) * Math.min(1, elapsed / EASE_MS);
      p.shown = Math.min(text.length, p.shown + p.speed * elapsed);
      setLength(Math.ceil(p.shown));
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [text.length, revealing]);

  return revealing ? text.slice(0, length) : text;
}
