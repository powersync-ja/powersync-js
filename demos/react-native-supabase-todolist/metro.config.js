const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable package.json "exports" resolution so Metro uses the ESM entry
// instead of "main" which points to the CJS bundle (which uses Node's "module" API).
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['import', 'require'];

module.exports = config;
