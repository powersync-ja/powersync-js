import type { ModelMessage } from 'ai';
import { pg, type ClaimedReply } from './db.ts';
import { describeError, generateReply } from './model.ts';

// Postgres mode (VITE_STREAM_MODE=postgres): the reply streams through the database. The worker writes the text so far
// to the reply's row on an interval, and PowerSync syncs each write to every client with the chat open.

/**
 * How often the growing reply is written to Postgres. Every write becomes one row update that PowerSync syncs to
 * clients, however many tokens arrived in between: a lower interval streams more smoothly, a higher one writes less.
 */
const FLUSH_INTERVAL_MS = Number(process.env.STREAM_FLUSH_INTERVAL_MS) || 100;

export const summary = `Streaming through Postgres, writing each reply every ${FLUSH_INTERVAL_MS} ms.`;

/** Nothing to start: the database is the only channel to the app. */
export async function start() {}

/** Generates a claimed reply, writing it to its row as it streams in. */
export async function streamReply(reply: ClaimedReply, history: ModelMessage[]) {
  const startedAt = Date.now();
  const abort = new AbortController();
  let content = '';
  let lastWriteAt = 0;
  let writes = 0;

  /**
   * Writes the reply so far. The update only matches while the reply is streaming, so when the user stops it (their
   * client sets the status to 'stopped'), the next write matches nothing and generation is cancelled.
   */
  async function write(status: 'streaming' | 'done' | 'error', text = content) {
    const rows = await pg`
      UPDATE messages SET content = ${text}, status = ${status}, write_count = write_count + 1
      WHERE id = ${reply.id} AND status = 'streaming'
      RETURNING id`;
    lastWriteAt = Date.now();
    if (rows.length > 0) {
      writes++;
    } else {
      abort.abort();
    }
  }

  try {
    for await (const text of generateReply(history, abort.signal)) {
      content += text;
      if (Date.now() - lastWriteAt >= FLUSH_INTERVAL_MS) {
        await write('streaming');
      }
    }
  } catch (error) {
    if (!abort.signal.aborted) {
      console.error(`Reply ${reply.id} failed:`, error);
      await write('error', describeError(error));
      return;
    }
  }

  if (abort.signal.aborted) {
    console.log(`Reply ${reply.id}: stopped by the user after ${writes} writes`);
    return;
  }

  await write('done');
  console.log(`Reply ${reply.id}: ${content.length} characters in ${writes} writes over ${Date.now() - startedAt} ms`);
}
