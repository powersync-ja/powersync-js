import { NEW_CHAT_ROUTE } from '@/app/router';
import { Sidebar } from '@/components/sidebar/Sidebar';
import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';

export type LayoutContext = {
  openSidebar: () => void;
};

export default function ViewsLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // On small screens the sidebar is a drawer; close it after navigating.
  React.useEffect(() => setSidebarOpen(false), [pathname]);

  // Shift+Cmd+O (Shift+Ctrl+O on Windows and Linux) starts a new chat, as in other chat apps.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        navigate(NEW_CHAT_ROUTE);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  return (
    <div className="flex h-dvh overflow-hidden bg-surface text-ink">
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar open={sidebarOpen} />
      <main className="flex min-w-0 flex-1 flex-col">
        <Outlet context={{ openSidebar: () => setSidebarOpen(true) } satisfies LayoutContext} />
      </main>
    </div>
  );
}
