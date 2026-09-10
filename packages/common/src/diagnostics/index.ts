/**
 * The SDK-side diagnostics surface: the Protocol contract, the serialized-state mappers, and the agent.
 *
 * The agent depends only on the public {@link CommonPowerSyncDatabase} interface and what the runtime
 * injects (transport, event source, connection access), so this one implementation serves every JS
 * runtime. Those pieces are supplied per runtime (e.g. `@powersync/web`).
 */
export * from './contract.js';
export * from './state.js';
export * from './agent.js';
