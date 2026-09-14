// The Diagnostics Protocol: the seam between the tool and any SDK, plus the data shapes it carries.
// Owned by the tool; imports nothing from any SDK package.
export * from './shapes.js';
export * from './integration.js';

export * from './client.js';
export * from './PostMessageTransport.js';

// Transitional: the wire-level contract still lives in `@powersync/common` until consumers move to
// `SdkIntegration`. Only the transport/wire types are taken from it; the shapes above are canonical.
export type {
  Transport,
  MessageHandler,
  WireMessage,
  RequestMessage,
  ResponseMessage,
  EventMessage,
  Channel,
  RequestMethod,
  DiagnosticsEventSource
} from '@powersync/common/diagnostics/contract';
