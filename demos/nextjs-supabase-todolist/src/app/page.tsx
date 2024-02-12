'use client';
import React from 'react';
import { CircularProgress, Grid, styled } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/providers/SystemProvider';
import { DEFAULT_ENTRY_ROUTE } from '@/components/Routes';

export type LoginFormParams = {
  email: string;
  password: string;
};

/**
 * This page shows a loading spinner until the _layout.tsx
 * file detects a session and redirects either to the app or
 * auth flow.
 */
export default function EntryPage() {
  const router = useRouter();
  const connector = useSupabase();

  const navigateToMainView = () => {
    if (connector?.currentSession) {
      router.push(DEFAULT_ENTRY_ROUTE);
    }
  };

  React.useEffect(() => {
    if (!connector) {
      console.error(`No Supabase connector has been created yet.`);
      return;
    }

    if (!connector.ready) {
      const l = connector.registerListener({
        initialized: () => {
          /**
           * Redirect if on the entry view
           */
          if (connector.currentSession) {
            router.push(DEFAULT_ENTRY_ROUTE);
          }
        }
      });
      return () => l?.();
    }

    // There should be a session at this point. The auth guard will navigate to the login if not
    navigateToMainView();
  }, []);

  return (
    <S.MainGrid container>
      <S.CenteredGrid item xs={12} md={6} lg={5}>
        <CircularProgress />
      </S.CenteredGrid>
    </S.MainGrid>
  );
}

namespace S {
  export const CenteredGrid = styled(Grid)`
    display: flex;
    justify-content: center;
    align-items: center;
  `;

  export const MainGrid = styled(CenteredGrid)`
    min-height: 100vh;
  `;
}
