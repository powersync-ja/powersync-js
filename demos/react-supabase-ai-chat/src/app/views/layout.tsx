import { Sidebar } from '@/components/sidebar/Sidebar';
import React from 'react';
import { Outlet, useLocation } from 'react-router';

export type LayoutContext = {
  openSidebar: () => void;
};

export default function ViewsLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { pathname } = useLocation();

  // On small screens the sidebar is a drawer; close it after navigating.
  React.useEffect(() => setSidebarOpen(false), [pathname]);

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
