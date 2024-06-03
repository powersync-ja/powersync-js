const path = require('path');

module.exports = {
  entry: './lib/index.js',
  mode: 'development',
  externals: {
    '@journeyapps/react-native-quick-sqlite': "require('@journeyapps/react-native-quick-sqlite')",
    react: "require('react')",
    'react-native': "require('react-native')",
    '@powersync/react': "require('@powersync/react')",
    crypto: 'crypto'
  },
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      {
        test: /.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      }
    ]
  }
};
