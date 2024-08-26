import { describe, it, expect } from 'vitest';
import { TableV2, column } from '../../../src/db/schema/TableV2';  // Adjust the import path as needed
import { ColumnType } from '../../../src/db/Column';

describe('TableV2', () => {
  it('should create a table with valid columns', () => {
    const table = new TableV2({
      name: column.text,
      age: column.integer,
      height: column.real
    });

    expect(table.columns).toEqual({
      name: { type: ColumnType.TEXT },
      age: { type: ColumnType.INTEGER },
      height: { type: ColumnType.REAL }
    });
  });

  it('should throw an error if more than 63 columns are provided', () => {
    const columns = {};
    for (let i = 0; i < 64; i++) {
      columns[`column${i}`] = column.text;
    }

    expect(() => new TableV2(columns)).toThrowError('TableV2 cannot have more than 63 columns');
  });

  it('should throw an error if an id column is provided', () => {
    expect(() => new TableV2({
      id: column.text,
      name: column.text
    })).toThrowError('An id column is automatically added, custom id columns are not supported');
  });

  it('should throw an error if a column name contains invalid SQL characters', () => {
    expect(() => new TableV2({
      '#invalid-name': column.text
    })).toThrowError('Invalid characters in column name: #invalid-name');
  });

  it('should create indexes correctly', () => {
    const table = new TableV2(
      {
        name: column.text,
        age: column.integer
      },
      {
        indexes: {
          nameIndex: ['name'],
          '-ageIndex': ['age']
        }
      }
    );

    expect(table.indexes).toHaveLength(2);
    expect(table.indexes[0].name).toBe('nameIndex');
    expect(table.indexes[0].columns[0].ascending).toBe(true);
    expect(table.indexes[1].name).toBe('ageIndex');
    expect(table.indexes[1].columns[0].ascending).toBe(false);
  });

  it('should allow creating a table with exactly 63 columns', () => {
    const columns = {};
    for (let i = 0; i < 63; i++) {
      columns[`column${i}`] = column.text;
    }

    expect(() => new TableV2(columns)).not.toThrow();
  });

  it('should allow creating a table with no columns', () => {
    expect(() => new TableV2({})).not.toThrow();
  });

  it('should allow creating a table with no options', () => {
    const table = new TableV2({ name: column.text });
    expect(table.options).toEqual({});
  });

  it('should correctly set options', () => {
    const options = { localOnly: true, insertOnly: false, viewName: 'TestView' };
    const table = new TableV2({ name: column.text }, options);
    expect(table.options).toEqual(options);
  });
});
