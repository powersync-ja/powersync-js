const plugin = () => {
  return {
    name: 'mark-as-commonjs',
    transform: (code) => {
      return code.replace('const isCommonJsModule = false;', 'const isCommonJsModule = true;');
    }
  };
};

export default [
  {
    input: 'lib/index.js',
    plugins: [plugin()],
    output: {
      file: 'dist/bundle.cjs',
      format: 'cjs'
    }
  },
  {
    input: 'lib/db/SqliteWorker.js',
    plugins: [plugin()],
    output: {
      file: 'dist/worker.cjs',
      format: 'cjs'
    }
  }
];
