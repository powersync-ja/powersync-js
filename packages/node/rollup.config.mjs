import dts from 'rollup-plugin-dts';

const plugin = () => {
  return {
    name: 'mark-as-commonjs',
    async resolveId(source, importer, options) {
      if (importer && source.indexOf('modules.js')) {
        return await this.resolve(source.replace('modules.js', 'modules_commonjs.js'), importer, options);
      } else {
        return await this.resolve(source, importer, options);
      }
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
