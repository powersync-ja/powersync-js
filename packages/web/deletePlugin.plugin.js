const path = require('path');
const fs = require('fs');

// Temporary workaround until we can figure out how not to bundle workers twice
class DeleteAssetsPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tap('DeleteAssetsPlugin', (compilation) => {
      const assetsToDelete = [
        'lib_src_worker_sync_SharedSyncImplementation_worker_js.index.umd.js',
        'lib_src_worker_sync_SharedSyncImplementation_worker_js.index.umd.js.map',
        'lib_src_worker_sync_SharedSyncImplementation_worker_js.umd.js',
        'lib_src_worker_sync_SharedSyncImplementation_worker_js.umd.js.map',
        'lib_src_worker_db_SharedWASQLiteDB_worker_js.umd.js',
        'lib_src_worker_db_SharedWASQLiteDB_worker_js.umd.js.map',
        'lib_src_worker_db_SharedWASQLiteDB_worker_js.index.umd.js',
        'lib_src_worker_db_SharedWASQLiteDB_worker_js.index.umd.js.map',
        'lib_src_worker_db_WASQLiteDB_worker_js.index.umd.js',
        'lib_src_worker_db_WASQLiteDB_worker_js.index.umd.js.map',
        'lib_src_worker_db_WASQLiteDB_worker_js.umd.js',
        'lib_src_worker_db_WASQLiteDB_worker_js.umd.js.map'
      ];

      assetsToDelete.forEach((asset) => {
        const assetPath = path.join(compilation.outputOptions.path, asset);
        if (fs.existsSync(assetPath)) {
          fs.unlinkSync(assetPath);
          console.log(`Deleted ${assetPath}`);
        }
      });
    });
  }
}

module.exports = DeleteAssetsPlugin;
