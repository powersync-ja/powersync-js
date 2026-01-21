import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { LoginDetailsWidget } from '@/components/widgets/LoginDetailsWidget';
import { connector } from '@/library/powersync/ConnectionManager';

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    if (connector.hasCredentials()) {
      throw redirect({ to: '/sync-diagnostics' });
    }
  },
  component: LoginPage
});

function LoginPage() {
  const navigate = useNavigate();

  return (
    <LoginDetailsWidget
      onSubmit={async (values) => {
        await connector.signIn(values);
        navigate({ to: '/sync-diagnostics' });
      }}
    />
  );
}
