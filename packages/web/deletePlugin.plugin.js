import { existsSync, unlinkSync } from 'fs';
import glob from 'glob';
import { join } from 'path';

// Deletes all files matching the pattern lib_src_worker_*, we are assuming that the workers will be generated twice (once from tsc and once from webpack)
class DeleteAssetsPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tap('DeleteAssetsPlugin', (compilation) => {
      const outputPath = compilation.outputOptions.path;
      const pattern = join(outputPath, '**/lib_src_worker_*');

      // Find all files matching the pattern
      const filesToDelete = glob.sync(pattern);

      filesToDelete.forEach((file) => {
        if (existsSync(file)) {
          unlinkSync(file);
          console.log(`Deleted ${file}`);
        }
      });
    });
  }
}

export default DeleteAssetsPlugin;
