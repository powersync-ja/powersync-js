'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { LoginDetailsWidget } from '@/components/widgets/LoginDetailsWidget';
import { useSupabase } from '@/components/providers/SystemProvider';
import { DEFAULT_ENTRY_ROUTE } from '@/components/Routes';

export default function Login() {
  const router = useRouter();
  const supabase = useSupabase();

  return (
    <LoginDetailsWidget
      title="Login"
      submitTitle="Login"
      onSubmit={async (values) => {
        if (!supabase) {
          throw new Error('Supabase has not been initialized yet');
        }
        await supabase.login(values.email, values.password);
        router.push(DEFAULT_ENTRY_ROUTE);
      }}
      secondaryActions={[{ title: 'Register', onClick: () => router.push('/auth/register') }]}
    />
  );
}
