// Note: When updating this file, always update module_commonjs.ts as well.
export const isBundledToCommonJs: boolean = false;

export async function dynamicImport(path: string) {
  return await import(path);
}
