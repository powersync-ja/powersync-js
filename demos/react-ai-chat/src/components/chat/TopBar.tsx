import { LayoutContext } from '@/app/views/layout';
import { Menu } from 'lucide-react';
import { useOutletContext } from 'react-router';

export function TopBar({ title }: { title?: string }) {
  const { openSidebar } = useOutletContext<LayoutContext>();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 px-3 md:px-5">
      <button
        type="button"
        aria-label="Open sidebar"
        onClick={openSidebar}
        className="rounded-lg p-2 text-muted hover:bg-hover hover:text-ink md:hidden"
      >
        <Menu className="size-5" />
      </button>
      {title && <h1 className="truncate text-sm font-medium">{title}</h1>}
    </header>
  );
}
