const path = require('path');

module.exports = {
  entry: './lib/index.js',
  mode: 'development',
  externals: {
    '@journeyapps/react-native-quick-sqlite': "require('@journeyapps/react-native-quick-sqlite')",
    react: "require('react')",
    'react-native': "require('react-native')",
    '@powersync/react': "require('@powersync/react')",
    bson: "require('bson')"
    // crypto: "require('crypto')"
  },
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist')
  },
  target: ['es5', 'web'],
  module: {
    rules: [
      {
        test: /.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
            presets: ['module:metro-react-native-babel-preset'],
            plugins: [['react-native-web', { commonjs: true }]]
          }
        }
      }
    ]
  }
};
