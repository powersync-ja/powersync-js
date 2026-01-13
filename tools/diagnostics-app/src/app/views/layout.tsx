import {
  LogOut,
  Menu,
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
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import {
  CLIENT_PARAMETERS_ROUTE,
  LOGIN_ROUTE,
  SCHEMA_ROUTE,
  SQL_CONSOLE_ROUTE,
  SYNC_DIAGNOSTICS_ROUTE
} from '@/app/router';
import { useNavigationPanel } from '@/components/navigation/NavigationPanelContext';
import { signOut, useSyncStatus } from '@/library/powersync/ConnectionManager';
import { usePowerSync } from '@powersync/react';
import { useNavigate } from 'react-router-dom';

export default function ViewsLayout({ children }: { children: React.ReactNode }) {
  const powerSync = usePowerSync();
  const navigate = useNavigate();

  const syncStatus = useSyncStatus();
  const syncError = useMemo(() => syncStatus?.dataFlowStatus?.downloadError, [syncStatus]);
  const { title } = useNavigationPanel();

  const [mobileOpen, setMobileOpen] = React.useState(false);

  const NAVIGATION_ITEMS = React.useMemo(
    () => [
      {
        path: SYNC_DIAGNOSTICS_ROUTE,
        title: 'Sync Overview',
        icon: Table2
      },
      {
        path: SCHEMA_ROUTE,
        title: 'Dynamic Schema',
        icon: Database
      },
      {
        path: SQL_CONSOLE_ROUTE,
        title: 'SQL Console',
        icon: Terminal
      },
      {
        path: CLIENT_PARAMETERS_ROUTE,
        title: 'Client Parameters',
        icon: User
      },
      {
        path: LOGIN_ROUTE,
        title: 'Sign Out',
        beforeNavigate: async () => {
          await signOut();
        },
        icon: LogOut
      }
    ],
    [powerSync]
  );

  const drawerWidth = 320;

  const NavigationContent = () => (
    <>
      <div className="p-5">
        <img
          alt="PowerSync Logo"
          className="max-w-[250px] max-h-[250px] object-contain"
          src="/powersync-logo.svg"
        />
      </div>
      <Separator />
      <nav className="p-2">
        {NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.path}
              variant="ghost"
              className="w-full justify-start"
              onClick={async () => {
                await item.beforeNavigate?.();
                navigate(item.path);
                setMobileOpen(false);
              }}>
              <Icon className="mr-2 h-4 w-4" />
              {item.title}
            </Button>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Mobile Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[320px] p-0">
          <NavigationContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-[320px] flex-shrink-0 border-r">
        <NavigationContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-4 md:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 md:hidden"
              onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              {syncStatus?.clientImplementation && (
                <span className="text-sm text-muted-foreground">Client: {syncStatus?.clientImplementation}</span>
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
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 pt-3">
          {syncError ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>Sync error detected: {syncError.message}</AlertDescription>
            </Alert>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
