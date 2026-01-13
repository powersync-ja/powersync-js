import dts from 'rollup-plugin-dts';

const external = [
  '@capacitor/core',
  '@capacitor-community/sqlite',
  '@powersync/common',
  '@powersync/web',
  '@journeyapps/wa-sqlite'
];

export default [
  // JavaScript bundles
  {
    input: 'dist/esm/index.js',
    output: [
      {
        file: 'dist/plugin.js',
        format: 'iife',
        name: 'capacitorPowerSync',
        globals: {
          '@capacitor/core': 'capacitorExports'
        },
        sourcemap: true,
        inlineDynamicImports: true
      },
      {
        file: 'dist/plugin.cjs',
        format: 'cjs',
        sourcemap: true,
        inlineDynamicImports: true
      }
    ],
    external
  },
  // CJS type declarations bundle
  {
    input: 'dist/esm/index.d.ts',
    output: {
      file: 'dist/plugin.d.cts',
      format: 'es'
    },
    plugins: [dts()],
    external
  }
];
