import { z } from 'zod';

export const stringToDate = z.string().transform((val) => new Date(val));
export const nullableStringToDate = z
  .string()
  .nullable()
  .transform((val) => (val ? new Date(val) : null));
export const numberToBoolean = z.number().transform((val) => val > 0);
