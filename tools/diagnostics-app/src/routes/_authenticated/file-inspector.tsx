import { createFileRoute, Outlet, useNavigate, useLocation } from '@tanstack/react-router';
import { useInspector } from '@/library/inspector/InspectorContext';
import { FileDropZone } from '@/components/widgets/FileDropZone';
import { NavigationPage } from '@/components/navigation/NavigationPage';
import { Button } from '@/components/ui/button';
import { Database, Terminal, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_authenticated/file-inspector')({
  component: AuthenticatedInspectorInner
});

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function AuthenticatedInspectorInner() {
  const { isLoaded, isLoading, error, openFile, closeFile, fileInfo } = useInspector();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isLoaded) {
    return <FileDropZone onFileSelected={openFile} isLoading={isLoading} error={error} />;
  }

  const tabs = [
    { path: '/file-inspector/overview', label: 'Database Overview', icon: Database },
    { path: '/file-inspector/sql-console', label: 'SQL Console', icon: Terminal }
  ];

  return (
    <NavigationPage title="File Inspector">
      <div className="space-y-4">
        {/* File info bar + sub-navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5">
              <span className="text-sm font-mono truncate max-w-[200px]" title={fileInfo?.name}>
                {fileInfo?.name}
              </span>
              <span className="text-xs text-muted-foreground">{fileInfo ? formatBytes(fileInfo.size) : ''}</span>
            </div>
            <div className="flex items-center gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = location.pathname === tab.path;
                return (
                  <Button
                    key={tab.path}
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => navigate({ to: tab.path })}
                    className={cn('gap-1.5', isActive && 'font-medium')}>
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </Button>
                );
              })}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => closeFile()} className="gap-1.5 text-muted-foreground">
            <FolderOpen className="h-4 w-4" />
            Open New File
          </Button>
        </div>

        <Outlet />
      </div>
    </NavigationPage>
  );
}
