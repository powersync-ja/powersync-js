import { type PowerSyncOpenFactoryOptions } from '@powersync/common';
import { ResolvedWebSQLOpenOptions, WebSQLFlags } from '../web-sql-flags';
import { WASQLiteVFS } from './WASQLiteConnection';

/**
 * These flags are the same as {@link WebSQLFlags}.
 * This export is maintained only for API consistency
 */
export type WASQLiteFlags = WebSQLFlags;

export interface WASQLiteDBAdapterOptions extends Omit<PowerSyncOpenFactoryOptions, 'schema'> {
  flags?: WASQLiteFlags;

  /**
   * Use an existing port to an initialized worker.
   * A worker will be initialized if none is provided
   */
  workerPort?: MessagePort;

  worker?: string | URL | ((options: ResolvedWebSQLOpenOptions) => Worker | SharedWorker);

  vfs?: WASQLiteVFS;
}

/**
 * Adapter for WA-SQLite SQLite connections.
 */
// FIXME
// export class WASQLiteDBAdapter extends BaseObserver<DBAdapterListener> implements DBAdapter {
//   private initialized: Promise<void>;
//   private logger: ILogger;
//   private dbGetHelpers: DBGetUtils | null;
//   private methods: DBFunctionsInterface | null;
//   private debugMode: boolean;

//   constructor(protected options: WASQLiteDBAdapterOptions) {
//     super();
//     this.logger = Logger.get('WASQLite');
//     this.dbGetHelpers = null;
//     this.methods = null;
//     this.debugMode = options.debugMode ?? false;
//     if (this.debugMode) {
//       const originalExecute = this._execute.bind(this);
//       this._execute = async (sql, bindings) => {
//         const start = performance.now();
//         try {
//           const r = await originalExecute(sql, bindings);
//           performance.measure(`[SQL] ${sql}`, { start });
//           return r;
//         } catch (e: any) {
//           performance.measure(`[SQL] [ERROR: ${e.message}] ${sql}`, { start });
//           throw e;
//         }
//       };
//     }
//     this.initialized = this.init();
//     this.dbGetHelpers = this.generateDBHelpers({
//       execute: (query, params) => this.acquireLock(() => this._execute(query, params))
//     });
//   }

//   get name() {
//     return this.options.dbFilename;
//   }

//   protected get flags(): Required<WASQLiteFlags> {
//     return resolveWebSQLFlags(this.options.flags ?? {});
//   }

//   getWorker() {}

//   protected async init() {
//     const { enableMultiTabs, useWebWorker } = this.flags;
//     if (!enableMultiTabs) {
//       this.logger.warn('Multiple tabs are not enabled in this browser');
//     }

//     if (useWebWorker) {
//       const optionsDbWorker = this.options.worker;

//       const dbOpener = this.options.workerPort
//         ? Comlink.wrap<OpenDB>(this.options.workerPort)
//         : typeof optionsDbWorker === 'function'
//           ? Comlink.wrap<OpenDB>(
//               resolveWorkerDatabasePortFactory(() =>
//                 optionsDbWorker({
//                   ...this.options,
//                   flags: this.flags
//                 })
//               )
//             )
//           : getWorkerDatabaseOpener(this.options.dbFilename, enableMultiTabs, optionsDbWorker);

//       this.methods = await dbOpener({
//         dbFileName: this.options.dbFilename,
//         vfs: this.options.vfs
//       });
//       this.methods.registerOnTableChange(
//         Comlink.proxy((event) => {
//           this.iterateListeners((cb) => cb.tablesUpdated?.(event));
//         })
//       );

//       return;
//     }

//     // Not using a worker
//     const connection = new WASqliteConnection({
//       dbFileName: this.options.dbFilename
//     });
//     await connection.init();

//     this.methods = connection;
//     this.methods.registerOnTableChange((event) => {
//       this.iterateListeners((cb) => cb.tablesUpdated?.(event));
//     });
//   }

//   async refreshSchema(): Promise<void> {}
// }
