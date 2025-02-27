const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
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

/** @type {import('@react-native/metro-config').MetroConfig} */
module.exports = mergeConfig(getDefaultConfig(__dirname), config);
