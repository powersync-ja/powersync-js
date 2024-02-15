import { formatRelative } from "date-fns";

export function stringToRelativeDate(date: string) {
  const dateObject = new Date(date);
  return dateObject ? formatRelative(new Date(date), new Date()) : "";
}
