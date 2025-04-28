import { describe, it, expect } from 'vitest';
import { Table, TableV2Options } from '../../../src/db/schema/Table';
import { column, Column, ColumnType } from '../../../src/db/schema/Column';
import { Index } from '../../../src/db/schema/Index';
import { IndexedColumn } from '../../../src/db/schema/IndexedColumn';

describe('Table', () => {
  it('should create a table with V1 syntax', () => {
    const table = new Table({
      name: 'users',
      columns: [
        new Column({ name: 'name', type: ColumnType.TEXT }),
        new Column({ name: 'age', type: ColumnType.INTEGER })
      ],
      indexes: [
        new Index({
          name: 'profile_id',
          columns: [new IndexedColumn({ name: 'age' })]
        })
      ]
    });

    expect(table.name).toBe('users');
    expect(table.columns.length).toBe(2);
    expect(table.columns[0].name).toBe('name');
    expect(table.columns[1].name).toBe('age');
    expect(table.indexes[0].name).toBe('profile_id');
  });

  it('should create a table with V2 syntax', () => {
    const table = new Table(
      {
        name: column.text,
        age: column.integer
      },
      { indexes: { nameIndex: ['name'] } }
    );

    expect(table.columns.length).toBe(2);
    expect(table.columns[0].name).toBe('name');
    expect(table.columns[1].name).toBe('age');
    expect(table.indexes.length).toBe(1);
    expect(table.indexes[0].name).toBe('nameIndex');
  });

  it('should create a local-only table', () => {
    const table = new Table(
      {
        data: column.text
      },
      { localOnly: true }
    );

    expect(table.localOnly).toBe(true);
    expect(table.insertOnly).toBe(false);
  });

  it('should create an insert-only table', () => {
    const table = new Table(
      {
        data: column.text
      },
      { insertOnly: true }
    );

    expect(table.localOnly).toBe(false);
    expect(table.insertOnly).toBe(true);
  });

  it('should create correct internal name', () => {
    const normalTable = new Table({
      data: column.text
    });

    expect(normalTable.internalName).toBe('ps_data__');

    const localTable = new Table(
      {
        data: column.text
      },
      { localOnly: true }
    );

    expect(localTable.internalName).toBe('ps_data_local__');
  });

  it('should generate correct JSON representation', () => {
    const table = new Table(
      {
        name: column.text,
        age: column.integer
      },
      {
        indexes: { nameIndex: ['name'] },
        viewName: 'customView'
      }
    );

    const json = table.toJSON();

    expect(json).toEqual({
      name: '',
      view_name: 'customView',
      local_only: false,
      insert_only: false,
      ignore_empty_update: false,
      include_metadata: false,
      include_old: false,
      include_old_only_when_changed: false,
      columns: [
        { name: 'name', type: 'TEXT' },
        { name: 'age', type: 'INTEGER' }
      ],
      indexes: [{ name: 'nameIndex', columns: [{ ascending: true, name: 'name', type: 'TEXT' }] }]
    });
  });

  it('should handle descending index', () => {
    const table = new Table(
      {
        name: column.text,
        age: column.integer
      },
      {
        indexes: { ageIndex: ['-age'] }
      }
    );

    expect(table.indexes[0].columns[0].name).toBe('age');
    expect(table.indexes[0].columns[0].ascending).toBe(false);
  });

  it('should handle options', () => {
    function createTable(options: TableV2Options) {
      return new Table({ name: column.text }, options);
    }

    expect(createTable({}).toJSON().include_metadata).toBe(false);
    expect(createTable({ includeMetadata: true }).toJSON().include_metadata).toBe(true);

    expect(createTable({ includeOld: true }).toJSON().include_old).toBe(true);
    expect(createTable({ includeOld: true }).toJSON().include_old_only_when_changed).toBe(false);

    const complexIncldueOld = createTable({ includeOld: {
      columns: ['foo', 'bar'],
      onlyWhenChanged: true,
    } });
    expect(complexIncldueOld.toJSON().include_old).toStrictEqual(['foo', 'bar']);
    expect(complexIncldueOld.toJSON().include_old_only_when_changed).toBe(true);

    expect(createTable({ ignoreEmptyUpdate: true }).toJSON().ignore_empty_update).toBe(true);
  });

  describe('validate', () => {
    it('should throw an error for invalid view names', () => {
      expect(() => {
        new Table(
          {
            data: column.text
          },
          { viewName: 'invalid view' }
        ).validate();
      }).toThrowError('Invalid characters in view name');
    });

    it('should throw an error for custom id columns', () => {
      expect(() => {
        new Table({
          id: column.text
        }).validate();
      }).toThrow('id column is automatically added, custom id columns are not supported');
    });

    it('should throw an error if more than 1999 columns are provided', () => {
      const columns = {};
      for (let i = 0; i < 2000; i++) {
        columns[`column${i}`] = column.text;
      }

      expect(() => new Table(columns).validate()).toThrowError(
        'Table has too many columns. The maximum number of columns is 1999.'
      );
    });

    it('should throw an error if an id column is provided', () => {
      expect(() =>
        new Table({
          id: column.text,
          name: column.text
        }).validate()
      ).toThrowError('An id column is automatically added, custom id columns are not supported');
    });

    it('should throw an error if a column name contains invalid SQL characters', () => {
      expect(() =>
        new Table({
          '#invalid-name': column.text
        }).validate()
      ).toThrowError('Invalid characters in column name: #invalid-name');
    });

    it('should throw an error for local-only tables with metadata', () => {
      expect(() =>
        new Table(
          {
            name: column.text
          },
          { localOnly: true, includeMetadata: true }
        ).validate()
      ).toThrowError("Can't include metadata for local-only tables.");
    });

    it('should throw an error for local-only tables tracking old values', () => {
      expect(() =>
        new Table(
          {
            name: column.text
          },
          { localOnly: true, includeOld: true }
        ).validate()
      ).toThrowError("Can't include old values for local-only tables.");

      expect(() =>
        new Table(
          {
            name: column.text
          },
          { localOnly: true, includeOld: { onlyWhenChanged: false } }
        ).validate()
      ).toThrowError("Can't include old values for local-only tables.");
    });
  });
});
