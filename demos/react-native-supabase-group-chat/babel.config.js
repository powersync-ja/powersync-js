module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        '@tamagui/babel-plugin',
        {
          components: ['tamagui'],
          config: './src/tamagui.config.ts'
        }
      ],
      '@babel/plugin-transform-async-generator-functions',
      'react-native-reanimated/plugin'
    ]
  };
};
