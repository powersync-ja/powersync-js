import { invoke } from '@tauri-apps/api/core';

export interface OpenDatabase {
  name: string;
  // Serialized schema for core extension
  schema: unknown;
}

// todo: serialize and parse bigints for i64?
export type SqliteValue = string | number | number[] | null;

export interface ExecuteSql {
  connection: number;
  sql: string;
  params: SqliteValue[];
  include_result_set: boolean;
}

export interface ExecuteBatch {
  connection: number;
  sql: string;
  params: SqliteValue[][];
}

export interface AcquireConnection {
  database: number;
  write: boolean;
  timeout?: number;
}

export type Command =
  | { OpenDatabase: OpenDatabase }
  | { CloseHandle: number }
  | { AcquireConnection: AcquireConnection }
  | { ExecuteSql: ExecuteSql }
  | { ExecuteBatch: ExecuteBatch };

export interface ExecuteSqlResult {
  is_autocommit: boolean;
  last_insert_rowid: number;
  changes: number;
  column_names: string[];
  rows: SqliteValue[][];
}

export interface ExecuteBatchResult {
  last_insert_rowid: number;
  changes: number;
}

export type CommandResult =
  | { CreatedHandle: number }
  | { ExecuteSqlResult: ExecuteSqlResult }
  | { ExecuteBatchResult: ExecuteBatchResult }
  | 'Void';

export async function powersyncCommand(command: Command): Promise<CommandResult> {
  return await invoke<CommandResult>('plugin:powersync|powersync', {
    payload: {
      command
    }
  });
}
