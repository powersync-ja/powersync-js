import React from 'react';
import { NavigationPage } from '@/components/navigation/NavigationPage';
import { SQLConsoleCore } from '@/app/views/shared/sql-console-core';
import { db } from '@/library/powersync/ConnectionManager';

const DEFAULT_QUERY = `SELECT name FROM ps_buckets`;

export default function SQLConsolePage() {
  const executeQuery = React.useCallback(async (sql: string) => {
    return db.getAll(sql, []) as Promise<Record<string, any>[]>;
  }, []);

  return (
    <NavigationPage title="SQL Console">
      <SQLConsoleCore executeQuery={executeQuery} defaultQuery={DEFAULT_QUERY} />
    </NavigationPage>
  );
}
