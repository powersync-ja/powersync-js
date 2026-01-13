const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('node:path');

const projectRoot = __dirname;

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [projectRoot],
  resolver: {
    extraNodeModules: {
      stream: require.resolve('stream-browserify')
    },
    nodeModulesPaths: [path.resolve(projectRoot, 'node_modules')],
    disableHierarchicalLookup: false
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
