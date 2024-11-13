import { CompilableQuery } from '@powersync/common';
import { Query } from 'drizzle-orm';

export function toCompilableQuery<T>(query: {
  execute: () => Promise<T | T[]>;
  toSQL: () => Query;
}): CompilableQuery<T> {
  return {
    compile: () => {
      const sql = query.toSQL();
      return {
        sql: sql.sql,
        parameters: sql.params
      };
    },
    execute: async () => {
      const result = await query.execute();
      return Array.isArray(result) ? result : [result];
    }
  };
}
