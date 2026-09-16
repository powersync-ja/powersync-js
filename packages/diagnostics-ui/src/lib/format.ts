export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString();
}

const compactFormatter = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

/**
 * Compact counts that stay short at any scale: `999`, `1.5K`, `12M`, `3B`. Use for totals that can
 * blow up (operations, upload queue) so the layout never breaks.
 */
export function formatCompact(value: number | null | undefined): string {
  if (value == null) return '0';
  if (Math.abs(value) < 1000) return String(value);
  return compactFormatter.format(value);
}

/** A timestamp the formatters can render: a finite epoch value. */
function isValidTime(ms: number | null | undefined): ms is number {
  return ms != null && Number.isFinite(ms);
}

export function formatTimestamp(ms: number | null | undefined): string {
  if (!isValidTime(ms)) return '—';
  return new Date(ms).toLocaleString();
}

export function formatRelative(ms: number | null | undefined): string {
  if (!isValidTime(ms)) return 'never';
  const seconds = Math.round((Date.now() - ms) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(ms).toLocaleDateString();
}

/**
 * Precise timestamp down to the millisecond (sync events are often milliseconds apart, so relative
 * time is useless). Shows time-of-day with ms; prepends the date only when it isn't today.
 */
export function formatPrecise(ms: number | null | undefined): string {
  if (!isValidTime(ms)) return '—';
  const d = new Date(ms);
  // Must list hour/minute/second explicitly — with only `fractionalSecondDigits` set, the formatter
  // outputs just the milliseconds. (`fractionalSecondDigits` is valid at runtime but absent from the
  // older DOM lib types, hence the cast.)
  const options = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    fractionalSecondDigits: 3
  } as Intl.DateTimeFormatOptions;
  const time = d.toLocaleTimeString(undefined, options);
  const isToday = d.toDateString() === new Date().toDateString();
  return isToday ? time : `${d.toLocaleDateString()} ${time}`;
}

export function formatParams(params: Record<string, unknown> | null | undefined): string {
  if (params == null || Object.keys(params).length === 0) return '—';
  return JSON.stringify(params);
}
