import { column, Table } from '@powersync/web';
import { z } from 'zod';
import { stringToDate } from './zod-helpers';

/**
 * The PowerSync schema for the todos table.
 */
export const LISTS_TABLE_DEFINITION = new Table({
  created_at: column.text,
  name: column.text,
  owner_id: column.text
});

/**
 * Extends the PowerSync schema with required fields and boolean/Date transforms.
 * This requires stricter validations for inputs (used for insert, update, etc.)
 */
export const ListsSchema = z.object({
  id: z.string(),
  created_at: z.date(),
  name: z.string(),
  owner_id: z.string()
});

/**
 * We're using an input type which is different from the SQLite table type.
 * We require this schema in order to deserialize incoming data from the database.
 * This is not required if SQLite types are used as the input type.
 */
export const ListsDeserializationSchema = z.object({
  ...ListsSchema.shape,
  created_at: stringToDate
});

export type ListRecord = z.output<typeof ListsSchema>;
