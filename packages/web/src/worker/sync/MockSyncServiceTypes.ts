/**
 * Representation of a pending request
 */
export interface PendingRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
}

/**
 * Message types for communication via MessagePort
 */
export type MockSyncServiceMessage =
  | { type: 'getPendingRequests'; requestId: string }
  | {
      type: 'createResponse';
      requestId: string;
      pendingRequestId: string;
      status: number;
      headers: Record<string, string>;
    }
  | { type: 'pushBodyData'; requestId: string; pendingRequestId: string; data: string | ArrayBuffer | Uint8Array }
  | { type: 'completeResponse'; requestId: string; pendingRequestId: string };

export type MockSyncServiceResponse =
  | { type: 'getPendingRequests'; requestId: string; requests: PendingRequest[] }
  | { type: 'createResponse'; requestId: string; success: boolean }
  | { type: 'pushBodyData'; requestId: string; success: boolean }
  | { type: 'completeResponse'; requestId: string; success: boolean }
  | { type: 'error'; requestId?: string; error: string };

/**
 * Internal representation of a pending request with response promise
 */
export interface PendingRequestInternal {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  responsePromise: {
    resolve: (response: Response) => void;
    reject: (error: Error) => void;
  };
  streamController?: ReadableStreamDefaultController<Uint8Array>;
}

/**
 * Internal representation of an active response
 */
export interface ActiveResponse {
  id: string;
  status: number;
  headers: Record<string, string>;
  stream: ReadableStreamDefaultController<Uint8Array>;
}
