import { WASQLiteVFS } from '@powersync/web';
import { v4 as uuid } from 'uuid';
import { describe, expect, it, onTestFinished } from 'vitest';

/**
 * Creates an iframe with a PowerSync client that connects using the same database.
 * The iframe uses dynamic import to load PowerSync modules.
 *
 * Note: This approach works in Vitest browser mode where modules are available
 * via the Vite dev server. The iframe needs to access modules from the same origin.
 */
interface IframeClient {
  iframe: HTMLIFrameElement;
  cleanup: () => Promise<void>;
  executeQuery: (query: string, parameters?: unknown[]) => Promise<unknown[]>;
  getCredentialsFetchCount: () => Promise<number>;
}

interface IframeClientResult {
  iframe: HTMLIFrameElement;
  cleanup: () => Promise<void>;
  ready: Promise<IframeClient>;
}

// Run tests for both IndexedDB and OPFS
createMultipleTabsTest(); // IndexedDB (default)
createMultipleTabsTest(WASQLiteVFS.OPFSCoopSyncVFS);

function createIframeWithPowerSyncClient(
  dbFilename: string,
  identifier: string,
  vfs?: WASQLiteVFS,
  waitForConnection?: boolean,
  configureMockResponses?: boolean
): IframeClientResult {
  const iframe = document.createElement('iframe');
  // Make iframe visible for debugging
  iframe.style.display = 'block';
  iframe.style.width = '300px';
  iframe.style.height = '150px';
  iframe.style.border = '2px solid #007bff';
  iframe.style.margin = '10px';
  iframe.style.borderRadius = '4px';
  iframe.title = `PowerSync Client: ${identifier}`;
  document.body.appendChild(iframe);

  // Get the base URL for module imports
  // In Vitest browser mode, we need to construct a path relative to where the test file is served
  // Use import.meta.url to get the current test file's location
  const testFileUrl = new URL(import.meta.url);
  const testFileDir = testFileUrl.pathname.substring(0, testFileUrl.pathname.lastIndexOf('/'));
  // Construct the absolute path to the initializer module relative to the test file
  const modulePath = `${testFileUrl.origin}${testFileDir}/utils/iframeInitializer.ts`;

  // Create HTML content with module script that imports and executes the setup function
  // Vite will serve the module file, allowing proper module resolution
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>PowerSync Client ${identifier}</title>
  <style>
    body {
      margin: 0;
      padding: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      background: #f5f5f5;
    }
    #info {
      padding: 8px;
      background: #e7f3ff;
      border: 1px solid #b3d9ff;
      border-radius: 4px;
      font-size: 11px;
      color: #0066cc;
    }
    .label {
      font-weight: 600;
      margin-right: 4px;
    }
  </style>
