import { createFileRoute } from '@tanstack/react-router';
import InspectorSQLConsolePage from '@/app/views/inspector-sql-console';

export const Route = createFileRoute('/_authenticated/file-inspector/sql-console')({
  component: InspectorSQLConsolePage
});
