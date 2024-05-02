import type { CompilableQuery } from '../types/types';

export const parseQuery = <T>(
  query: string | CompilableQuery<T>,
  parameters: any[]
): { sqlStatement: string; parameters: any[] } | Error => {
  let sqlStatement: string;

  if (typeof query == 'string') {
    sqlStatement = query;
  } else {
    const hasAdditionalParameters = parameters.length > 0;
    if (hasAdditionalParameters) {
      throw new Error('You cannot pass parameters to a compiled query.');
    }

    const compiled = query.compile();
    sqlStatement = compiled.sql;
    parameters = compiled.parameters as any[];
  }

  return { sqlStatement, parameters: parameters };
};