</head>
<body>
  <div id="info">
    <div><span class="label">ID:</span>${identifier}</div>
    <div><span class="label">DB:</span>${dbFilename}</div>
    <div><span class="label">VFS:</span>${vfs || 'IndexedDB (default)'}</div>
  </div>
  <script type="module">
    import { setupPowerSyncInIframe } from '${modulePath}';
    setupPowerSyncInIframe('${dbFilename}', '${identifier}', ${vfs ? `'${vfs}'` : 'undefined'}, ${waitForConnection ? 'true' : 'false'}, ${configureMockResponses ? 'true' : 'false'});
  </script>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  iframe.src = url;

  let requestIdCounter = 0;
  const pendingRequests = new Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
    }
  >();

  let messageHandler: ((event: MessageEvent) => void) | null = null;
  let isCleanedUp = false;

  // Create cleanup function that can be called immediately
  const cleanup = async (): Promise<void> => {
    if (isCleanedUp) {
      return;
    }
    isCleanedUp = true;

    // Remove message handler if it was added
    if (messageHandler) {
      window.removeEventListener('message', messageHandler);
      messageHandler = null;
    }

    // Simulate abrupt tab closure - just remove the iframe without calling
    // disconnect/close on the PowerSync client. This tests dead tab detection.
    URL.revokeObjectURL(url);
    if (iframe.parentNode) {
      iframe.remove();
    }
  };

  // Create promise that resolves when powersync-ready is received
  const ready = new Promise<IframeClient>((resolve, reject) => {
    messageHandler = async (event: MessageEvent) => {
      if (isCleanedUp) {
        return;
      }

      const data = event.data;

      if (data?.type === 'powersync-ready' && data.identifier === identifier) {
        // Don't remove the message handler - we need it to receive query results!
        resolve({
          iframe,
          cleanup,
          executeQuery: (query: string, parameters?: unknown[]): Promise<unknown[]> => {
            return new Promise((resolveQuery, rejectQuery) => {
              if (isCleanedUp) {
                rejectQuery(new Error('Iframe has been cleaned up'));
                return;
              }

              const requestId = `query-${identifier}-${++requestIdCounter}`;
              pendingRequests.set(requestId, {
                resolve: resolveQuery,
                reject: rejectQuery
              });

              const iframeWindow = iframe.contentWindow;
              if (!iframeWindow) {
                pendingRequests.delete(requestId);
                rejectQuery(new Error('Iframe window not available'));
                return;
              }

              iframeWindow.postMessage(
                {
                  type: 'execute-query',
                  requestId,
                  query,
                  parameters
                },
                '*'
              );

              // Cleanup after timeout to prevent memory leaks
              setTimeout(() => {
                if (pendingRequests.has(requestId)) {
                  pendingRequests.delete(requestId);
                  rejectQuery(new Error('Query timeout'));
                }
              }, 30000);
            });
          },
          getCredentialsFetchCount: (): Promise<number> => {
            return new Promise((resolveCount, rejectCount) => {
              if (isCleanedUp) {
                rejectCount(new Error('Iframe has been cleaned up'));
                return;
              }

              const requestId = `credentials-count-${identifier}-${++requestIdCounter}`;
              pendingRequests.set(requestId, {
                resolve: resolveCount,
                reject: rejectCount
              });

              const iframeWindow = iframe.contentWindow;
              if (!iframeWindow) {
                pendingRequests.delete(requestId);
                rejectCount(new Error('Iframe window not available'));
                return;
              }

              iframeWindow.postMessage(
                {
                  type: 'get-credentials-count',
                  requestId
                },
                '*'
              );

              // Cleanup after timeout to prevent memory leaks
              setTimeout(() => {
                if (pendingRequests.has(requestId)) {
                  pendingRequests.delete(requestId);
                  rejectCount(new Error('Credentials count request timeout'));
                }
              }, 10000);
            });
          }
        });
      } else if (data?.type === 'powersync-error' && data.identifier === identifier) {
        if (messageHandler) {
          window.removeEventListener('message', messageHandler);
          messageHandler = null;
        }
        URL.revokeObjectURL(url);
        if (iframe.parentNode) {
          iframe.remove();
        }
        reject(new Error(`PowerSync error in iframe: ${data.error}`));
      } else if (data?.type === 'query-result' && data.identifier === identifier) {
        const pending = pendingRequests.get(data.requestId);
        if (pending) {
          pendingRequests.delete(data.requestId);
          if (data.success) {
            pending.resolve(data.result);
          } else {
            pending.reject(new Error(data.error || 'Query failed'));
          }
        }
      } else if (data?.type === 'credentials-count-result' && data.identifier === identifier) {
        const pending = pendingRequests.get(data.requestId);
        if (pending) {
          pendingRequests.delete(data.requestId);
          if (data.success) {
            pending.resolve(data.count);
          } else {
            pending.reject(new Error(data.error || 'Credentials count request failed'));
          }
        }
      }
    };
    window.addEventListener('message', messageHandler);
  });

  return {
    iframe,
    cleanup,
    ready
  };
}

/**
 * Test suite for simulating multiple browser tabs with PowerSync clients.
 *
 * Purpose:
 * These tests simulate the behavior of closing and reopening multiple browser tabs
 * that share a PowerSync database connection via a SharedWorker. This is critical
 * for testing PowerSync's dead tab detection and resource cleanup mechanisms.
 *
 * Iframe vs Real Tab Behavior:
 * Closing an iframe by removing it from the DOM is similar to closing a real browser tab
 * for PowerSync's purposes because:
 * 1. Navigator Locks API: PowerSync uses Navigator Locks to detect tab closure. When an
 *    iframe is removed, its execution context is destroyed and any held locks are automatically
 *    released, just like when a real tab closes. This is the primary mechanism PowerSync uses
 *    for dead tab detection (see SharedWebStreamingSyncImplementation.ts).
 * 2. MessagePort Closure: When an iframe is removed, any MessagePorts used for communication
 *    with the SharedWorker are closed, triggering cleanup in the worker.
 * 3. Window Unload: The iframe's window context is destroyed, which would trigger unload
 *    event listeners if registered (PowerSyncDatabase registers an 'unload' listener when
 *    enableMultiTabs is true).
 *
 * Test Scenarios:
 * - Opening 100 tabs simultaneously
 * - Waiting 1 second for all tabs to initialize
 * - Simultaneously closing all tabs except the middle (50th) tab
 * - Verifying that the remaining tab is still functional and the shared database
 *   connection is properly maintained after closing 99 tabs
 *
 * This test suite runs for both IndexedDB and OPFS VFS backends to ensure dead tab
 * detection works correctly across different storage mechanisms.
 */
