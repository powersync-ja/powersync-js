import { createFileRoute, redirect, Outlet, useNavigate, useLocation } from '@tanstack/react-router';
import { connector, signOut, useSyncStatus } from '@/library/powersync/ConnectionManager';
import { useMemo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  LogOut,
  ArrowUp,
  ArrowDown,
  Wifi,
  WifiOff,
  Database,
  Table2,
  Terminal,
  SlidersHorizontal
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { useNavigationPanel } from '@/components/navigation/NavigationPanelContext';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    if (!(await connector.hasCredentials())) {
      throw redirect({ to: '/login' });
    }
  },
  component: AuthenticatedLayout
});

function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { open } = useSidebar();

  const NAVIGATION_ITEMS = [
    { path: '/sync-diagnostics', title: 'Sync Overview', icon: Table2 },
    { path: '/schema', title: 'Dynamic Schema', icon: Database },
    { path: '/sql-console', title: 'SQL Console', icon: Terminal },
    { path: '/client-parameters', title: 'Client Parameters', icon: SlidersHorizontal },
    {
      path: '/login',
      title: 'Sign Out',
      beforeNavigate: async () => {
        await signOut();
      },
      icon: LogOut
    }
  ];

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className={cn('p-4', !open && 'p-2')}>
        {open ? (
          <img
            alt="PowerSync Logo"
            className="w-full max-w-[180px] object-contain"
            src="/powersync-logo.svg"
          />
        ) : (
          <img
            alt="PowerSync"
            className="w-8 h-8 object-contain rounded-[20%]"
            src="/icons/icon-192x192.png"
          />
        )}
      </SidebarHeader>
      <Separator className={cn('bg-sidebar-border', !open ? 'mx-1' : 'mx-2')} />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAVIGATION_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={!open ? item.title : undefined}
                      onClick={async () => {
                        await item.beforeNavigate?.();
                        navigate({ to: item.path });
                      }}>
                      <Icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarTrigger />
      </SidebarFooter>
    </Sidebar>
  );
}

function AuthenticatedLayout() {
  const syncStatus = useSyncStatus();
  const syncError = useMemo(() => syncStatus?.dataFlowStatus?.downloadError, [syncStatus]);
  const { title } = useNavigationPanel();

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        {/* Top Bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{title}</h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ArrowUp
              className={cn(
                'h-5 w-5 -mr-2.5',
                syncStatus?.dataFlowStatus.uploading ? 'text-primary' : 'text-muted-foreground'
              )}
            />
            <ArrowDown
              className={cn(
                'h-5 w-5',
                syncStatus?.dataFlowStatus.downloading ? 'text-primary' : 'text-muted-foreground'
              )}
            />
            {syncStatus?.connected ? (
              <Wifi className="h-5 w-5" />
            ) : (
              <span title={syncError?.message ?? 'Not connected'}>
                <WifiOff className="h-5 w-5" />
              </span>
            )}
          </div>
        </header>

        {/* Main Content Area - min-w-0 so wide table content scrolls inside DataTable, not the whole page */}
        <main className="flex-1 min-w-0 overflow-x-hidden p-4 md:p-6">
          {syncError ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>Sync error detected: {syncError.message}</AlertDescription>
            </Alert>
          ) : null}
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
