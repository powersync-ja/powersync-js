/**
 * How replies reach the app while they generate. Set with VITE_STREAM_MODE, which the AI worker reads too:
 * - `postgres` (default): the worker writes the growing reply to its row, and PowerSync syncs each write.
 * - `sse`: the worker sends the reply over Server-Sent Events, and writes its row once, when the reply is finished.
 */
export const STREAM_MODE: 'postgres' | 'sse' = import.meta.env.VITE_STREAM_MODE === 'sse' ? 'sse' : 'postgres';

/** One line on how replies stream in the current mode, shown below the composer. */
export const STREAM_MODE_DESCRIPTION =
  STREAM_MODE === 'sse'
    ? 'Replies stream from the AI worker over SSE, then are saved to Postgres once and synced to every device by PowerSync.'
    : 'Replies are written to Postgres as they generate and synced to every open tab and device by PowerSync.';
