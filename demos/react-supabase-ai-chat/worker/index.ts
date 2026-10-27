import { pg, type ClaimedReply } from './db.ts';
import { generateTitle, missingApiKey, modelId } from './model.ts';
import { summary as throttleSummary } from './throttle.ts';

/**
 * How replies reach the app while they generate. Set with VITE_STREAM_MODE, which the app reads too. Each mode is
 * one file with the same exports:
 * - `postgres` (default, stream-postgres.ts): the worker writes the growing reply to its row, and PowerSync syncs
 *   each write.
 * - `sse` (stream-sse.ts): the worker sends the reply to the app over Server-Sent Events, and writes its row once,
 *   when the reply is finished.
 */
const STREAM_MODE = process.env.VITE_STREAM_MODE === 'sse' ? 'sse' : 'postgres';
const streaming = STREAM_MODE === 'sse' ? await import('./stream-sse.ts') : await import('./stream-postgres.ts');

/**
 * Generates the reply for one pending assistant message.
 */
async function respond(messageId: string) {
  // Claim the message. If it was stopped, or another worker already claimed it, there is nothing to do.
  const [reply] = await pg<ClaimedReply[]>`
    UPDATE messages SET status = 'streaming', content = '', write_count = 0, claim_id = gen_random_uuid()
    WHERE id = ${messageId} AND role = 'assistant' AND status = 'pending'
    RETURNING id, chat_id, user_id, claim_id`;
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

  await streaming.streamReply(reply, history);
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

await streaming.start();

// The `assistant_reply_requested` trigger notifies this channel (see supabase/migrations). The listen callback also
// runs after reconnecting to Postgres, which picks up anything missed while disconnected.
await pg.listen('assistant_reply_requested', handle, respondToPending);

console.log(
  missingApiKey
    ? `AI worker ready. Simulating replies, because ${missingApiKey} is not set for ${modelId}.`
    : `AI worker ready, replying with ${modelId}.`,
  streaming.summary,
  throttleSummary
);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    await pg.end({ timeout: 5 });
    process.exit(0);
  });
}
