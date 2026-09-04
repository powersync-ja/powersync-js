/**
 * The SDK-side diagnostics surface: the Port contract, the serialized-state mappers, and the agent.
 *
 * The agent depends only on the public {@link CommonPowerSyncDatabase} interface and its injected
 * transport + event source, so this one implementation serves every JS runtime. Concrete transports
 * and the core-diagnostics event source are supplied per runtime (e.g. `@powersync/web`).
 */
export * from './contract.js';
export * from './state.js';
export * from './agent.js';
