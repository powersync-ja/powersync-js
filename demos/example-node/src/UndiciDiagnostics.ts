import * as diagnostics_channel from 'node:diagnostics_channel';
import type { DiagnosticsChannel } from 'undici';

/**
 * Enable Undici diagnostics channel instrumentation for detailed connection and request logging.
 *
 * This includes fetch requests and websocket connections.
 *
 * Usage: enableUncidiDiagnostics();
 */
export function enableUncidiDiagnostics() {
  new UndiciDiagnostics().enable();
}

class UndiciDiagnostics {
  private requestCounter: number = 0;
  private activeRequests: WeakMap<any, number> = new WeakMap();

  enable() {
    // Available events are documented here:
    // https://github.com/nodejs/undici/blob/main/docs/docs/api/DiagnosticsChannel.md

    diagnostics_channel.subscribe('undici:request:create', (message: DiagnosticsChannel.RequestCreateMessage) => {
      const requestId = ++this.requestCounter;
      const request = message.request;
      this.activeRequests.set(message.request, requestId);

      console.log(`🔄 [DIAG-${requestId}] REQUEST CREATE:`, {
        host: request.origin,
        path: request.path,
        method: request.method,
        headers: formatHeaders(request.headers),
        contentType: (request as any).contentType,
        contentLength: (request as any).contentLength
      });
    });

    diagnostics_channel.subscribe('undici:request:bodySent', (message: DiagnosticsChannel.RequestBodySentMessage) => {
      const requestId = this.activeRequests.get(message.request);
      console.log(`📤 [DIAG-${requestId}] REQUEST BODY SENT`);
    });

    diagnostics_channel.subscribe('undici:request:headers', (message: DiagnosticsChannel.RequestHeadersMessage) => {
      const requestId = this.activeRequests.get(message.request);
      console.log(`📥 [DIAG-${requestId}] RESPONSE HEADERS:`, {
        statusCode: message.response.statusCode,
        statusText: message.response.statusText,
        headers: formatHeaders(message.response.headers)
      });
    });

    diagnostics_channel.subscribe('undici:request:trailers', (message: DiagnosticsChannel.RequestTrailersMessage) => {
      const requestId = this.activeRequests.get(message.request);
      console.log(`🏁 [DIAG-${requestId}] REQUEST TRAILERS:`, {
        trailers: message.trailers
      });
    });

    diagnostics_channel.subscribe('undici:request:error', (message: DiagnosticsChannel.RequestErrorMessage) => {
      const requestId = this.activeRequests.get(message.request);
      console.log(`❌ [DIAG-${requestId}] REQUEST ERROR:`, {
        error: message.error
      });

      // Clean up tracking
      this.activeRequests.delete(message.request);
    });

    // Client connection events
    diagnostics_channel.subscribe(
      'undici:client:sendHeaders',
      (message: DiagnosticsChannel.ClientSendHeadersMessage) => {
        console.log(`📡 [DIAG] CLIENT SEND HEADERS:`, {
          headers: formatHeaders(message.headers)
        });
      }
    );

    diagnostics_channel.subscribe(
      'undici:client:beforeConnect',
      (message: DiagnosticsChannel.ClientBeforeConnectMessage) => {
        console.log(`🔌 [DIAG] CLIENT BEFORE CONNECT:`, {
          connectParams: message.connectParams
        });
      }
    );

    diagnostics_channel.subscribe('undici:client:connected', (message: DiagnosticsChannel.ClientConnectedMessage) => {
      console.log(`✅ [DIAG] CLIENT CONNECTED:`, {
        connectParams: message.connectParams,
        connector: message.connector?.name,
        socket: {
          localAddress: message.socket?.localAddress,
          localPort: message.socket?.localPort,
          remoteAddress: message.socket?.remoteAddress,
          remotePort: message.socket?.remotePort
        }
      });
    });

    diagnostics_channel.subscribe(
      'undici:client:connectError',
      (message: DiagnosticsChannel.ClientConnectErrorMessage) => {
        console.log(`❌ [DIAG] CLIENT CONNECT ERROR:`, {
          connectParams: message.connectParams,
          error: message.error
        });
      }
    );

    // WebSocket events
    diagnostics_channel.subscribe('undici:websocket:open', (message: any) => {
      console.log(`🌐 [DIAG] WEBSOCKET OPEN:`, {
        address: message.address,
        protocol: message.protocol,
        extensions: message.extensions
      });
    });

    diagnostics_channel.subscribe('undici:websocket:close', (message: any) => {
      console.log(`🌐 [DIAG] WEBSOCKET CLOSE:`, {
        websocket: message.websocket?.url,
        code: message.code,
        reason: message.reason
      });
    });

    diagnostics_channel.subscribe('undici:websocket:socket_error', (message: any) => {
      console.log(`❌ [DIAG] WEBSOCKET SOCKET ERROR:`, {
        websocket: message.websocket?.url,
        error: message.error
      });
    });
  }
}

function formatHeaders(headers: any[] | string | undefined) {
  if (typeof headers === 'string') {
    return headers;
  }

  return headers?.map((header) => {
    if (typeof header == 'string') {
      return header;
    } else if (Buffer.isBuffer(header)) {
      return header.toString('utf-8');
    } else {
      return header;
    }
  });
}
