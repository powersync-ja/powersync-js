import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ModelMessage } from 'ai';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { pg, type ClaimedReply } from './db.ts';
import { describeError, generateReply } from './model.ts';

// SSE mode (VITE_STREAM_MODE=sse): the reply streams around the database. The worker keeps the text in memory and sends
// it to the app over Server-Sent Events, then writes the finished reply to its row once. PowerSync syncs that one write.

/** The SSE server's port. The app's dev server proxies `/replies` to it (see vite.config.mts). */
const SSE_PORT = 8787;

/** How long a finished reply stays in memory, for clients that connect before the saved reply has synced to them. */
const KEEP_FINISHED_MS = 60_000;

export const summary = `Streaming over SSE on port ${SSE_PORT}, writing each reply once when it's finished.`;

/** A reply being generated. Clients that connect late, or reconnect, catch up from `text`. */
type LiveReply = {
  userId: string;
  text: string;
  finished: boolean;
  /** Open SSE responses, each sent the new text as it's generated. */
  clients: Set<ServerResponse>;
  /** Aborted when the user stops the reply. */
  abort: AbortController;
};

const liveReplies = new Map<string, LiveReply>();

/** Starts the SSE server, and cancels replies that users stop. */
export async function start() {
  // Stopping a reply is a status change on its row, which the `assistant_reply_stopped` trigger reports.
  await pg.listen('assistant_reply_stopped', (messageId) => liveReplies.get(messageId)?.abort.abort());

  const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);
  const server = createServer((request, response) => {
    sendReply(request, response, supabase).catch((error) => {
      console.error('SSE request failed:', error);
      response.destroy();
    });
  });
  await new Promise<void>((resolve) => server.listen(SSE_PORT, '127.0.0.1', resolve));
}

/** Generates a claimed reply, sending it to connected clients as it streams in and saving it once at the end. */
export async function streamReply(reply: ClaimedReply, history: ModelMessage[]) {
  const startedAt = Date.now();
  const live: LiveReply = {
    userId: reply.user_id,
    text: '',
    finished: false,
    clients: new Set(),
    abort: new AbortController()
  };
  liveReplies.set(reply.id, live);

  try {
    try {
      for await (const text of generateReply(history, live.abort.signal)) {
        live.text += text;
        for (const client of live.clients) sendText(client, text);
      }
    } catch (error) {
      // Stopping a reply aborts generation, which can throw. Anything else means the reply failed.
      if (!live.abort.signal.aborted) {
        console.error(`Reply ${reply.id} failed:`, error);
        await pg`
          UPDATE messages SET content = ${describeError(error)}, status = 'error'
          WHERE id = ${reply.id} AND status = 'streaming'`;
        return;
      }
    }

    // The only write of the reply: the finished text, or the text generated before the user stopped it.
    const [saved] = await pg<{ status: string }[]>`
      UPDATE messages
      SET content = ${live.text}, write_count = write_count + 1,
        status = CASE status WHEN 'stopped' THEN 'stopped' ELSE 'done' END
      WHERE id = ${reply.id} AND status IN ('streaming', 'stopped')
      RETURNING status`;
    console.log(
      saved?.status === 'stopped'
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

/** `GET /replies/:id/stream`: sends the reply generated so far, then each new chunk until it's finished. */
async function sendReply(request: IncomingMessage, response: ServerResponse, supabase: SupabaseClient) {
  const messageId = request.url?.match(/^\/replies\/([\w-]+)\/stream$/)?.[1];
  const live = messageId ? liveReplies.get(messageId) : undefined;
  if (request.method !== 'GET' || !live) {
    // Not a reply this worker is generating. Its row says what happened to it.
    response.writeHead(404).end();
    return;
  }

  // Only the owner of the chat can read its replies. The app sends its Supabase access token.
  const token = request.headers.authorization?.replace(/^Bearer /, '');
  const { data } = token ? await supabase.auth.getClaims(token) : { data: null };
  if (data?.claims.sub !== live.userId) {
    response.writeHead(403).end();
    return;
  }

  response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
  // Catch up first. This is also how a client resumes after a refresh or a dropped connection.
  if (live.text) sendText(response, live.text);
  if (live.finished) {
    response.end();
    return;
  }
  live.clients.add(response);
  response.on('close', () => live.clients.delete(response));
}

/** Sends text as one SSE event. JSON-encoding it keeps newlines in the text from ending the event. */
function sendText(client: ServerResponse, text: string) {
  client.write(`data: ${JSON.stringify(text)}\n\n`);
}
