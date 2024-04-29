import { describe, expect, it } from 'vitest';
import * as SUT from '../../src/utils/parseQuery';

describe('parseQuery', () => {
  it('should do nothing if the query is a string', () => {
    const query = 'SELECT * FROM table';
    const result = SUT.parseQuery(query);

    expect(result).toEqual({ sqlStatement: query, parameters: [] });
  });

  it('should compile the query and return the sql statement and parameters if the query is compilable', () => {
    const sqlStatement = 'SELECT * FROM table';
    const query = {
      compile: () => ({ sql: sqlStatement, parameters: ['test'] }),
      execute: () => Promise.resolve([])
    };
    const result = SUT.parseQuery(query);

    expect(result).toEqual({ sqlStatement, parameters: ['test'] });
  });
});
