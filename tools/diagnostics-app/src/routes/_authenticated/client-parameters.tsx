import { createFileRoute } from '@tanstack/react-router';
import ClientParamsPage from '@/app/views/client-params';

export const Route = createFileRoute('/_authenticated/client-parameters')({
  component: ClientParamsPage
});
