const withImages = require('next-images');
const path = require('path');

module.exports = withImages({
  images: {
    disableStaticImages: true
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      return config;
    }
    return {
      ...config,
      module: {
        ...config.module,
        rules: [
          ...config.module.rules,
          {
            test: /\.css/,
            use: ['style-loader', 'css-loader']
          },
          {
            test: /\.scss/,
            use: ['style-loader', 'css-loader', 'sass-loader']
          }
        ]
      }
    };
  }
});
