import { Composer } from '@/components/chat/Composer';
import { Message } from '@/components/chat/Message';
import { TopBar } from '@/components/chat/TopBar';
import { retryReply, sendMessage, stopReply } from '@/library/chat';
import { cn } from '@/library/cn';
import { ChatRecord, MessageRecord } from '@/library/powersync/AppSchema';
import { usePowerSync, useQuery } from '@powersync/react';
import { ArrowDown } from 'lucide-react';
import React from 'react';
import { useParams } from 'react-router';

export default function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  // Remount per chat, so scroll position and the draft start fresh.
  return <ChatView key={chatId} chatId={chatId!} />;
}

function ChatView({ chatId }: { chatId: string }) {
  const db = usePowerSync();

  // Subscribe to this chat's messages while it is open (the `chat_messages` stream in powersync/sync-config.yaml).
  // The AI worker writes replies to these rows as they generate, so this query re-runs as each write syncs.
  // Comparing rows keeps unchanged messages as the same objects, so only the streaming message re-renders.
  const { data: messages } = useQuery<MessageRecord>(
    'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at',
    [chatId],
    {
      streams: [{ name: 'chat_messages', parameters: { chat_id: chatId } }],
      rowComparator: {
        keyBy: (message: MessageRecord) => message.id,
        compareBy: (message: MessageRecord) => JSON.stringify(message)
      }
    }
  );
  const { data: chats } = useQuery<ChatRecord>('SELECT * FROM chats WHERE id = ?', [chatId]);

  const last = messages.at(-1);
  const replying = last?.role === 'assistant' && (last.status === 'pending' || last.status === 'streaming');

  const { scrollRef, contentRef, atBottom, scrollToBottom } = useStickToBottom();

  const retry = React.useCallback((messageId: string) => retryReply(db, messageId), [db]);

  return (
    <>
      <TopBar title={chats[0]?.title ?? undefined} />
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6">
        <div ref={contentRef} className="mx-auto flex max-w-3xl flex-col gap-8 pt-4 pb-10">
          {messages.map((message) => (
            <Message key={message.id} message={message} onRetry={message === last && !replying ? retry : undefined} />
          ))}
        </div>
      </div>
      <div className="px-4 pb-4 md:px-6">
        <div className="relative mx-auto max-w-3xl">
          <button
            type="button"
            aria-label="Scroll to bottom"
            onClick={scrollToBottom}
            inert={atBottom}
            className={cn(
              'absolute -top-12 left-1/2 flex size-9 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-raised text-muted shadow-[0_2px_12px_rgb(0_0_0/0.08)] transition-opacity hover:text-ink',
              atBottom && 'opacity-0'
            )}
          >
            <ArrowDown className="size-4" />
          </button>
          <Composer
            autoFocus
            onSend={(text) => {
              scrollToBottom();
              sendMessage(db, chatId, text);
            }}
            onStop={replying ? () => stopReply(db, last.id) : undefined}
          />
          <p className="mt-2.5 text-center text-xs text-muted">
            Replies are written to Postgres as they generate and synced to every open tab and device by PowerSync.
          </p>
        </div>
      </div>
    </>
  );
}

/**
 * Keeps the scroll container pinned to the bottom as its content grows, unless the user has scrolled up. Watching the
 * content's size also follows replies as they are revealed between synced writes.
 */
function useStickToBottom() {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  // The same flag twice: a ref for the resize observer, and state to show or hide the scroll button.
  const pinned = React.useRef(true);
  const [atBottom, setAtBottom] = React.useState(true);

  React.useEffect(() => {
    const scroller = scrollRef.current!;
    const onScroll = () => {
      pinned.current = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80;
      setAtBottom(pinned.current);
    };
    const resizes = new ResizeObserver(() => {
      if (pinned.current) scroller.scrollTop = scroller.scrollHeight;
    });

    scroller.addEventListener('scroll', onScroll, { passive: true });
    resizes.observe(contentRef.current!);
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      resizes.disconnect();
    };
  }, []);

  const scrollToBottom = () => {
    pinned.current = true;
    setAtBottom(true);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  };

  return { scrollRef, contentRef, atBottom, scrollToBottom };
}
