export function quoteString(s: string) {
  return `'${s.replaceAll("'", "''")}'`;
}

export function quoteJsonPath(path: string) {
  return quoteString(`$.${path}`);
}
