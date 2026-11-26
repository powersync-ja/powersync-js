import { SyncStreamConnectionMethod, WASQLiteVFS } from '@powersync/web';

/**
 * WebKit (Safari on macOS, and every browser on iOS/iPadOS since they are all
 * WebKit) has historically been the flakiest target for OPFS. We use an
 * in-memory database there instead. Everywhere else we persist to OPFS.
 */
export function isWebKit(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  const ua = navigator.userAgent;

  // iPadOS 13+ reports as "MacIntel" desktop Safari; the touch-point count
  // distinguishes an actual iPad from a Mac.
  const isIOS = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) {
    // Every iOS browser (Chrome/Firefox/in-app WebViews) is WebKit under the hood.
    return true;
  }

  // Desktop Safari: has the Safari token but none of the Chromium-family tokens.
  return /Safari\//.test(ua) && !/Chrom(e|ium)|CriOS|FxiOS|Edg|OPR|Android/.test(ua);
}

export function selectVFS(): WASQLiteVFS {
  if (isWebKit()) {
    return WASQLiteVFS.IDBBatchAtomicVFS;
  }
  return WASQLiteVFS.OPFSCoopSyncVFS;
}

export function selectMultiTabs(): boolean {
  return isWebKit() ? false : true;
}

export function selectConnectionMethod(): SyncStreamConnectionMethod {
  return SyncStreamConnectionMethod.HTTP;
}
