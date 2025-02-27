module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: ['@babel/plugin-transform-async-generator-functions']
  }
};
