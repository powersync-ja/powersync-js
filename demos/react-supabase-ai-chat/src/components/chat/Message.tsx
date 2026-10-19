import { MessageRecord, MessageStatus } from '@/library/powersync/AppSchema';
import { useStatus } from '@powersync/react';
import { Check, CloudOff, Copy, RotateCcw, TriangleAlert } from 'lucide-react';
import React from 'react';
import { Markdown } from './Markdown';
import { useCopyToClipboard } from './useCopyToClipboard';
import { useSmoothText } from './useSmoothText';

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
        <div className="max-w-[85%] rounded-3xl bg-bubble px-5 py-2.5 text-[15px] leading-7 break-words whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  return <Reply message={message} onRetry={onRetry} />;
});

function Reply({ message, onRetry }: MessageProps) {
  const status = message.status as MessageStatus;
  const content = message.content ?? '';
  const text = useSmoothText(content);
  const revealing = text.length < content.length;
  const finished = (status === 'done' || status === 'stopped' || status === 'error') && !revealing;
  const writes = message.write_count ?? 0;

  return (
    <div>
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
        <div className="mt-2 flex items-center gap-1 text-muted">
          {status === 'stopped' && <span className="mr-2 text-sm">Stopped</span>}
          {status !== 'error' && content && <CopyButton text={content} />}
          {onRetry && (
            <IconButton label="Retry" onClick={() => onRetry(message.id)}>
              <RotateCcw className="size-4" />
            </IconButton>
          )}
          {status !== 'error' && writes > 0 && (
            <span className="ml-2 text-xs" title="Each write synced to this device as one update">
              Streamed in {writes} {writes === 1 ? 'write' : 'writes'}
            </span>
          )}
        </div>
      )}
    </div>
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
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
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
