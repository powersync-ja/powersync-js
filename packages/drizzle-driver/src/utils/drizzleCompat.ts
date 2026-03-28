import { isTable } from 'drizzle-orm';

export type RuntimeRelationsConfig = Record<
  string,
  {
    table: unknown;
    name: string;
    relations: Record<string, unknown>;
  }
>;

export function isDrizzleBetaRuntime(dialect: object): boolean {
  return typeof (dialect as any)._buildRelationalQuery === 'function';
}

export function extractFallbackRelations(schema: Record<string, unknown> | undefined): RuntimeRelationsConfig {
  if (!schema) {
    return {};
  }

  const resolvedSchema =
    Object.keys(schema).length === 1 && 'default' in schema && !isTable(schema.default)
      ? (schema.default as Record<string, unknown>)
      : schema;

  const relations: RuntimeRelationsConfig = {};

  for (const [key, value] of Object.entries(resolvedSchema)) {
    if (isTable(value)) {
      relations[key] = {
        table: value,
        name: key,
        relations: {}
      };
    }
  }

  return relations;
}
