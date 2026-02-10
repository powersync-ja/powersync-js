import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { LoginDetailsWidget } from '@/components/widgets/LoginDetailsWidget';
import { connector } from '@/library/powersync/ConnectionManager';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    if (await connector.hasCredentials()) {
      throw redirect({ to: '/sync-diagnostics' });
    }
  },
  component: LoginPage
});

function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="relative">
      <div className="absolute top-4 left-4">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/' })}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Home
        </Button>
      </div>
      <LoginDetailsWidget
        onSubmit={async (values) => {
          await connector.signIn(values);
          navigate({ to: '/sync-diagnostics' });
        }}
      />
    </div>
  );
}
