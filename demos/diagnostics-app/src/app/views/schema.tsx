import { NavigationPage } from '@/components/navigation/NavigationPage';
import { schemaManager } from '@/library/powersync/ConnectionManager';
import { Box, Grid, styled } from '@mui/material';

export default function SchemaPage() {
  const schema = schemaManager.schemaToString();
  return (
    <NavigationPage title="Dynamic Schema">
      <S.MainContainer>
        <code>
          <pre>{schema}</pre>
        </code>
      </S.MainContainer>
    </NavigationPage>
  );
}

namespace S {
  export const MainContainer = styled(Box)`
    padding: 20px;
  `;

  export const QueryResultContainer = styled(Box)`
    margin-top: 40px;
  `;

  export const CenteredGrid = styled(Grid)`
    display: flex;
    justify-content: center;
    align-items: center;
  `;
}
