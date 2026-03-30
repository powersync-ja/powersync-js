import { createFileRoute } from '@tanstack/react-router';
import InspectorOverviewPage from '@/app/views/inspector-overview';

export const Route = createFileRoute('/_authenticated/file-inspector/overview')({
  component: InspectorOverviewPage
});
