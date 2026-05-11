import type { GenericValidator, Infer, VObject } from 'convex/values';

type SQLiteValue = string | number | bigint | boolean | null | ArrayBuffer | Uint8Array | undefined;
type ConvexObjectValidator = VObject<any, Record<string, GenericValidator>, any, any>;
type ConvexObjectKey<Schema extends ConvexObjectValidator> = Extract<keyof Infer<Schema>, string>;
type SQLiteRowFor<Schema extends ConvexObjectValidator> = Partial<Record<ConvexObjectKey<Schema>, SQLiteValue>>;

/**
 * Field-level escape hatches for values that cannot be decoded safely from
 * the Convex validator alone, such as unions or application-specific formats.
 */
export type ConvexDecoderOverrides<
  Schema extends ConvexObjectValidator,
  Row extends Partial<Record<string, unknown>>
> = Partial<{
  [Key in ConvexObjectKey<Schema>]: {
    decode: (value: Key extends keyof Row ? Row[Key] : unknown, row: Row) => Infer<Schema>[Key];
  };
}>;

/**
 * Builds a row decoder from a Convex object validator.
 *
 * PowerSync stores values in SQLite formats. This means CRUD operations are reported as SQLite values.
 * The Convex mutations require payloads in the server side form. The decoder returned here
 * should help with the conversaion process.
 *
 * The returned function walks the destination schema fields, copies only keys
 * present on the SQLite row, applies explicit overrides first, and then falls
 * back to the built-in SQLite-to-Convex conversions for simple validator kinds.
 */
export function createConvexDecoder<
  Schema extends ConvexObjectValidator,
  Row extends Partial<Record<string, unknown>> = SQLiteRowFor<Schema>
>(schema: Schema, overrides: ConvexDecoderOverrides<Schema, Row> = {}) {
  return (row: Row): Partial<Infer<Schema>> => {
    const result: Partial<Infer<Schema>> = {};

    for (const fieldName of Object.keys(schema.fields) as ConvexObjectKey<Schema>[]) {
      if (!Object.prototype.hasOwnProperty.call(row, fieldName)) {
        continue;
      }

      const override = overrides[fieldName];
      const value = row[fieldName];
      result[fieldName] = override?.decode
        ? override.decode(value as never, row)
        : decodeSQLiteValue(schema.fields[fieldName], value, fieldName);
    }

    return result;
  };
}

function decodeSQLiteValue(validator: GenericValidator, value: unknown, fieldName: string): any {
  if (value === undefined) {
    return undefined;
  }

  if (validator.kind === 'union') {
    throw new Error(`No Convex decoder override configured for union field "${fieldName}".`);
  }

  if (value === null) {
    return validator.isOptional === 'optional' ? undefined : null;
  }

  switch (validator.kind) {
    case 'boolean':
      return decodeBoolean(value);
    case 'float64':
      return value;
    case 'int64':
      return typeof value === 'bigint' ? value : BigInt(value as string | number);
    case 'array': {
      const parsed = parseJsonString(value);
      return Array.isArray(parsed)
        ? parsed.map((item) => decodeSQLiteValue(validator.element, item, fieldName))
        : parsed;
    }
    case 'object': {
      const parsed = parseJsonString(value);
      if (!isPlainObject(parsed)) {
        return parsed;
      }
      return createConvexDecoder<typeof validator, Record<string, unknown>>(validator)(parsed);
    }
    case 'record': {
      const parsed = parseJsonString(value);
      if (!isPlainObject(parsed)) {
        return parsed;
      }
      return Object.fromEntries(
        Object.entries(parsed).map(([recordKey, recordValue]) => [
          recordKey,
          decodeSQLiteValue(validator.value, recordValue, fieldName)
        ])
      );
    }
    case 'any':
    case 'bytes':
    case 'id':
    case 'literal':
    case 'null':
    case 'string':
      return value;
    default:
      throw new Error(
        `No SQLite to Convex decoder configured for field "${fieldName}" with kind "${(validator as GenericValidator).kind}".`
      );
  }
}

function decodeBoolean(value: unknown) {
  if (typeof value === 'number') {
    return value > 0;
  }
  // Lazy return the value, Convex's validator will provide an error
  return value;
}

function parseJsonString(value: unknown) {
  if (typeof value !== 'string') {
    // Lazy return the value, Convex's validator will provide an error
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    // Only normalize obvious SQLite representations here. If a value still
    // doesn't match the Convex schema, let Convex's validator report it.
    return value;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
