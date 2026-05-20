import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'react-native': path.resolve(__dirname, './tests/mocks/react-native.ts'),
      'react-native-fetch-api': path.resolve(__dirname, './tests/mocks/react-native-fetch-api.ts')
    }
  },
  test: {
    include: ['tests/**/*.test.ts']
  }
});
