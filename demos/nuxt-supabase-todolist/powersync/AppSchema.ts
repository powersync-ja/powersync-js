import { column, Schema, Table } from '@powersync/web'

export const TASKS_TABLE = 'tasks'

const tasks = new Table(
  {
    created_at: column.text,
    completed_at: column.text,
    description: column.text,
    completed: column.integer,
    user_id: column.text,
  },
  { indexes: { user: ['user_id'] } },
)

export const AppSchema = new Schema({
  tasks,
})

export const AppSchemaWithDiagnostics = new Schema([
  ...AppSchema.tables,
])

export type Database = (typeof AppSchema)['types']
export type TaskRecord = Database['tasks']
