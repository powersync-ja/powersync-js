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

// Every directory in packages/, plus the published packages that live in tools/
const packageDirs = [
  ...fs
    .readdirSync(packagesDir)
    .map((dir) => path.join(packagesDir, dir))
    .filter((dir) => fs.statSync(dir).isDirectory()),
  ...['diagnostics', 'diagnostics-core', 'diagnostics-ui'].map((dir) => path.resolve('tools', dir))
];

// Process each package.json
const promises = packageDirs.map((dir) => {
  const packageJsonPath = path.join(dir, 'package.json');
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
