export interface CompilableQuery<T> {
  execute(): Promise<T[]>;
  compile(): CompiledQuery;
}

export interface CompiledQuery {
  readonly sql: string;
  readonly parameters: ReadonlyArray<unknown>;
}
