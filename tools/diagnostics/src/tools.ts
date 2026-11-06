/**
 * The agent tools every host offers: the devframe MCP functions and the Rozenite agent tools. Each host
 * adds how its arguments are passed; the names and descriptions stay the same.
 */
import type { ActionName } from '@powersync/diagnostics-core';

// A record, so a new action name fails to compile until it is listed here.
const actions: Record<ActionName, true> = {
  reconnect: true,
  disconnect: true,
  clearData: true,
  requestCheckpoint: true,
  subscribeStream: true,
  unsubscribeStream: true
};

export const ACTION_NAMES = Object.keys(actions) as [ActionName, ...ActionName[]];

export const TOOL_DESCRIPTIONS = {
  query:
    'Run SQL against the PowerSync SQLite database. App tables are views; the sync client state is in the ps_* tables (ps_buckets, ps_oplog, ps_crud, ps_stream_subscriptions). Returns columns and rows.',
  schema: 'The client schema as the PowerSync SQLite core receives it: tables, columns, indexes.',
  info: 'Connection info of the PowerSync client: endpoint, user id, client id, connection method, core version.',
  status:
    'The latest sync status the PowerSync client reported: connected, downloading, progress, last sync, errors. Null until it has reported.',
  'upload-queue': 'Pending local changes waiting to upload, as last reported: count and size. Null until reported.',
  action:
    'Run a control action on the PowerSync client: reconnect, disconnect, clearData (wipes local data and re-syncs), requestCheckpoint, subscribeStream, unsubscribeStream.'
} as const;

export const ARGUMENT_DESCRIPTIONS = {
  sql: 'SQL to run against the local SQLite database.',
  params: 'Positional parameters for `?` placeholders.',
  actionArgs: 'Stream name and options, for subscribeStream and unsubscribeStream only: { name, params?, ttl?, priority? }.'
} as const;
