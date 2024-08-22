const production = process.env.NODE_ENV === 'production';
const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');
const { experiments } = require('webpack');
module.exports = () => {
  return {
    entry: {
      worker_SharedSyncImplementation: path.join(__dirname, './lib/src/worker/sync/SharedSyncImplementation.worker.js'),
      worker_SharedWASQLiteDB: path.join(__dirname, './lib/src/worker/db/SharedWASQLiteDB.worker.js'),
      worker_WASQLiteDB: path.join(__dirname, './lib/src/worker/db/WASQLiteDB.worker.js')
    },
    experiments: {
      topLevelAwait: true // Enable top-level await in Webpack
    },
    output: {
      filename: '[name].umd.js',
      path: path.join(__dirname, 'dist'),
      // publicPath: '/public/',
      library: {
        name: 'sdk_web',
        type: 'var'
      }
    },
    target: 'webworker',
    module: {
      rules: [
        {
          enforce: 'pre',
          test: /\.js$/,
          loader: 'source-map-loader'
        }
      ]
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      fallback: {
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        vm: require.resolve('vm-browserify')
      }
    },
    // externals: (context, request, callback) => {
    //   if (context.includes('db/worker') || context.includes('sync/worker')) {
    //     // No external dependencies for workers
    //   } else {
    //     // Externals for main entry point
    //     const mainExternals = {
    //       // '@powersync/common': '@powersync/common',
    //       // 'async-mutex': 'async-mutex',
    //       // bson: 'bson',
    //       // comlink: 'comlink',
    //       // 'js-logger': 'js-logger',
    //       // lodash: 'lodash'
    //     };
    //     if (mainExternals[request]) {
    //       return callback(null, mainExternals[request]);
    //     }
    //   }
    //   callback(); // Continue with the normal bundling process
    //   // callback(); // Continue with the normal bundling process
    // },
    // externals: {
    //   // index: {
    //   '@powersync/common': '@powersync/common',
    //   'async-mutex': 'async-mutex',
    //   bson: 'bson',
    //   comlink: 'comlink',
    //   'js-logger': 'js-logger',
    //   lodash: 'lodash'
    //   // },
    //   // worker_SharedSyncImplementation: {},
    //   // worker_SharedWASQLiteDB: {},
    //   // worker_WASQLiteDB: {}
    // },
    devtool: production ? 'source-map' : 'cheap-module-source-map',
    mode: production ? 'production' : 'development',
    optimization: {
      minimizer: [new TerserPlugin()]
    }
  };
};
