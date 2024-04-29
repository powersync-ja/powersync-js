import type { CompilableQuery } from '../types/types';

export const parseQuery = <T>(query: string | CompilableQuery<T>) => {
  let sqlStatement: string;
  let parameters: any[] = [];
  if (typeof query == 'string') {
    sqlStatement = query;
  } else {
    const compiled = query.compile();
    sqlStatement = compiled.sql;
    parameters = compiled.parameters as any[];
  }

  return { sqlStatement, parameters };
};
