'use client';

import React from 'react';
import { CircularProgress, Grid, styled } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/providers/SystemProvider';

export default function EntryPage() {
  const router = useRouter();
  const connector = useSupabase();

  React.useEffect(() => {
    if (!connector) {
      console.error(`No Supabase connector has been created yet.`);
      return;
    }

    const redirectToDocument = async () => {
      // see if there is a cached value of last document edited
      let lastDocumentId: string | null = window.localStorage.getItem('lastDocumentId');
      if (lastDocumentId) {
        router.push('/editor/' + lastDocumentId);
        return;
      }
      // otherwise, create a new document
      const { data, error } = await connector.client
        .from('documents')
        .insert({
          title: 'Test Document ' + (1000 + Math.floor(Math.random() * 8999))
        })
        .select()
        .single();

      // redirect user to the document
      lastDocumentId = data.id;
      window.localStorage.setItem('lastDocumentId', lastDocumentId || '');
      router.push('/editor/' + lastDocumentId);
    };

    if (!connector.ready) {
      console.log('PowerSync<>Supabase connector not yet ready; registering listener');
      const listener = connector.registerListener({
        initialized: () => {
          redirectToDocument();
        }
      });
      return () => listener?.();
    }

    redirectToDocument();
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
