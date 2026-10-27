import { connector } from '@/components/providers/SystemProvider';
import React from 'react';

/** How long to wait before connecting again after the connection drops or the backend can't serve the reply yet. */
const RECONNECT_MS = 1000;

/**
 * SSE mode: the text of a reply as the backend streams it over Server-Sent Events (see server/stream-sse.ts), or
 * `null` when `enabled` is false. Each connection starts with everything generated so far, so the reply catches up
 * after a refresh or a dropped connection. While `streaming` is true, the reply's synced row says it's still
 * generating, so the hook keeps trying when the backend can't serve it, e.g. while the backend restarts. A new
 * `claimId` means the backend started the reply over (after a restart or a retry), so the hook connects again.
 */
export function useSseReply(
  messageId: string,
  enabled: boolean,
  streaming: boolean,
  claimId: string | null
): string | null {
  const [text, setText] = React.useState('');
  // Read when the backend can't serve the reply, so that a change to `streaming` doesn't reconnect.
  const isStreaming = React.useEffectEvent(() => streaming);

  React.useEffect(() => {
    if (!enabled) return;
    const abort = new AbortController();

    const connect = async () => {
      while (!abort.signal.aborted) {
        try {
          const { token } = await connector.getToken();
          const response = await fetch(`/api/replies/${messageId}/stream`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: abort.signal
          });
          if (response.ok) {
            setText('');
            await readEvents(response, (chunk) => setText((text) => text + chunk));
            // The backend ended the stream because the reply is finished. The saved reply syncs next.
            return;
          }
          // Not this user's reply, or the backend isn't generating it any more. Its row will say what happened.
          if (response.status === 403 || !isStreaming()) return;
        } catch {
          if (abort.signal.aborted) return;
        }
        await new Promise((resolve) => setTimeout(resolve, RECONNECT_MS));
      }
    };

    connect();
    return () => {
      abort.abort();
      setText('');
    };
    // The dev server's proxy doesn't end a response when the backend dies, so a claim change is what reconnects then.
  }, [messageId, claimId, enabled]);

  return enabled ? text : null;
}

/** Reads the events of an SSE response. Each one is a JSON-encoded chunk of text. */
async function readEvents(response: Response, onChunk: (chunk: string) => void) {
  const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;

    buffer += value;
    const events = buffer.split('\n\n');
    // The last piece is an event that hasn't fully arrived yet.
    buffer = events.pop()!;
    for (const event of events) {
      if (event.startsWith('data: ')) onChunk(JSON.parse(event.slice('data: '.length)));
    }
  }
}
