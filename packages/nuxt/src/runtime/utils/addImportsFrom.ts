import { addImports } from '@nuxt/kit';

interface ImportDefinition {
  name: string;
  type: boolean;
}
export const addImportsFrom = (names: (string | ImportDefinition)[], from: string) => {
  addImports(
    names.map((name) => ({
      name: typeof name === 'string' ? name : name.name,
      type: typeof name === 'string' ? false : name.type,
      from
    }))
  );
};
