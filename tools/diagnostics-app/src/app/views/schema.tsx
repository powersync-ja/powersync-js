import { NavigationPage } from '@/components/navigation/NavigationPage';
import { schemaManager } from '@/library/powersync/ConnectionManager';
import { Box, Grid, styled } from '@mui/material';

export default function SchemaPage() {
  const schema = schemaManager.schemaToString();
  const docs = `// This displays the inferred schema currently used by the diagnostics app.
// This is based on downloaded data, rather than the source database.
// If a table is empty, it will not display here.
// Tables and columns are only added here. Nothing is removed until the database is cleared.`;
  return (
    <NavigationPage title="Dynamic Schema">
      <S.MainContainer>
        <code>
          <pre>{docs}</pre>
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
