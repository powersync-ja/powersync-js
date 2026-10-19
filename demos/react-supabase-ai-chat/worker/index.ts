import postgres from 'postgres';
import { describeError, generateReply, generateTitle, missingApiKey, modelId } from './model.ts';

/**
 * How often the growing reply is written to Postgres. Every write becomes one row update that PowerSync syncs to
 * clients, however many tokens arrived in between: a lower interval streams more smoothly, a higher one writes less.
 */
const FLUSH_INTERVAL_MS = Number(process.env.STREAM_FLUSH_INTERVAL_MS) || 100;

const pg = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres');

/**
 * Generates the reply for one pending assistant message, writing it to the row as it streams in.
 */
async function respond(messageId: string) {
  // Claim the message. If it was stopped, or another worker already claimed it, there is nothing to do.
  const [reply] = await pg<{ id: string; chat_id: string }[]>`
    UPDATE messages SET status = 'streaming', content = '', write_count = 0
    WHERE id = ${messageId} AND role = 'assistant' AND status = 'pending'
    RETURNING id, chat_id`;
  if (!reply) return;

  const history = await pg<{ role: 'user' | 'assistant'; content: string }[]>`
    SELECT role, content FROM messages
    WHERE chat_id = ${reply.chat_id}
      AND created_at < (SELECT created_at FROM messages WHERE id = ${reply.id})
      AND status IN ('done', 'stopped') AND content <> ''
    ORDER BY created_at`;

  // The first reply in a chat also names it, while the reply streams.
  if (history.length === 1) {
    nameChat(reply.chat_id, history[0].content).catch((error) =>
      console.error(`Could not name chat ${reply.chat_id}:`, error)
    );
  }

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

/**
 * Replaces the title of a new chat, which the client took from the first message, with one written by the model. The
 * new title syncs to the sidebar like any other change.
 */
async function nameChat(chatId: string, firstMessage: string) {
  const title = await generateTitle(firstMessage);
  if (title) await pg`UPDATE chats SET title = ${title} WHERE id = ${chatId}`;
}

function handle(messageId: string) {
  respond(messageId).catch((error) => console.error(`Could not respond to ${messageId}:`, error));
}

/** Handles assistant messages that became pending while the worker wasn't listening, e.g. sent while it was down. */
async function respondToPending() {
  const pending = await pg<{ id: string }[]>`
    SELECT id FROM messages WHERE role = 'assistant' AND status = 'pending' ORDER BY created_at`;
  pending.forEach(({ id }) => handle(id));
}

// A reply that was streaming when the worker last stopped will never finish, so start it over.
await pg`UPDATE messages SET status = 'pending' WHERE role = 'assistant' AND status = 'streaming'`;

// The `assistant_reply_requested` trigger notifies this channel (see supabase/migrations). The listen callback also
// runs after reconnecting to Postgres, which picks up anything missed while disconnected.
await pg.listen('assistant_reply_requested', handle, respondToPending);

console.log(
  missingApiKey
    ? `AI worker ready. Simulating replies, because ${missingApiKey} is not set for ${modelId}.`
    : `AI worker ready, replying with ${modelId}.`,
  `Writing to Postgres every ${FLUSH_INTERVAL_MS} ms.`
);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    await pg.end({ timeout: 5 });
    process.exit(0);
  });
}
