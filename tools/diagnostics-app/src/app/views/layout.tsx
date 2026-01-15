import {
  LogOut,
  ArrowUp,
  ArrowDown,
  Wifi,
  WifiOff,
  Database,
  Table2,
  Terminal,
  User
} from 'lucide-react';
import React, { useMemo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

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

import {
  CLIENT_PARAMETERS_ROUTE,
  LOGIN_ROUTE,
  SCHEMA_ROUTE,
  SQL_CONSOLE_ROUTE,
  SYNC_DIAGNOSTICS_ROUTE
} from '@/app/router';
import { useNavigationPanel } from '@/components/navigation/NavigationPanelContext';
import { signOut, useSyncStatus } from '@/library/powersync/ConnectionManager';
import { useNavigate, useLocation } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';

function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { open } = useSidebar();

  const NAVIGATION_ITEMS = [
    { path: SYNC_DIAGNOSTICS_ROUTE, title: 'Sync Overview', icon: Table2 },
    { path: SCHEMA_ROUTE, title: 'Dynamic Schema', icon: Database },
    { path: SQL_CONSOLE_ROUTE, title: 'SQL Console', icon: Terminal },
    { path: CLIENT_PARAMETERS_ROUTE, title: 'Client Parameters', icon: User },
    {
      path: LOGIN_ROUTE,
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
                        navigate(item.path);
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

export default function ViewsLayout({ children }: { children: React.ReactNode }) {
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
            {syncStatus?.clientImplementation && (
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Client: {syncStatus?.clientImplementation}
              </span>
            )}
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

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          {syncError ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>Sync error detected: {syncError.message}</AlertDescription>
            </Alert>
          ) : null}
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
