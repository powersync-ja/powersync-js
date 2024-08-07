(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["sdk_web"] = factory();
	else
		root["sdk_web"] = factory();
})(self, () => {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./lib/src/shared/open-db.js":
/*!***********************************!*\
  !*** ./lib/src/shared/open-db.js ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   _openDB: () => (/* binding */ _openDB)
/* harmony export */ });
/* harmony import */ var _journeyapps_wa_sqlite__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @journeyapps/wa-sqlite */ "../../node_modules/@journeyapps/wa-sqlite/src/sqlite-api.js");
/* harmony import */ var comlink__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! comlink */ "../../node_modules/comlink/dist/esm/comlink.mjs");
/* harmony import */ var async_mutex__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! async-mutex */ "../../node_modules/async-mutex/index.mjs");




let nextId = 1;
async function _openDB(dbFileName, options = { useWebWorker: true }) {
    const { default: moduleFactory } = await __webpack_require__.e(/*! import() */ "vendors-node_modules_journeyapps_wa-sqlite_dist_wa-sqlite-async_mjs").then(__webpack_require__.bind(__webpack_require__, /*! @journeyapps/wa-sqlite/dist/wa-sqlite-async.mjs */ "../../node_modules/@journeyapps/wa-sqlite/dist/wa-sqlite-async.mjs"));
    const module = await moduleFactory();
    const sqlite3 = _journeyapps_wa_sqlite__WEBPACK_IMPORTED_MODULE_0__.Factory(module);
    const { IDBBatchAtomicVFS } = await __webpack_require__.e(/*! import() */ "vendors-node_modules_journeyapps_wa-sqlite_src_examples_IDBBatchAtomicVFS_js").then(__webpack_require__.bind(__webpack_require__, /*! @journeyapps/wa-sqlite/src/examples/IDBBatchAtomicVFS.js */ "../../node_modules/@journeyapps/wa-sqlite/src/examples/IDBBatchAtomicVFS.js"));
    const vfs = new IDBBatchAtomicVFS(dbFileName);
    sqlite3.vfs_register(vfs, true);
    const db = await sqlite3.open_v2(dbFileName);
    const statementMutex = new async_mutex__WEBPACK_IMPORTED_MODULE_1__.Mutex();
    /**
     * Listeners are exclusive to the DB connection.
     */
    const listeners = new Map();
    sqlite3.register_table_onchange_hook(db, (opType, tableName, rowId) => {
        Array.from(listeners.values()).forEach((l) => l(opType, tableName, rowId));
    });
    /**
     * This executes single SQL statements inside a requested lock.
     */
    const execute = async (sql, bindings) => {
        // Running multiple statements on the same connection concurrently should not be allowed
        return _acquireExecuteLock(async () => {
            return executeSingleStatement(sql, bindings);
        });
    };
    /**
     * This requests a lock for executing statements.
     * Should only be used internally.
     */
    const _acquireExecuteLock = (callback) => {
        return statementMutex.runExclusive(callback);
    };
    /**
     * This executes a single statement using SQLite3.
     */
    const executeSingleStatement = async (sql, bindings) => {
        const results = [];
        for await (const stmt of sqlite3.statements(db, sql)) {
            let columns;
            const wrappedBindings = bindings ? [bindings] : [[]];
            for (const binding of wrappedBindings) {
                // TODO not sure why this is needed currently, but booleans break
                binding.forEach((b, index, arr) => {
                    if (typeof b == 'boolean') {
                        arr[index] = b ? 1 : 0;
                    }
                });
                sqlite3.reset(stmt);
                if (bindings) {
                    sqlite3.bind_collection(stmt, binding);
                }
                const rows = [];
                while ((await sqlite3.step(stmt)) === _journeyapps_wa_sqlite__WEBPACK_IMPORTED_MODULE_0__.SQLITE_ROW) {
                    const row = sqlite3.row(stmt);
                    rows.push(row);
                }
                columns = columns ?? sqlite3.column_names(stmt);
                if (columns.length) {
                    results.push({ columns, rows });
                }
            }
            // When binding parameters, only a single statement is executed.
            if (bindings) {
                break;
            }
        }
        const rows = [];
        for (const resultset of results) {
            for (const row of resultset.rows) {
                const outRow = {};
                resultset.columns.forEach((key, index) => {
                    outRow[key] = row[index];
                });
                rows.push(outRow);
            }
        }
        const result = {
            insertId: sqlite3.last_insert_id(db),
            rowsAffected: sqlite3.changes(db),
            rows: {
                _array: rows,
                length: rows.length
            }
        };
        return result;
    };
    /**
     * This executes SQL statements in a batch.
     */
    const executeBatch = async (sql, bindings) => {
        return _acquireExecuteLock(async () => {
            let affectedRows = 0;
            const str = sqlite3.str_new(db, sql);
            const query = sqlite3.str_value(str);
            try {
                await executeSingleStatement('BEGIN TRANSACTION');
                //Prepare statement once
                const prepared = await sqlite3.prepare_v2(db, query);
                if (prepared === null) {
                    return {
                        rowsAffected: 0,
                        rows: { _array: [], length: 0 }
                    };
                }
                const wrappedBindings = bindings ? bindings : [];
                for (const binding of wrappedBindings) {
                    // TODO not sure why this is needed currently, but booleans break
                    for (let i = 0; i < binding.length; i++) {
                        const b = binding[i];
                        if (typeof b == 'boolean') {
                            binding[i] = b ? 1 : 0;
                        }
                    }
                    //Reset bindings
                    sqlite3.reset(prepared.stmt);
                    if (bindings) {
                        sqlite3.bind_collection(prepared.stmt, binding);
                    }
                    const result = await sqlite3.step(prepared.stmt);
                    if (result === _journeyapps_wa_sqlite__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DONE) {
                        //The value returned by sqlite3_changes() immediately after an INSERT, UPDATE or DELETE statement run on a view is always zero.
                        affectedRows += sqlite3.changes(db);
                    }
                }
                //Finalize prepared statement
                await sqlite3.finalize(prepared.stmt);
                await executeSingleStatement('COMMIT');
            }
            catch (err) {
                await executeSingleStatement('ROLLBACK');
                return {
                    rowsAffected: 0,
                    rows: { _array: [], length: 0 }
                };
            }
            finally {
                sqlite3.str_finish(str);
            }
            const result = {
                rowsAffected: affectedRows,
                rows: { _array: [], length: 0 }
            };
            return result;
        });
    };
    if (options.useWebWorker) {
        const registerOnTableChange = (callback) => {
            const id = nextId++;
            listeners.set(id, callback);
            return comlink__WEBPACK_IMPORTED_MODULE_2__.proxy(() => {
                listeners.delete(id);
            });
        };
        return {
            execute: comlink__WEBPACK_IMPORTED_MODULE_2__.proxy(execute),
            executeBatch: comlink__WEBPACK_IMPORTED_MODULE_2__.proxy(executeBatch),
            registerOnTableChange: comlink__WEBPACK_IMPORTED_MODULE_2__.proxy(registerOnTableChange),
            close: comlink__WEBPACK_IMPORTED_MODULE_2__.proxy(() => {
                sqlite3.close(db);
            })
        };
    }
    const registerOnTableChange = (callback) => {
        const id = nextId++;
        listeners.set(id, callback);
        return () => {
            listeners.delete(id);
        };
    };
    return {
        execute: execute,
        executeBatch: executeBatch,
        registerOnTableChange: registerOnTableChange,
        close: () => sqlite3.close(db)
    };
}


