const production = process.env.NODE_ENV === 'production';
import { createRequire } from 'module';
import path from 'path';
import TerserPlugin from 'terser-webpack-plugin';
import { fileURLToPath } from 'url';
import DeleteAssetsPlugin from './deletePlugin.plugin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

export default () => {
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
