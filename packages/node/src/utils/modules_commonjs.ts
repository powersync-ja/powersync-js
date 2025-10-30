// NOTE! Do not import this file directly! We have a rollup plugin that rewrites imports to modules.js to this file when
// bundling to CommonJS.
export const isBundledToCommonJs: boolean = true;

export async function dynamicImport(path: string) {
  return require(path);
}
