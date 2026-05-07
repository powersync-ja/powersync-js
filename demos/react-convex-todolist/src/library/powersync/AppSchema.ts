import { column, Schema, Table } from '@powersync/web';

export const LISTS_TABLE = 'lists';
export const TODOS_TABLE = 'todos';

const todos = new Table(
  {
    // Basic fields
    /**
     * This always corresponds to the local-first uuid of a list
     */
    list_uuid: column.text,
    created_at: column.text,
    completed_at: column.text,
    description: column.text,

    // String types
    title: column.text,
    notes: column.text,
    category: column.text,

    // Number types
    priority: column.integer,
    estimated_hours: column.real,
    progress_percentage: column.real,

    // Boolean types
    is_urgent: column.integer,
    is_private: column.integer,
    has_attachments: column.integer,

    // Array types (stored as JSON text)
    tags: column.text,
    dependencies: column.text,
    assigned_users: column.text,

    // Object types (stored as JSON text)
    metadata: column.text,
    custom_fields: column.text,

    // ID references
    parent_task_id: column.text,
    project_id: column.text,

    // Union types
    status: column.text,
    difficulty: column.text,

    // Null handling
    archived_at: column.text,
    deleted_by: column.text,

    // Legacy fields
    completed: column.integer,
    created_by: column.text,
    completed_by: column.text,
    photo_id: column.text,
    owner_id: column.text
  },
  { indexes: { list: ['list_uuid'] } }
);

const lists = new Table({
  created_at: column.text,
  name: column.text,
  owner_id: column.text,
  owner: column.text,
  archived: column.integer
});

export const AppSchema = new Schema({
  todos,
  lists
});

export type Database = (typeof AppSchema)['types'];
export type TodoRecord = Database['todos'];
// OR:
// export type Todo = RowType<typeof todos>;

export type ListRecord = Database['lists'];
