import { chatRoute, NEW_CHAT_ROUTE } from '@/app/router';
import { deleteChat } from '@/library/chat';
import { cn } from '@/library/cn';
import { ChatRecord } from '@/library/powersync/AppSchema';
import { usePowerSync, useQuery } from '@powersync/react';
import { SquarePen, Trash2 } from 'lucide-react';
import { Link, NavLink, useMatch, useNavigate } from 'react-router';
import { SyncStatus } from './SyncStatus';

type ChatListItem = Pick<ChatRecord, 'id' | 'title' | 'updated_at'> & { replying: number };

/** The new chat shortcut, which the views layout handles. */
const NEW_CHAT_SHORTCUT = /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⇧⌘O' : 'Ctrl+Shift+O';

export function Sidebar({ open }: { open: boolean }) {
  const db = usePowerSync();
  const navigate = useNavigate();
  const activeChatId = useMatch('/chat/:chatId')?.params.chatId;

  // `replying` only covers chats whose messages are synced, i.e. chats opened recently on this device.
  const { data: chats } = useQuery<ChatListItem>(`
    SELECT chats.id, chats.title, chats.updated_at, EXISTS (
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
          aria-keyshortcuts="Meta+Shift+O Control+Shift+O"
          className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium hover:bg-hover"
        >
          <SquarePen className="size-4" />
          New chat
          <kbd className="ml-auto font-sans text-xs font-normal text-muted opacity-0 transition-opacity pointer-fine:group-hover:opacity-100">
            {NEW_CHAT_SHORTCUT}
          </kbd>
        </Link>
      </div>

      <nav className="mt-5 flex-1 overflow-y-auto px-3 pb-3">
        {groupByDate(chats).map(([label, group]) => (
          <section key={label} className="mb-4">
            <h2 className="px-3 pb-1.5 text-xs font-medium text-muted">{label}</h2>
            {group.map((chat) => (
              <ChatLink key={chat.id} chat={chat} onDelete={remove} />
            ))}
          </section>
        ))}
      </nav>

      <SyncStatus />
    </aside>
  );
}

function ChatLink({ chat, onDelete }: { chat: ChatListItem; onDelete: (chatId: string) => void }) {
  return (
    <NavLink
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
          onDelete(chat.id);
        }}
        className="hidden shrink-0 rounded p-0.5 text-muted group-hover:block hover:text-ink"
      >
        <Trash2 className="size-4" />
      </button>
    </NavLink>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Groups for the chat list, by how many days before today a chat was last used. Anything older is "Older". */
const DATE_GROUPS = [
  { label: 'Today', days: 0 },
  { label: 'Yesterday', days: 1 },
  { label: 'Previous 7 days', days: 7 },
  { label: 'Previous 30 days', days: 30 }
];

/** Splits chats, already sorted newest first, into date groups in the same order. */
function groupByDate(chats: ChatListItem[]) {
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const groups = new Map<string, ChatListItem[]>();

  for (const chat of chats) {
    const updatedAt = new Date(chat.updated_at ?? 0).getTime();
    const label = DATE_GROUPS.find(({ days }) => updatedAt >= startOfToday - days * DAY_MS)?.label ?? 'Older';
    const group = groups.get(label);
    if (group) {
      group.push(chat);
    } else {
      groups.set(label, [chat]);
    }
  }

  return [...groups];
}
