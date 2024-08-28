import { ColumnsType } from '../Column';
import { Table } from './Table';

/*
  Generate a new table from the columns and indexes
*/
export class TableV2<Columns extends ColumnsType = ColumnsType> extends Table<Columns> {}
