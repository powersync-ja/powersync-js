import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/inspector/')({
  beforeLoad: () => {
    throw redirect({ to: '/inspector/overview' });
  }
});
