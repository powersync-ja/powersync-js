import { describe, expect, it } from 'vitest';
import * as SUT from '../../src/utils/parseQuery';

describe('parseQuery', () => {
  it('should do nothing if the query is a string', () => {
    const query = 'SELECT * FROM table';
    const parameters = ['one'];
    const result = SUT.parseQuery(query, parameters);

    expect(result).toEqual({ sqlStatement: query, parameters: ['one'] });
  });

  it('should compile the query and return the sql statement and parameters if the query is compilable', () => {
    const sqlStatement = 'SELECT * FROM table';
    const parameters = [];
    const query = {
      compile: () => ({ sql: sqlStatement, parameters: ['test'] }),
      execute: () => Promise.resolve([])
    };
    const result = SUT.parseQuery(query, parameters);

    expect(result).toEqual({ sqlStatement, parameters: ['test'] });
  });

  it('should throw an error if there is an additional parameter included in a compiled query', () => {
    const sqlStatement = 'SELECT * FROM table';
    const parameters = ['additional parameter'];
    const query = {
      compile: () => ({ sql: sqlStatement, parameters: ['test'] }),
      execute: () => Promise.resolve([])
    };
    const result = () => SUT.parseQuery(query, parameters);

    expect(result).toThrowError('You cannot pass parameters to a compiled query.');
  });
});
