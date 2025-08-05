import dts from 'rollup-plugin-dts';

const plugin = () => {
  return {
    name: 'mark-as-commonjs',
    resolveImportMeta: (property) => {
      if (property == 'isBundlingToCommonJs') {
        return 'true';
      }

      return null;
    }
  };
};

export default [
  {
    input: 'lib/index.js',
    plugins: [plugin()],
    output: {
      file: 'dist/bundle.cjs',
      format: 'cjs',
      sourcemap: true
    }
  },
  {
    input: 'lib/index.d.ts',
    output: {
      file: 'dist/bundle.d.cts',
      format: 'cjs'
    },
    plugins: [dts()]
  },
  {
    input: 'lib/db/DefaultWorker.js',
    plugins: [plugin()],
    output: {
      file: 'dist/DefaultWorker.cjs',
      format: 'cjs',
      sourcemap: true
    }
  },
  {
    input: 'lib/worker.js',
    plugins: [plugin()],
    output: {
      file: 'dist/worker.cjs',
      format: 'cjs',
      sourcemap: true
    }
  },
  {
    input: 'lib/worker.d.ts',
    output: {
      file: 'dist/worker.d.cts',
      format: 'cjs'
    },
    plugins: [dts()]
  }
];