function createMultipleTabsTest(vfs?: WASQLiteVFS) {
  const vfsName = vfs || 'IndexedDB';
  describe(`Multiple Tabs with Iframes (${vfsName})`, { sequential: true, timeout: 30_000 }, () => {
    const dbFilename = `test-multi-tab-${uuid()}.db`;

    // Number of tabs to create
    const NUM_TABS = 100;
    // Index of the middle tab to keep (0-indexed, so 49 is the 50th tab)
    const MIDDLE_TAB_INDEX = 49;

    it('should handle opening and closing many tabs quickly', async () => {
      // Step 0: Create an iframe to set up PowerSync and configure mock responses (401)
      const setupIdentifier = `setup-${uuid()}`;
      const setupIframe = createIframeWithPowerSyncClient(dbFilename, setupIdentifier, vfs, false, true);
      onTestFinished(async () => {
        try {
          await setupIframe.cleanup();
        } catch (e) {
          // Ignore cleanup errors
        }
      });
      // Wait for the setup iframe to be ready (this ensures PowerSync is initialized and mock responses are configured)
      await setupIframe.ready;
      // Step 1: Open 100 tabs (don't wait for them to be ready)
      const tabResults: IframeClientResult[] = [setupIframe];

      for (let i = 0; i < NUM_TABS; i++) {
        const identifier = `tab-${i}`;
        const result = createIframeWithPowerSyncClient(dbFilename, identifier, vfs);
        tabResults.push(result);

        // Register cleanup for each tab
        onTestFinished(async () => {
          try {
            await result.cleanup();
          } catch (e) {
            // Ignore cleanup errors - tab might already be closed
          }
        });
      }

      // Total iframes: 1 setup + NUM_TABS tabs
      expect(tabResults.length).toBe(NUM_TABS + 1);

      // Verify all iframes are created (they're created immediately)
      for (const result of tabResults) {
        expect(result.iframe.isConnected).toBe(true);
      }

      // Step 2: Wait 1 second
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 3: Close all tabs except the setup iframe (index 0) and the middle (50th) tab
      // The middle tab is at index 1 + MIDDLE_TAB_INDEX (since index 0 is the setup iframe)
      const middleTabArrayIndex = 1 + MIDDLE_TAB_INDEX;
      const tabsToClose: IframeClientResult[] = [];
      for (let i = 0; i < tabResults.length; i++) {
        // Skip the setup iframe (index 0) and the middle tab
        if (i !== 0 && i !== middleTabArrayIndex) {
          tabsToClose.push(tabResults[i]);
        }
      }

      // Close all tabs except the setup iframe and middle one simultaneously (without waiting for ready)
      const closePromises = tabsToClose.map((result) => result.cleanup());
      await Promise.all(closePromises);

      // Verify closed tabs are removed
      for (let i = 0; i < tabResults.length; i++) {
        if (i !== 0 && i !== middleTabArrayIndex) {
          expect(tabResults[i].iframe.isConnected).toBe(false);
          expect(document.body.contains(tabResults[i].iframe)).toBe(false);
        }
      }

      // Verify the setup iframe and middle tab are still present
      expect(tabResults[0].iframe.isConnected).toBe(true);
      expect(document.body.contains(tabResults[0].iframe)).toBe(true);
      expect(tabResults[middleTabArrayIndex].iframe.isConnected).toBe(true);
      expect(document.body.contains(tabResults[middleTabArrayIndex].iframe)).toBe(true);

      // Step 4: Wait for the middle tab to be ready, then execute a test query to verify its DB is still functional
      const middleTabClient = await tabResults[middleTabArrayIndex].ready;
      const queryResult = await middleTabClient.executeQuery('SELECT 1 as value');

      // Verify the query result
      expect(queryResult).toBeDefined();
      expect(Array.isArray(queryResult)).toBe(true);
      expect(queryResult.length).toBe(1);
      expect((queryResult[0] as { value: number }).value).toBe(1);

      // Step 5: Create another tab, wait for it to be ready, and verify its credentialsFetchCount is 1
      const newTabIdentifier = `new-tab-${Date.now()}`;
      const newTabResult = createIframeWithPowerSyncClient(dbFilename, newTabIdentifier, vfs, true);
      onTestFinished(async () => {
        try {
          await newTabResult.cleanup();
        } catch (e) {
          // Ignore cleanup errors
        }
      });
      const newTabClient = await newTabResult.ready;

      // Verify the new tab's credentials fetch count is 1
      // This means the shared worker is using the db and attempting to connect to the PowerSync server.
      const credentialsFetchCount = await newTabClient.getCredentialsFetchCount();
      expect(credentialsFetchCount).toBe(1);
    });
  });
}
