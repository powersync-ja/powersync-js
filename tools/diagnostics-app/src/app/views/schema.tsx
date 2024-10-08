import { NavigationPage } from '@/components/navigation/NavigationPage';
import { schemaManager } from '@/library/powersync/ConnectionManager';
import { Box, Grid, styled } from '@mui/material';

export default function SchemaPage() {
  const schema = schemaManager.schemaToString();
  const docs = `/**
 * This is the inferred schema of the data received by the diagnostics app.
 * Because this schema is generated on-the-fly based on the data received by the app, it can
 * be incomplete and should NOT be relied upon as a source of truth for your app schema.
 * If a table is empty, it will not be shown here.
 * If a column contains only NULL values, the column will not be shown here.
 * Tables and columns are only added here. Nothing is removed until the database is cleared.
 */`;
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
