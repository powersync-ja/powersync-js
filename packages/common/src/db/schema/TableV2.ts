import { ColumnsType } from './Column';
import { Table } from './Table';

/**
  Generate a new table from the columns and indexes
  @deprecated You should use {@link Table} instead as it now allows TableV2 syntax.
  This will be removed in the next major release.
*/
export class TableV2<Columns extends ColumnsType = ColumnsType> extends Table<Columns> {}
