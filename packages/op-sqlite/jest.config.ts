// jest.config.ts
import { createJsWithTsPreset, type JestConfigWithTsJest } from 'ts-jest';

const jestConfig: JestConfigWithTsJest = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-test': {
      tsConfig: 'tsconfig.test.json'
    }
  },
  transform: {
    ...createJsWithTsPreset().transform
  },
  transformIgnorePatterns: ['node_modules/(?!@me/test-package)']
};

export default jestConfig;
