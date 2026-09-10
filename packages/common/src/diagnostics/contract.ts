/**
 * The Diagnostics Protocol contract, without the agent.
 *
 * This is the surface a host/inspector (the diagnostics client + UI) needs: the wire protocol, the
 * transport interface, and the event-source interface. The agent lives alongside these but is
 * exported separately so host consumers never pull it in.
 */
export * from './protocol.js';
export * from './transport.js';
export * from './event-source.js';
