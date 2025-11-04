import { column, Table } from '@powersync/web';
import { z } from 'zod';
import { nullableStringToDate, numberToBoolean, stringToDate } from './zod-helpers';

/**
 * The PowerSync schema for the todos table.
 */
export const TODOS_TABLE_DEFINITION = new Table(
  {
    list_id: column.text,
    created_at: column.text,
    completed_at: column.text,
    description: column.text,
    created_by: column.text,
    completed_by: column.text,
    completed: column.integer
  },
  { indexes: { list: ['list_id'] } }
);

/**
 * Extends the PowerSync schema with required fields and boolean/Date transforms.
 * This requires stricter validations for inputs (used for insert, update, etc.)
 */
export const TodosSchema = z.object({
  id: z.string(),
  list_id: z.string(),
  created_at: z.date(),
  completed_at: z.date().nullable(),
  description: z.string(),
  created_by: z.string(),
  completed_by: z.string().nullable(),
  completed: z.boolean()
});

/**
 * We're using an input type which is different from the SQLite table type.
 * We require this schema in order to deserialize incoming data from the database.
 * This is not required if SQLite types are used as the input type.
 */
export const TodosDeserializationSchema = z.object({
  ...TodosSchema.shape,
  created_at: stringToDate,
  completed_at: nullableStringToDate,
  completed: numberToBoolean
});

export type TodoRecord = z.output<typeof TodosSchema>;
