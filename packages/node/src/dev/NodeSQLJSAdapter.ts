import { type DBAdapter, type SQLOpenFactory } from '@powersync/common';
import {
  SQLJSDBAdapter,
  type SQLJSOpenOptions,
  type ResolvedSQLJSOpenOptions,
  type SQLJSPersister
} from '@powersync/common/dev';
import * as fs from 'fs/promises';
import * as path from 'path';

export class NodeSQLJSOpenFactory implements SQLOpenFactory {
  constructor(protected options: SQLJSOpenOptions) {}

  openDB(): DBAdapter {
    return new NodeSQLJSDBAdapter(this.options);
  }
}

export class NodeSQLJSDBAdapter extends SQLJSDBAdapter {
  protected resolveSQLJSOpenOptions(options: SQLJSOpenOptions): ResolvedSQLJSOpenOptions {
    return {
      persister: new NodeSQLJSPersister(options.dbFilename),
      ...options
    };
  }
}

export class NodeSQLJSPersister implements SQLJSPersister {
  private dbPath: string;

  constructor(dbFilename: string, dbDirectory?: string) {
    // Default to current working directory if no directory specified
    const baseDir = dbDirectory || process.cwd();
    this.dbPath = path.join(baseDir, dbFilename);
  }

  async readFile(): Promise<ArrayLike<number> | Buffer | null> {
    try {
      // Check if file exists
      await fs.access(this.dbPath);

      // Read file as Buffer
      const data = await fs.readFile(this.dbPath);
      return data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist
        return null;
      }
      console.error('Error reading database file:', error);
      return null;
    }
  }

  async writeFile(data: ArrayLike<number> | Buffer): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.dbPath);
      await fs.mkdir(dir, { recursive: true });

      // Convert data to Buffer if it's not already
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

      await fs.writeFile(this.dbPath, buffer);
      console.log('Wrote database file:', this.dbPath);
    } catch (error) {
      console.error('Error writing database file:', error);
      throw error;
    }
  }
}
