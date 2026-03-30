import { createFileRoute } from '@tanstack/react-router';
import SyncDiagnosticsPage from '@/app/views/sync-diagnostics';

export const Route = createFileRoute('/_authenticated/sync-diagnostics')({
  component: SyncDiagnosticsPage
});
