import { createFileRoute, Outlet, useNavigate, useLocation } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { Database, Terminal, FolderOpen, Home, FileText } from 'lucide-react';
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
import { InspectorProvider, useInspector } from '@/library/inspector/InspectorContext';
import { FileDropZone } from '@/components/widgets/FileDropZone';

export const Route = createFileRoute('/inspector')({
  component: InspectorLayout
});

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function InspectorLayout() {
  return (
    <InspectorProvider>
      <InspectorLayoutInner />
    </InspectorProvider>
  );
}

function InspectorLayoutInner() {
  const { isLoaded, isLoading, error, openFile } = useInspector();

  if (!isLoaded) {
    return <FileDropZone onFileSelected={openFile} isLoading={isLoading} error={error} />;
  }

  return (
    <SidebarProvider>
      <InspectorSidebar />
      <SidebarInset>
        <InspectorHeader />
        <main className="flex-1 min-w-0 overflow-x-hidden p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function InspectorSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { open } = useSidebar();
  const { closeFile } = useInspector();

  const NAVIGATION_ITEMS = [
    { path: '/inspector/overview' as const, title: 'Database Overview', icon: Database },
    { path: '/inspector/sql-console' as const, title: 'SQL Console', icon: Terminal }
  ];

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className={cn('p-4', !open && 'p-2')}>
        {open ? (
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <span className="text-sm font-semibold truncate">File Inspector</span>
          </div>
        ) : (
          <FileText className="w-8 h-8 text-primary" />
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
                      onClick={() => navigate({ to: item.path })}>
                      <Icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className={cn('bg-sidebar-border', !open ? 'mx-1' : 'mx-2')} />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={!open ? 'Open New File' : undefined}
                  onClick={async () => {
                    await closeFile();
                  }}>
                  <FolderOpen />
                  <span>Open New File</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={!open ? 'Back to Home' : undefined}
                  onClick={() => navigate({ to: '/' })}>
                  <Home />
                  <span>Back to Home</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
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

function InspectorHeader() {
  const { fileInfo } = useInspector();
  const { title } = useNavigationPanel();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold truncate">{title}</h1>
      </div>
      {fileInfo && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-shrink-0">
          <span className="font-mono truncate max-w-[200px]" title={fileInfo.name}>
            {fileInfo.name}
          </span>
          <span>{formatBytes(fileInfo.size)}</span>
        </div>
      )}
    </header>
  );
}
