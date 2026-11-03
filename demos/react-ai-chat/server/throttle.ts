import { setTimeout } from 'node:timers/promises';

/** Set STREAM_THROTTLE=false to send text on as soon as the model generates it, e.g. to see how it chunks its reply. */
const ENABLED = process.env.STREAM_THROTTLE !== 'false';

/**
 * The most characters per second a reply is sent on at, however fast the model generates it. Models send text
 * unevenly, often in a few large chunks, so a steady pace makes replies stream smoothly in both modes, at the cost of
 * finishing after the model does.
 */
const CHARS_PER_SECOND = Number(process.env.STREAM_CHARS_PER_SECOND) || 100;

/** How often throttled text is sent on. */
const TICK_MS = 50;

export const summary = ENABLED
  ? `Sending replies at up to ${CHARS_PER_SECOND} characters per second.`
  : 'Sending replies as fast as the model generates them.';

/**
 * Passes on the text from `source` at no more than CHARS_PER_SECOND. The source is read as it arrives and its text
 * held until its turn, so the model is never kept waiting.
 */
export async function* throttle(source: AsyncIterable<string>, signal: AbortSignal): AsyncGenerator<string> {
  if (!ENABLED) {
    yield* source;
    return;
  }

  // Split into code points, so a surrogate pair is never sent in two halves.
  const waiting: string[] = [];
  let finished = false;
  let failure: { error: unknown } | undefined;
  let wake: (() => void) | undefined;

  void (async () => {
    try {
      for await (const text of source) {
        for (const char of text) waiting.push(char);
        wake?.();
      }
    } catch (error) {
      failure = { error };
    } finally {
      finished = true;
      wake?.();
    }
  })();

  let allowance = 0;
  let last = performance.now();
  while (true) {
    if (failure) throw failure.error;
    if (waiting.length === 0) {
      if (finished) return;
      await new Promise<void>((resolve) => (wake = resolve));
      wake = undefined;
      // Time spent waiting for the model doesn't count, so text that arrives after a pause isn't sent in a burst.
      allowance = 0;
      last = performance.now();
      continue;
    }

    await setTimeout(TICK_MS, undefined, { signal });
    const now = performance.now();
    allowance += ((now - last) * CHARS_PER_SECOND) / 1000;
    last = now;

    const count = Math.min(waiting.length, Math.floor(allowance));
    if (count > 0) {
      allowance -= count;
      yield waiting.splice(0, count).join('');
    }
  }
}
