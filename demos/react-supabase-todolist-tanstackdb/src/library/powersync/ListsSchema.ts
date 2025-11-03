import { column, Table } from '@powersync/web';
import { z } from 'zod';
import { stringToDate } from './zod-helpers';

export const LISTS_TABLE_DEFINITION = new Table({
  created_at: column.text,
  name: column.text,
  owner_id: column.text
});

/**
 * Extends the PowerSync schema with required fields and boolean/Date transforms.
 */
export const ListsSchema = z.object({
  id: z.string(),
  created_at: z.date(),
  name: z.string(),
  owner_id: z.string()
});

export const ListsDeserializationSchema = z.object({
  ...ListsSchema.shape,
  created_at: stringToDate
});

export type ListRecord = z.output<typeof ListsSchema>;
