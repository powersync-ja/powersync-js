import { SETUP_SDKS, type SetupSdk } from '../src';

/**
 * Reads a list of SDKs such as `nuxt,web`, keeping the known ones in the given order. Returns
 * `null` when nothing known is listed, so the panel covers every SDK.
 */
export function parseSdks(value: unknown): SetupSdk[] | null {
  const names = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const sdks = names
    .map((name) => String(name).trim())
    .filter((name): name is SetupSdk => (SETUP_SDKS as readonly string[]).includes(name));
  return sdks.length ? [...new Set(sdks)] : null;
}

/**
 * The SDKs an embedder names on the page URL: `?sdks=nuxt,web`. A host that opens this page in an
 * iframe (Flutter DevTools, a Nuxt DevTools tab) sets it so the "no database" screens explain only
 * the SDKs it can reach.
 */
export function sdksFromUrl(): SetupSdk[] | null {
  if (typeof window === 'undefined') return null;
  return parseSdks(new URLSearchParams(location.search).get('sdks'));
}
