import { createFileRoute } from '@tanstack/react-router';
import InspectorOverviewPage from '@/app/views/inspector-overview';

export const Route = createFileRoute('/inspector/overview')({
  component: InspectorOverviewPage
});
