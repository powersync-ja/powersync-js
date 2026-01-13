const fs = require('fs');
const path = require('path');

// Always link relativly, this is not part of the workspace,
// but we want to test the local packages.
const localPaths = {
  '@powersync/adapter-sql-js': '../../packages/adapter-sql-js',
  '@powersync/attachments': '../../packages/attachments',
  '@powersync/capacitor': '../../packages/capacitor',
  '@powersync/common': '../../packages/common',
  '@powersync/drizzle-driver': '../../packages/drizzle-driver',
  '@powersync/kysely-driver': '../../packages/kysely-driver',
  '@powersync/node': '../../packages/node',
  '@powersync/op-sqlite': '../../packages/powersync-op-sqlite',
  '@powersync/react': '../../packages/react',
  '@powersync/react-native': '../../packages/react-native',
  '@powersync/tanstack-react-query': '../../packages/tanstack-react-query',
  '@powersync/vue': '../../packages/vue',
  '@powersync/web': '../../packages/web'
};
const localPackages = Object.keys(localPaths);
const getLocalPath = (name) => localPaths[name];

module.exports = {
  hooks: {
    readPackage(pkg) {
      const injectPeers = (manifestPath) => {
        try {
          const content = fs.readFileSync(manifestPath, 'utf-8');
          const localPkg = JSON.parse(content);
          if (localPkg.peerDependencies) {
            pkg.dependencies = pkg.dependencies || {};
            Object.keys(localPkg.peerDependencies).forEach((peer) => {
              if (localPackages.includes(peer)) {
                // Force install the peer dependency pointing to local
                pkg.dependencies[peer] = `file:${getLocalPath(peer)}`;
              }
            });
          }
        } catch (e) {
          // Ignore missing files or parse errors
        }
      };

      const scanDeps = (deps) => {
        if (!deps) return;
        Object.keys(deps).forEach((dep) => {
          if (localPackages.includes(dep)) {
            const relPath = getLocalPath(dep);

            // 1. Point the direct dependency to the local file
            deps[dep] = `file:${relPath}`;

            // 2. Read that local file to find and install its peers
            injectPeers(path.resolve(process.cwd(), relPath, 'package.json'));
          }
        });
      };

      scanDeps(pkg.dependencies);
      scanDeps(pkg.devDependencies);

      return pkg;
    }
  }
};
