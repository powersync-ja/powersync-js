const production = process.env.NODE_ENV === 'production';
const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');
const DeleteAssetsPlugin = require('./deletePlugin.plugin');

module.exports = () => {
  return {
    entry: {
      SharedSyncImplementation: path.join(__dirname, './lib/src/worker/sync/SharedSyncImplementation.worker.js'),
      WASQLiteDB: path.join(__dirname, './lib/src/worker/db/WASQLiteDB.worker.js')
    },
    experiments: {
      topLevelAwait: true // Enable top-level await in Webpack
    },
    output: {
      filename: 'worker/[name].umd.js',
      path: path.join(__dirname, 'dist'),
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

    devtool: production ? 'source-map' : 'cheap-module-source-map',
    mode: production ? 'production' : 'development',
    optimization: {
      splitChunks: false,
      minimizer: [new TerserPlugin()]
    },
    plugins: [
      new DeleteAssetsPlugin() // Add the custom plugin here
    ]
  };
};
