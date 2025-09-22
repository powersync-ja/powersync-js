import { DBAdapter, SQLOpenFactory, SQLOpenOptions } from '@powersync/web';
import { CapacitorSQLiteAdapter } from './CapacitorSQLiteAdapter';

export class CapacitorSQLiteOpenFactory implements SQLOpenFactory {
  constructor(protected options: SQLOpenOptions) {}

  openDB(): DBAdapter {
    return new CapacitorSQLiteAdapter(this.options);
  }
}
