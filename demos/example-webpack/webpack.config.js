const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: path.join(__dirname, 'src/index.js'),
  output: {
    filename: 'index.js',
    path: path.join(__dirname, 'dist')
  },
  externals: {
    // BSON includes imports to these, but does not have a hard requirement for them to be present.
    crypto: 'Crypto',
    stream: 'Stream',
    vm: 'VM'
  },
  devtool: 'source-map',
  mode: 'development',
  resolve: {
    extensions: ['.js']
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, './index.html'),
      inject: true,
      title: 'Test',
      filename: 'index.html'
    })
  ]
};
