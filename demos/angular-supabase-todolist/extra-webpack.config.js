const webpack = require('webpack');
const pkg = require('./package.json');
const path = require('path');

const dotenv = require('dotenv');

dotenv.config();

module.exports = (config, options, targetOptions) => {
  delete config.optimization;
  return {
    ...config,
    module: {
      rules: config.module.rules
    },
    resolve: config.resolve,
    plugins: [
      ...config.plugins,
      new webpack.DefinePlugin({
        // Embed environment variables starting with `WEBPACK_PUBLIC_`
        'process.env': JSON.stringify(
          Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith('WEBPACK_PUBLIC_')))
        )
      })
    ],
    output: {
      filename: config.filename,
      path: config.path,
      clean: true
    },
    experiments: {
      ...config.experiments,
      topLevelAwait: true
    },
    externals: {
      // BSON includes imports to these, but does not have a hard requirement for them to be present.
      crypto: 'Crypto',
      stream: 'Stream',
      vm: 'VM'
    },
    resolveLoader: { symlinks: true },
    cache: config.cache,
    target: config.target,
    stats: config.stats,
    devtool: 'source-map',
    mode: 'development'
  };
};
