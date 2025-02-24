import { describe, it, expect } from 'vitest';
import { Schema } from '../../../src/db/schema/Schema';
import { Table } from '../../../src/db/schema/Table';
import { column, ColumnType, Column } from '../../../src/db/schema/Column';

describe('Schema', () => {
  it('should fail if an array of tables using the new syntax is passed to schema', () => {
    const table1 = new Table({ name: column.text });
    const table2 = new Table({ age: { type: ColumnType.INTEGER } });
    expect(() => new Schema([table1, table2])).toThrow();
  });

  it('should create a schema with an array of tables using the old syntax', () => {
    const table1 = new Table({
      name: 'table1',
      columns: [new Column({ name: 'name', type: ColumnType.TEXT })]
    });
    const table2 = new Table({
      name: 'table2',
      columns: [new Column({ name: 'age', type: ColumnType.INTEGER })]
    });
    const schema = new Schema([table1, table2]);
    expect(() => schema.validate()).not.toThrow();

    expect(schema.tables).toHaveLength(2);
    expect(schema.tables[0].columns[0].name).toBe('name');
    expect(schema.tables[1].columns[0].name).toBe('age');
  });

  it('should create a schema with a SchemaType object', () => {
    const schemaDefinition = {
      users: new Table({
        name: column.text,
        age: { type: ColumnType.INTEGER }
      }),
      posts: new Table({
        title: column.text,
        content: column.text
      })
    };
    const schema = new Schema(schemaDefinition);

    expect(schema.tables).toHaveLength(2);
    expect(schema.props).toBeDefined();
    expect(schema.props.users).toBeDefined();
    expect(schema.props.posts).toBeDefined();
  });

  it('should validate all tables in the schema', () => {
    const schema = new Schema({
      users: new Table({
        name: column.text,
        age: column.integer
      }),
      posts: new Table({
        title: column.text,
        content: column.text
      })
    });

    expect(() => schema.validate()).not.toThrow();

    const invalidSchema = new Schema({
      invalidTable: new Table({
        'invalid name': column.text
      })
    });

    expect(() => invalidSchema.validate()).toThrow();
  });

  it('should generate correct JSON representation', () => {
    const schema = new Schema({
      users: new Table({
        name: column.text,
        age: { type: ColumnType.INTEGER }
      }),
      posts: new Table({
        title: column.text,
        content: column.text
      })
    });

    const json = schema.toJSON();

    expect(json).toEqual({
      tables: [
        {
          name: 'users',
          view_name: 'users',
          local_only: false,
          insert_only: false,
          columns: [
            { name: 'name', type: 'TEXT' },
            { name: 'age', type: 'INTEGER' }
          ],
          indexes: []
        },
        {
          name: 'posts',
          view_name: 'posts',
          local_only: false,
          insert_only: false,
          columns: [
            { name: 'title', type: 'TEXT' },
            { name: 'content', type: 'TEXT' }
          ],
          indexes: []
        }
      ]
    });
  });
});
