import { addImports } from '@nuxt/kit'

export const addImportsFrom = (names: string[], from: string) => {
  addImports(names.map(name => ({ name, from })))
}
