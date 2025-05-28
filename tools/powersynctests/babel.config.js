module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    '@babel/plugin-transform-class-static-block',
    [
      'module-resolver',
      {
        alias: {
          stream: 'stream-browserify',
        },
      },
    ],
  ],
};
