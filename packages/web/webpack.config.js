const production = process.env.NODE_ENV === 'production';
const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');
module.exports = () => {
  return {
    entry: path.join(__dirname, './lib/src/index.js'),
    output: {
      filename: 'index.umd.js',
      path: path.join(__dirname, 'dist'),
      // libraryTarget: 'commonjs',
      library: {
        name: 'sdk_web',
        type: 'umd'
      }
      /**
       * Disables webpack top-level function wrapping (appears to be different in Webpack 4 -> 5)
       */
      // iife: false
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
      minimizer: [new TerserPlugin()]
    }
  };
};
