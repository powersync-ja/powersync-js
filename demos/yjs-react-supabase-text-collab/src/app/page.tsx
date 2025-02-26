import React from 'react';
import { CircularProgress, Grid, styled } from '@mui/material';
import { useSupabase } from '@/components/providers/SystemProvider';
import { useNavigate } from 'react-router-dom';
import { usePowerSync } from '@powersync/react';

export default function EntryPage() {
  const navigate = useNavigate();
  const connector = useSupabase();
  const powerSync = usePowerSync();

  React.useEffect(() => {
    if (!connector) {
      console.error(`No Supabase connector has been created yet.`);
      return;
    }

    const redirectToDocument = async () => {
      // see if there is a cached value of last document edited
      let lastDocumentId: string | null = window.localStorage.getItem('lastDocumentId');
      if (lastDocumentId) {
        navigate('/editor/' + lastDocumentId);
        return;
      }
      // otherwise, create a new document
      const results = await powerSync.execute('INSERT INTO documents(id, title) VALUES(uuid(), ?) RETURNING id', [
        'Test Document ' + (1000 + Math.floor(Math.random() * 8999))
      ]);
      const documentId = results.rows!.item(0).id;

      // redirect user to the document
      lastDocumentId = documentId;
      window.localStorage.setItem('lastDocumentId', documentId);
      navigate('/editor/' + lastDocumentId);
    };

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
