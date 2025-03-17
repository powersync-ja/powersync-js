export default [
  {
    input: 'lib/index.js',
    output: {
      file: 'dist/bundle.cjs',
      format: 'cjs'
    }
  },
  {
    input: 'lib/db/SqliteWorker.js',
    output: {
      file: 'dist/worker.cjs',
      format: 'cjs'
    }
  }
];
