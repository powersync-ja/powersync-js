import { cn } from '@/library/cn';
import { MessageRecord, MessageStatus } from '@/library/powersync/AppSchema';
import { STREAM_MODE } from '@/library/streamMode';
import { useStatus } from '@powersync/react';
import { CloudOff, RotateCcw, TriangleAlert } from 'lucide-react';
import React from 'react';
import { CopyIcon } from './CopyIcon';
import { Markdown } from './Markdown';
import { useCopyToClipboard } from './useCopyToClipboard';
import { useSmoothText } from './useSmoothText';
import { useSseReply } from './useSseReply';

export type MessageProps = {
  message: MessageRecord;
  /** Shown on the last reply in a chat. */
  onRetry?: (messageId: string) => void;
};

/**
 * A chat message. Assistant messages re-render as the AI worker's writes sync in, so the reply streams.
 */
export const Message = React.memo(function Message({ message, onRetry }: MessageProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-[20px] rounded-br-md bg-bubble px-4 py-2.5 text-[15px] leading-7 break-words whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  return <Reply message={message} onRetry={onRetry} />;
});

function Reply({ message, onRetry }: MessageProps) {
  const status = message.status as MessageStatus;
  // In SSE mode, the text of a streaming reply comes over SSE. When the user stops it, the streamed text stays up until
  // the saved partial reply syncs. Otherwise, and always in Postgres mode, the text comes from the synced row.
  const streamed = useSseReply(
    message.id,
    STREAM_MODE === 'sse' && (status === 'streaming' || (status === 'stopped' && !message.content)),
    status === 'streaming'
  );
  const content = streamed ?? message.content ?? '';
  const text = useSmoothText(content);
  const revealing = text.length < content.length;
  const finished = (status === 'done' || status === 'stopped' || status === 'error') && !revealing;
  const writes = message.write_count ?? 0;

  return (
    <div className="group">
      {status === 'error' ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{content}</span>
        </div>
      ) : text ? (
        <Markdown streaming={status === 'streaming' || revealing}>{text}</Markdown>
      ) : status === 'pending' || status === 'streaming' ? (
        <Thinking pending={status === 'pending'} />
      ) : null}

      {finished && (
        <div
          className={cn(
            'mt-2 flex items-center gap-1 text-muted transition-opacity',
            // With a mouse, earlier replies show their actions on hover. The last reply, which can be retried, always does.
            !onRetry &&
              'pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-within:opacity-100'
          )}
        >
          {status === 'stopped' && <span className="mr-2 text-sm">Stopped</span>}
          {status !== 'error' && content && <CopyButton text={content} />}
          {onRetry && (
            <IconButton label="Retry" onClick={() => onRetry(message.id)}>
              <RotateCcw className="size-4" />
            </IconButton>
          )}
          {status !== 'error' && writes > 0 && <WriteCount writes={writes} />}
        </div>
      )}
    </div>
  );
}

/**
 * How many times the reply's text was written to Postgres, each synced as one update. It comes from the row, so it's
 * right whichever mode generated the reply: several writes in Postgres mode, one in SSE mode. The worker's claim, which
 * only sets the status, isn't counted.
 */
function WriteCount({ writes }: { writes: number }) {
  return (
    <span
      className="ml-2 text-xs"
      title="How many times the worker wrote this reply's text to Postgres. PowerSync syncs each write."
    >
      {writes} text {writes === 1 ? 'write' : 'writes'} to Postgres
    </span>
  );
}

/** Shown until the first tokens arrive. A pending reply hasn't reached the worker yet, e.g. while offline. */
function Thinking({ pending }: { pending: boolean }) {
  const { connected } = useStatus();

  if (pending && !connected) {
    return (
      <div className="flex items-center gap-2 text-[15px] text-muted">
        <CloudOff className="size-4" />
        Offline. The question is saved on this device and will be answered when you reconnect.
      </div>
    );
  }

  return <ThinkingLabel />;
}

/** Shown in turn while waiting for the first token. */
const THINKING_WORDS = [
  'Sinking',
  'Syncing',
  'Powersyncing',
  'Replicating',
  'Checkpointing',
  'Bucketing',
  'Compacting',
  'Streaming',
  'Tailing the WAL',
  'Applying ops',
  'Resolving conflicts',
  'Reticulating buckets',
  'Offline-firsting',
  'Draining the upload queue',
  'Awaiting a write checkpoint'
];

const THINKING_WORD_MS = 2000;

function ThinkingLabel() {
  const [index, setIndex] = React.useState(() => Math.floor(Math.random() * THINKING_WORDS.length));

  React.useEffect(() => {
    // Move to a random other word.
    const timer = setInterval(
      () => setIndex((i) => (i + 1 + Math.floor(Math.random() * (THINKING_WORDS.length - 1))) % THINKING_WORDS.length),
      THINKING_WORD_MS
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <div role="status" aria-label="Thinking" className="text-[15px] leading-7">
      {/* Keyed by the word, so each new word plays the fade-in again. */}
      <span key={index} aria-hidden className="shimmer inline-block">
        {THINKING_WORDS[index]}…
      </span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <IconButton label="Copy" onClick={() => copy(text)}>
      <CopyIcon copied={copied} className="size-4" />
    </IconButton>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="rounded-md p-1.5 transition-colors hover:bg-hover hover:text-ink"
    >
      {children}
    </button>
  );
}
