import { DatabaseSource, DBAdapter, SQLOpenOptions } from '@powersync/common';

/**
 * Internal helper to turn a {@link DatabaseSource} into an opened {@link DBAdapter}.
 *
 * @internal
 */
export function openDatabase<T extends SQLOpenOptions>(
  source: DatabaseSource<T>,
  defaultFactory: (options: T) => DBAdapter
): DBAdapter {
  if ('opened' in source) {
    return source.opened;
  } else if ('factory' in source) {
    return source.factory.openDB();
  } else if ('database' in source && source.database?.dbFilename) {
    return defaultFactory(source.database);
  } else {
    // This is dead code for well-typed programs, but JavaScript users might have forgotten to pass an option
    // when creating a PowerSync database instance.
    throw new Error('The provided `database` option is invalid.');
  }
}
