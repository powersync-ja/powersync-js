import { pg, type ClaimedReply } from './db.ts';
import { generateTitle } from './model.ts';
import * as postgresMode from './stream-postgres.ts';
import * as sseMode from './stream-sse.ts';

/**
 * How replies reach the app while they generate: `postgres` (default) or `sse`. Set with VITE_STREAM_MODE, which the
 * app reads too. Each mode's file exports `streamReply` and `summary`.
 */
export const STREAM_MODE = process.env.VITE_STREAM_MODE === 'sse' ? 'sse' : 'postgres';
export const streaming = STREAM_MODE === 'sse' ? sseMode : postgresMode;

/** The replies being generated, by message id. Aborting one's controller cancels its generation. */
const generations = new Map<string, AbortController>();

/**
 * Generates the reply for a pending assistant message: a new placeholder, or a reply the user retried. It runs in the
 * background, so the upload that asked for it can finish.
 */
export function respond(messageId: string) {
  // A retry replaces the previous attempt, if that's still running.
  generations.get(messageId)?.abort();
  const abort = new AbortController();
  generations.set(messageId, abort);

  generate(messageId, abort)
    .catch((error) => console.error('Could not respond to %s:', messageId, error))
    .finally(() => {
      // Unless a retry has started a newer attempt in the meantime.
      if (generations.get(messageId) === abort) generations.delete(messageId);
    });
}

/** Cancels a reply the user stopped or deleted. */
export function stop(messageId: string) {
  generations.get(messageId)?.abort();
}

/** Picks up the replies left over from the last time the backend ran. Called on startup. */
export async function resumeReplies() {
  // A reply that was streaming when the backend last stopped will never finish, so start it over.
  await pg`UPDATE messages SET status = 'pending' WHERE role = 'assistant' AND status = 'streaming'`;
  const pending = await pg<{ id: string }[]>`
    SELECT id FROM messages WHERE role = 'assistant' AND status = 'pending' ORDER BY created_at`;
  pending.forEach(({ id }) => respond(id));
}

async function generate(messageId: string, abort: AbortController) {
  // Claim the message. If it was stopped, or another attempt already claimed it, there is nothing to do.
  const [reply] = await pg<ClaimedReply[]>`
    UPDATE messages SET status = 'streaming', content = '', write_count = 0, claim_id = gen_random_uuid()
    WHERE id = ${messageId} AND role = 'assistant' AND status = 'pending'
    RETURNING id, chat_id, user_id, claim_id`;
  if (!reply) return;

  // The schema already keeps other users' messages out of a chat. This is a second check.
  const history = await pg<{ role: 'user' | 'assistant'; content: string }[]>`
    SELECT role, content FROM messages
    WHERE chat_id = ${reply.chat_id}
      AND user_id = ${reply.user_id}
      AND created_at < (SELECT created_at FROM messages WHERE id = ${reply.id})
      AND status IN ('done', 'stopped') AND content <> ''
    ORDER BY created_at`;

  // The first reply in a chat also names it, while the reply streams.
  if (history.length === 1) {
    nameChat(reply, history[0].content).catch((error) => console.error(`Could not name chat ${reply.chat_id}:`, error));
  }

  await streaming.streamReply(reply, history, abort);
}

/**
 * Replaces the title of a new chat, which the client took from the first message, with one written by the model. The
 * new title syncs to the sidebar like any other change.
 */
async function nameChat(reply: ClaimedReply, firstMessage: string) {
  const title = await generateTitle(firstMessage);
  if (title) await pg`UPDATE chats SET title = ${title} WHERE id = ${reply.chat_id} AND user_id = ${reply.user_id}`;
}
