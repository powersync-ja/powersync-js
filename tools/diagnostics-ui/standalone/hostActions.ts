import type { ActionName } from '@powersync/diagnostics-core';

// A record, so adding an action to ActionName fails to compile until it is listed here.
const ACTIONS: Record<ActionName, true> = {
  reconnect: true,
  disconnect: true,
  clearData: true,
  requestCheckpoint: true,
  subscribeStream: true,
  unsubscribeStream: true
};

/**
 * The actions whose buttons an embedder hides, named on the page URL: `?hiddenActions=reconnect,disconnect`.
 * Unknown names are dropped. Returns `null` when the URL names none, so every button shows.
 */
export function hiddenActionsFromUrl(): ActionName[] | null {
  if (typeof window === 'undefined') return null;
  const known = Object.keys(ACTIONS);
  const actions = (new URLSearchParams(location.search).get('hiddenActions') ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter((name): name is ActionName => known.includes(name));
  return actions.length ? [...new Set(actions)] : null;
}
