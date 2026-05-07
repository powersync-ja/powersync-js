import React from 'react';
import { CircularProgress, Grid, styled } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuthToken } from '@convex-dev/auth/react';
import { TODO_LISTS_ROUTE, AUTH_ROUTE } from './router';

export default function EntryPage() {
  const navigate = useNavigate();
  const authToken = useAuthToken();

  React.useEffect(() => {
    if (authToken) {
      navigate(TODO_LISTS_ROUTE);
    } else {
      navigate(AUTH_ROUTE);
    }
  }, [authToken, navigate]);

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
