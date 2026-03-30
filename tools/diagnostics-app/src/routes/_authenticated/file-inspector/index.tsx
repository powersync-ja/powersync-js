import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/file-inspector/')({
  beforeLoad: () => {
    throw redirect({ to: '/file-inspector/overview' });
  }
});
