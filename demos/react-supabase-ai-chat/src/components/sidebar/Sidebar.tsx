import { chatRoute, NEW_CHAT_ROUTE } from '@/app/router';
import { deleteChat } from '@/library/chat';
import { cn } from '@/library/cn';
import { ChatRecord } from '@/library/powersync/AppSchema';
import { usePowerSync, useQuery } from '@powersync/react';
import { SquarePen, Trash2 } from 'lucide-react';
import { Link, NavLink, useMatch, useNavigate } from 'react-router';
import { SyncStatus } from './SyncStatus';

type ChatListItem = Pick<ChatRecord, 'id' | 'title'> & { replying: number };

export function Sidebar({ open }: { open: boolean }) {
  const db = usePowerSync();
  const navigate = useNavigate();
  const activeChatId = useMatch('/chat/:chatId')?.params.chatId;

  // `replying` only covers chats whose messages are synced, i.e. chats opened recently on this device.
  const { data: chats } = useQuery<ChatListItem>(`
    SELECT chats.id, chats.title, EXISTS (
      SELECT 1 FROM messages WHERE messages.chat_id = chats.id AND messages.status IN ('pending', 'streaming')
    ) AS replying
    FROM chats
    ORDER BY chats.updated_at DESC
  `);

  const remove = async (chatId: string) => {
    await deleteChat(db, chatId);
    if (chatId === activeChatId) navigate(NEW_CHAT_ROUTE);
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-line bg-sidebar transition-transform md:static md:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <Link to={NEW_CHAT_ROUTE} className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <img src="/powersync-mark.svg" alt="" className="h-6 w-6" />
        <span className="font-semibold tracking-tight">PowerSync Chat</span>
      </Link>

      <div className="px-3">
        <Link
          to={NEW_CHAT_ROUTE}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium hover:bg-hover"
        >
          <SquarePen className="size-4" />
          New chat
        </Link>
      </div>

      <nav className="mt-5 flex-1 overflow-y-auto px-3 pb-3">
        {chats.length > 0 && <p className="px-3 pb-1.5 text-xs font-medium text-muted">Chats</p>}
        {chats.map((chat) => (
          <NavLink
            key={chat.id}
            to={chatRoute(chat.id)}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-2 rounded-lg py-2 pr-2 pl-3 text-sm',
                isActive ? 'bg-hover font-medium' : 'hover:bg-hover'
              )
            }
          >
            <span className="min-w-0 flex-1 truncate">{chat.title}</span>
            {chat.replying ? <span className="size-2 shrink-0 animate-pulse rounded-full bg-brand" /> : null}
            <button
              type="button"
              aria-label="Delete chat"
              onClick={(event) => {
                event.preventDefault();
                remove(chat.id);
              }}
              className="hidden shrink-0 rounded p-0.5 text-muted group-hover:block hover:text-ink"
            >
              <Trash2 className="size-4" />
            </button>
          </NavLink>
        ))}
      </nav>

      <SyncStatus />
    </aside>
  );
}
