const production = process.env.NODE_ENV === 'production';
const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');
const DeleteAssetsPlugin = require('./deletePlugin.plugin');

module.exports = () => {
  return {
    entry: path.join(__dirname, './lib/src/index.js'),
    output: {
      filename: 'index.umd.js',
      path: path.join(__dirname, 'dist'),
      library: {
        name: 'sdk_web',
        type: 'umd'
      }
    },
    module: {
      rules: [
        {
          enforce: 'pre',
          test: /\.js$/,
          loader: 'source-map-loader'
        }
      ]
    },

    externals: {
      '@journeyapps/wa-sqlite': '@journeyapps/wa-sqlite',
      '@journeyapps/wa-sqlite/src/examples/IDBBatchAtomicVFS.js':
        '@journeyapps/wa-sqlite/src/examples/IDBBatchAtomicVFS.js',

      '@powersync/common': '@powersync/common',
      'async-mutex': 'async-mutex',
      bson: 'commonjs bson', // base 'bson' causes issues in react-native-web examples - this doesn't work when multitab is disabled.
      comlink: 'comlink',
      'js-logger': 'js-logger',
      lodash: 'lodash'
    },
    devtool: production ? 'source-map' : 'cheap-module-source-map',
    mode: production ? 'production' : 'development',
    optimization: {
      minimizer: [new TerserPlugin()]
    },
    plugins: [
      new DeleteAssetsPlugin() // Add the custom plugin here
    ]
  };
};
