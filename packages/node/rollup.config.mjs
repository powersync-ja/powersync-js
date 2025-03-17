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
    input: 'lib/db/SqliteWorker.js',
    plugins: [plugin()],
    output: {
      file: 'dist/worker.cjs',
      format: 'cjs',
      sourcemap: true
    }
  }
];
