import { createFileRoute } from '@tanstack/react-router';
import SQLConsolePage from '@/app/views/sql-console';

export const Route = createFileRoute('/_authenticated/sql-console')({
  component: SQLConsolePage
});
