import React from 'react';
import { NavigationPage } from '@/components/navigation/NavigationPage';
import { SQLConsoleCore, POWERSYNC_TEMPLATE_QUERIES } from '@/app/views/shared/sql-console-core';
import { db, useSchemaReady } from '@/library/powersync/ConnectionManager';

const DEFAULT_QUERY = `SELECT name FROM ps_buckets`;

export default function SQLConsolePage() {
  const schemaReady = useSchemaReady();

  const executeQuery = React.useCallback(async (sql: string) => {
    return db.getAll(sql, []) as Promise<Record<string, any>[]>;
  }, []);

  return (
    <NavigationPage title="SQL Console">
      <SQLConsoleCore executeQuery={executeQuery} defaultQuery={DEFAULT_QUERY} ready={schemaReady} templateQueries={POWERSYNC_TEMPLATE_QUERIES} />
    </NavigationPage>
  );
}
