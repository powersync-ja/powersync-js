const plugin = () => {
  return {
    name: 'mark-as-commonjs',
    resolveImportMeta: (property) => {
      if (property == 'isBundlingToCommonJs') {
        return 'true';
      }

      return null;
    },
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
  }
];
