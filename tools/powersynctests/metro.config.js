const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    unstable_enablePackageExports: true,
    nodeModulesPaths: [path.resolve(projectRoot, 'node_modules'), path.resolve(workspaceRoot, 'node_modules')],
    // Block React 18.x versions from other workspace packages to prevent duplicate React
    blockList: [
      /node_modules\/\.pnpm\/react@18\..*/,
      /node_modules\/\.pnpm\/react-dom@18\..*/,
      /packages\/.*\/node_modules\/react\//,
      /packages\/.*\/node_modules\/react-dom\//,
    ],
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        inlineRequires: {
          blockList: {
            [require.resolve('@powersync/react-native')]: true,
            [require.resolve('@powersync/react')]: true,
            [require.resolve('@powersync/common')]: true
          }
        }
      }
    })
  }
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
