import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/components/providers/SystemProvider';
import { LoginDetailsWidget } from '@/components/widgets/LoginDetailsWidget';
import { DEFAULT_ENTRY_ROUTE, LOGIN_ROUTE } from '@/app/router';

export default function RegisterPage() {
  const supabase = useSupabase();
  const navigate = useNavigate();

  return (
    <LoginDetailsWidget
      title="Register"
      submitTitle="Register"
      onSubmit={async ({ email, password }) => {
        if (!supabase) {
          throw new Error('Supabase has not been initialized yet');
        }
        const {
          data: { session },
          error
        } = await supabase.client.auth.signUp({ email, password });
        if (error) {
          throw new Error(error.message);
        }

        if (session) {
          supabase.updateSession(session);
          navigate(DEFAULT_ENTRY_ROUTE);
          return;
        }

        // TODO better dialog
        alert('Registration successful, please login');
        navigate(LOGIN_ROUTE);
      }}
      secondaryActions={[{ title: 'Back', onClick: () => navigate(LOGIN_ROUTE) }]}
    />
  );
}
