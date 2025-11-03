import { Schema } from '@powersync/web';
import { LISTS_TABLE_DEFINITION } from './ListsSchema';
import { TODOS_TABLE_DEFINITION } from './TodosSchema';

export const AppSchema = new Schema({
  todos: TODOS_TABLE_DEFINITION,
  lists: LISTS_TABLE_DEFINITION
});
