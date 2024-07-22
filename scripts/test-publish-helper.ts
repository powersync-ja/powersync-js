import * as fs from 'fs';
import * as path from 'path';

/**
 * This will remove any publishConfig registry entries
 * in package.json files.
 * This is needed for publishing to a temporary registry.
 * CLI Overrides don't seem to actually be applied.
 */

const packagesDir = path.resolve('packages');

/**
 * Deletes publishConfig.registry if present
 */
const processPackageJson = (packageJsonPath: string) => {
  // Read and parse package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  // Remove the publishConfig.registry if it exists
  if (packageJson.publishConfig && packageJson.publishConfig.registry) {
    delete packageJson.publishConfig.registry;
  }

  // Write the modified package.json back to the file system
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
};

// Get all subdirectories in the packages directory
const packageDirs = fs.readdirSync(packagesDir).filter((file) => {
  return fs.statSync(path.join(packagesDir, file)).isDirectory();
});

// Process each package.json in the packages directory
const promises = packageDirs.map((dir) => {
  const packageJsonPath = path.join(packagesDir, dir, 'package.json');
  return processPackageJson(packageJsonPath);
});

Promise.all(promises)
  .then(() => {
    console.log('All packages modified successfully.');
  })
  .catch((error) => {
    console.error('Error modifying some packages:', error);
    process.exit(1);
  });
