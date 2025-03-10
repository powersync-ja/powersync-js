import {OPSqliteOpenFactory} from '@powersync/op-sqlite';
import {
  column,
  PowerSyncContext,
  PowerSyncDatabase,
  Schema,
  Table,
} from '@powersync/react-native';
import React, {JSX} from 'react';

const AppSchema = new Schema({
  lists: new Table({
    name: column.text,
  }),
});

export const WithPowerSync = ({children}: {children: JSX.Element}) => {
  const powerSync = React.useMemo(
    () =>
      new PowerSyncDatabase({
        database: new OPSqliteOpenFactory({
          dbFilename: 'sqlite.db',
        }),
        schema: AppSchema,
      }),
    [],
  );

  React.useEffect(() => {
    return () => {
      powerSync.close();
    };
  });

  return (
    <PowerSyncContext.Provider value={powerSync}>
      {children}
    </PowerSyncContext.Provider>
  );
};
