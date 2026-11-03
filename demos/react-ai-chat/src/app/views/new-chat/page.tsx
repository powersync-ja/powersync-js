import { chatRoute } from '@/app/router';
import { Composer } from '@/components/chat/Composer';
import { TopBar } from '@/components/chat/TopBar';
import { sendMessage } from '@/library/chat';
import { usePowerSync } from '@powersync/react';
import { useNavigate } from 'react-router';

const SUGGESTIONS = [
  {
    label: 'How does this reply stream?',
    prompt:
      'In two short paragraphs, explain how a chat app can stream AI replies by writing them to Postgres and syncing the rows to clients with PowerSync.'
  },
  {
    label: 'Tell me a story',
    prompt: 'Write a 500-word short story about a lighthouse keeper whose radio picks up a message from the future.'
  },
  {
    label: 'Write some SQL',
    prompt:
      'Write a SQLite query that returns the 3 most recent messages for each chat, from a messages table with chat_id, content and created_at columns.'
  },
  {
    label: 'Compare sync approaches',
    prompt: 'Compare CRDTs with server-authoritative sync for an offline-first app, as a short table.'
  }
];

export default function NewChatPage() {
  const db = usePowerSync();
  const navigate = useNavigate();

  const send = async (text: string) => {
    const chatId = await sendMessage(db, null, text);
    navigate(chatRoute(chatId));
  };

  return (
    <>
      <TopBar />
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-[14vh]">
        <img src="/powersync-mark.svg" alt="" className="mb-5 h-11" />
        <h1 className="mb-8 text-center text-[32px] leading-tight font-semibold tracking-[-0.02em]">
          How can I help you today?
        </h1>
        <div className="w-full max-w-chat">
          <Composer autoFocus onSend={send} />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion.label}
                type="button"
                onClick={() => send(suggestion.prompt)}
                className="rounded-full border border-line bg-raised/60 px-3.5 py-1.5 text-sm text-muted transition-colors hover:border-muted/40 hover:text-ink"
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
