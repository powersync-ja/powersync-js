'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/providers/SystemProvider';
import { LoginDetailsWidget } from '@/components/widgets/LoginDetailsWidget';
import { DEFAULT_ENTRY_ROUTE } from '@/components/Routes';

export default function Register() {
  const supabase = useSupabase();
  const router = useRouter();

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
          router.push(DEFAULT_ENTRY_ROUTE);
          return;
        }

        // TODO better dialog
        alert('Registration successful, please login');
        router.back();
      }}
      secondaryActions={[{ title: 'Back', onClick: () => router.back() }]}
    />
  );
}
