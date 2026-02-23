import React from 'react';
import { NavigationPage } from '@/components/navigation/NavigationPage';
import { SQLConsoleCore, POWERSYNC_TEMPLATE_QUERIES } from '@/app/views/shared/sql-console-core';
import { useInspectorDatabase } from '@/library/inspector/InspectorContext';

const DEFAULT_QUERY = `SELECT name, type FROM sqlite_master ORDER BY type, name`;

export default function InspectorSQLConsolePage() {
  const database = useInspectorDatabase();

  const executeQuery = React.useCallback(
    async (sql: string) => {
      return database.getAll(sql);
    },
    [database]
  );

  return (
    <NavigationPage title="SQL Console">
      <SQLConsoleCore executeQuery={executeQuery} defaultQuery={DEFAULT_QUERY} historySource="inspector" templateQueries={POWERSYNC_TEMPLATE_QUERIES} />
    </NavigationPage>
  );
}
