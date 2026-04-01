import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolve a public asset path relative to the configured base path.
 * E.g. assetPath('powersync-logo.svg') → '/diagnostics/powersync-logo.svg'
 * when BASE_PATH is '/diagnostics'.
 */
export function assetPath(path: string): string {
  const base = ((window as any).__DIAG_BASE__ as string) || '';
  // Ensure no double slashes: base already has no trailing slash, path has no leading slash
  const cleanPath = path.replace(/^\//, '');
  return `${base}/${cleanPath}`;
}

// Source: https://stackoverflow.com/a/18650828/214837
export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
