// Learn more https://docs.expo.dev/guides/monorepos
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

// Find the project and workspace directories
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];
// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules')
];
// #3 - Force resolving nested modules to the folders below
config.resolver.disableHierarchicalLookup = true;
config.resolver.unstable_enableSymlinks = true;

// Needed to make `@powersync/web/umd` imports work
config.resolver.unstable_enablePackageExports = true;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (['react-native-prompt-android', '@powersync/react-native'].includes(moduleName)) {
      return {
        type: 'empty'
      };
    }
    const mapping = { 'react-native': 'react-native-web', '@powersync/web': '@powersync/web/umd' };
    if (mapping[moduleName]) {
      console.log('remapping', moduleName);
      return context.resolveRequest(context, mapping[moduleName], platform);
    }
  } else {
    if (['@powersync/web'].includes(moduleName)) {
      return {
        type: 'empty'
      };
    }
  }

  // Ensure you call the default resolver.
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