/***/ }),

/***/ "./lib/src/worker/db/SharedWASQLiteDB.worker.js":
/*!******************************************************!*\
  !*** ./lib/src/worker/db/SharedWASQLiteDB.worker.js ***!
  \******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _journeyapps_wa_sqlite__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @journeyapps/wa-sqlite */ "../../node_modules/@journeyapps/wa-sqlite/src/sqlite-api.js");
/* harmony import */ var comlink__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! comlink */ "../../node_modules/comlink/dist/esm/comlink.mjs");
/* harmony import */ var _shared_open_db__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../shared/open-db */ "./lib/src/shared/open-db.js");



const _self = self;
const DBMap = new Map();
const OPEN_DB_LOCK = 'open-wasqlite-db';
let nextClientId = 1;
const openDB = async (dbFileName) => {
    // Prevent multiple simultaneous opens from causing race conditions
    return navigator.locks.request(OPEN_DB_LOCK, async () => {
        const clientId = nextClientId++;
        if (!DBMap.has(dbFileName)) {
            const clientIds = new Set();
            const connection = await (0,_shared_open_db__WEBPACK_IMPORTED_MODULE_1__._openDB)(dbFileName);
            DBMap.set(dbFileName, {
                clientIds,
                db: connection
            });
        }
        const dbEntry = DBMap.get(dbFileName);
        dbEntry.clientIds.add(clientId);
        const { db } = dbEntry;
        const wrappedConnection = {
            ...db,
            close: comlink__WEBPACK_IMPORTED_MODULE_2__.proxy(() => {
                const { clientIds } = dbEntry;
                clientIds.delete(clientId);
                if (clientIds.size == 0) {
                    console.debug(`Closing connection to ${dbFileName}.`);
                    DBMap.delete(dbFileName);
                    return db.close?.();
                }
                console.debug(`Connection to ${dbFileName} not closed yet due to active clients.`);
            })
        };
        return comlink__WEBPACK_IMPORTED_MODULE_2__.proxy(wrappedConnection);
    });
};
_self.onconnect = function (event) {
    const port = event.ports[0];
    console.debug('Exposing db on port', port);
    comlink__WEBPACK_IMPORTED_MODULE_2__.expose(openDB, port);
};
addEventListener('unload', () => {
    Array.from(DBMap.values()).forEach(async (dbConnection) => {
        const db = await dbConnection.db;
        db.close?.();
    });
});


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/******/ 	// the startup function
/******/ 	__webpack_require__.x = () => {
/******/ 		// Load entry module and return exports
/******/ 		// This entry module depends on other loaded chunks and execution need to be delayed
/******/ 		var __webpack_exports__ = __webpack_require__.O(undefined, ["vendors-node_modules_async-mutex_index_mjs-node_modules_comlink_dist_esm_comlink_mjs-node_mod-037150"], () => (__webpack_require__("./lib/src/worker/db/SharedWASQLiteDB.worker.js")))
/******/ 		__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 		return __webpack_exports__;
/******/ 	};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/chunk loaded */
/******/ 	(() => {
/******/ 		var deferred = [];
/******/ 		__webpack_require__.O = (result, chunkIds, fn, priority) => {
/******/ 			if(chunkIds) {
/******/ 				priority = priority || 0;
/******/ 				for(var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--) deferred[i] = deferred[i - 1];
/******/ 				deferred[i] = [chunkIds, fn, priority];
/******/ 				return;
/******/ 			}
/******/ 			var notFulfilled = Infinity;
/******/ 			for (var i = 0; i < deferred.length; i++) {
/******/ 				var [chunkIds, fn, priority] = deferred[i];
/******/ 				var fulfilled = true;
/******/ 				for (var j = 0; j < chunkIds.length; j++) {
/******/ 					if ((priority & 1 === 0 || notFulfilled >= priority) && Object.keys(__webpack_require__.O).every((key) => (__webpack_require__.O[key](chunkIds[j])))) {
/******/ 						chunkIds.splice(j--, 1);
/******/ 					} else {
/******/ 						fulfilled = false;
/******/ 						if(priority < notFulfilled) notFulfilled = priority;
/******/ 					}
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferred.splice(i--, 1)
/******/ 					var r = fn();
/******/ 					if (r !== undefined) result = r;
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks and sibling chunks for the entrypoint
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".index.umd.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		var scriptUrl;
/******/ 		if (__webpack_require__.g.importScripts) scriptUrl = __webpack_require__.g.location + "";
/******/ 		var document = __webpack_require__.g.document;
/******/ 		if (!scriptUrl && document) {
/******/ 			if (document.currentScript)
/******/ 				scriptUrl = document.currentScript.src;
/******/ 			if (!scriptUrl) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				if(scripts.length) {
/******/ 					var i = scripts.length - 1;
/******/ 					while (i > -1 && (!scriptUrl || !/^http(s?):/.test(scriptUrl))) scriptUrl = scripts[i--].src;
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 		// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 		// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 		if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 		scriptUrl = scriptUrl.replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 		__webpack_require__.p = scriptUrl;
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/importScripts chunk loading */
/******/ 	(() => {
/******/ 		__webpack_require__.b = self.location + "";
/******/ 		
/******/ 		// object to store loaded chunks
/******/ 		// "1" means "already loaded"
/******/ 		var installedChunks = {
/******/ 			"lib_src_worker_db_SharedWASQLiteDB_worker_js": 1
/******/ 		};
/******/ 		
/******/ 		// importScripts chunk loading
/******/ 		var installChunk = (data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			for(var moduleId in moreModules) {
/******/ 				if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			while(chunkIds.length)
/******/ 				installedChunks[chunkIds.pop()] = 1;
/******/ 			parentChunkLoadingFunction(data);
/******/ 		};
/******/ 		__webpack_require__.f.i = (chunkId, promises) => {
/******/ 			// "1" is the signal for "already loaded"
/******/ 			if(!installedChunks[chunkId]) {
/******/ 				if(true) { // all chunks have JS
/******/ 					importScripts(__webpack_require__.p + __webpack_require__.u(chunkId));
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunksdk_web"] = self["webpackChunksdk_web"] || [];
/******/ 		var parentChunkLoadingFunction = chunkLoadingGlobal.push.bind(chunkLoadingGlobal);
/******/ 		chunkLoadingGlobal.push = installChunk;
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/startup chunk dependencies */
/******/ 	(() => {
/******/ 		var next = __webpack_require__.x;
/******/ 		__webpack_require__.x = () => {
/******/ 			return __webpack_require__.e("vendors-node_modules_async-mutex_index_mjs-node_modules_comlink_dist_esm_comlink_mjs-node_mod-037150").then(next);
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// run startup
/******/ 	var __webpack_exports__ = __webpack_require__.x();
/******/ 	
/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=lib_src_worker_db_SharedWASQLiteDB_worker_js.index.umd.js.map