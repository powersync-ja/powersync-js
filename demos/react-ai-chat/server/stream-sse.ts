import type { ModelMessage } from 'ai';
import type { Request, Response } from 'express';
import { pg, type ClaimedReply } from './db.ts';
import { describeError, generateReply } from './model.ts';

// SSE mode (VITE_STREAM_MODE=sse): the reply streams around the database. The backend keeps the text in memory and
// sends it to the app over Server-Sent Events, then writes the finished reply to its row once. PowerSync syncs that one
// write.

/** How long a finished reply stays in memory, for clients that connect before the saved reply has synced to them. */
const KEEP_FINISHED_MS = 60_000;

export const summary = `Streaming over SSE, writing each reply once when it's finished.`;

/** A reply being generated. Clients that connect late, or reconnect, catch up from `text`. */
type LiveReply = {
  userId: string;
  text: string;
  finished: boolean;
  /** Open SSE responses, each sent the new text as it's generated. */
  clients: Set<Response>;
};

const liveReplies = new Map<string, LiveReply>();

/**
 * Generates a claimed reply, sending it to connected clients as it streams in and saving it once at the end. Aborting
 * `abort` cancels it.
 */
export async function streamReply(reply: ClaimedReply, history: ModelMessage[], abort: AbortController) {
  const startedAt = Date.now();
  const live: LiveReply = { userId: reply.user_id, text: '', finished: false, clients: new Set() };
  liveReplies.set(reply.id, live);

  try {
    try {
      for await (const text of generateReply(history, abort.signal)) {
        live.text += text;
        for (const client of live.clients) sendText(client, text);
      }
    } catch (error) {
      // Stopping a reply aborts generation, which can throw. Anything else means the reply failed.
      if (!abort.signal.aborted) {
        console.error(`Reply ${reply.id} failed:`, error);
        await pg`
          UPDATE messages SET content = ${describeError(error)}, status = 'error'
          WHERE id = ${reply.id} AND claim_id = ${reply.claim_id} AND status = 'streaming'`;
        return;
      }
    }

    // The only write of the reply: the finished text, or the text generated before the user stopped it. It matches
    // nothing if the user retried the reply in the meantime, which a newer claim now owns.
    const [saved] = await pg<{ status: string }[]>`
      UPDATE messages
      SET content = ${live.text}, write_count = write_count + 1,
        status = CASE status WHEN 'stopped' THEN 'stopped' ELSE 'done' END
      WHERE id = ${reply.id} AND claim_id = ${reply.claim_id} AND status IN ('streaming', 'stopped')
      RETURNING status`;
    console.log(
      !saved
        ? `Reply ${reply.id}: not saved, because it was retried or deleted`
        : saved.status === 'stopped'
          ? `Reply ${reply.id}: stopped by the user, saved in 1 write`
          : `Reply ${reply.id}: ${live.text.length} characters over SSE, saved in 1 write after ${Date.now() - startedAt} ms`
    );
  } finally {
    // Clients keep showing the streamed text until the saved reply syncs to them.
    live.finished = true;
    for (const client of live.clients) client.end();
    live.clients.clear();
    setTimeout(() => {
      if (liveReplies.get(reply.id) === live) liveReplies.delete(reply.id);
    }, KEEP_FINISHED_MS);
  }
}

/**
 * `GET /api/replies/:id/stream`: sends the reply generated so far, then each new chunk until it's finished. Behind
 * `authenticate` (see auth.ts).
 */
export function sendReply(req: Request<{ id: string }>, res: Response) {
  const live = liveReplies.get(req.params.id);
  if (!live) {
    // Not a reply this backend is generating. Its row says what happened to it.
    res.status(404).end();
    return;
  }

  // Only the user who owns the reply can read it, the same rule as syncing it (see sync-config.yaml).
  if (res.locals.userId !== live.userId) {
    res.status(403).end();
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
  // Catch up first. This is also how a client resumes after a refresh or a dropped connection.
  if (live.text) sendText(res, live.text);
  if (live.finished) {
    res.end();
    return;
  }
  live.clients.add(res);
  res.on('close', () => live.clients.delete(res));
}

/** Sends text as one SSE event. JSON-encoding it keeps newlines in the text from ending the event. */
function sendText(client: Response, text: string) {
  client.write(`data: ${JSON.stringify(text)}\n\n`);
}
