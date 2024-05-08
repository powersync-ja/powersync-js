import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginDetailsWidget } from '@/components/widgets/LoginDetailsWidget';
import { useSupabase } from '@/components/providers/SystemProvider';
import { DEFAULT_ENTRY_ROUTE } from '@/app/router';

export default function LoginPage() {
  const supabase = useSupabase();
  const navigate = useNavigate();

  return (
    <LoginDetailsWidget
      title="Login"
      submitTitle="Login"
      onSubmit={async (values) => {
        if (!supabase) {
          throw new Error('Supabase has not been initialized yet');
        }
        await supabase.login(values.email, values.password);
        navigate(DEFAULT_ENTRY_ROUTE);
      }}
      secondaryActions={[
        {
          title: 'Register',
          onClick: () => {
            navigate('/auth/register');
          }
        }
      ]}
    />
  );
}
