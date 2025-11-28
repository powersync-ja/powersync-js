import { WASQLiteVFS } from '@powersync/web';
import { v4 as uuid } from 'uuid';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

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

// Run tests for both IndexedDB and OPFS
createMultipleTabsTest(); // IndexedDB (default)
createMultipleTabsTest(WASQLiteVFS.OPFSCoopSyncVFS);

async function createIframeWithPowerSyncClient(
  dbFilename: string,
  identifier: string,
  vfs?: WASQLiteVFS,
  waitForConnection?: boolean
): Promise<IframeClient> {
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
    setupPowerSyncInIframe('${dbFilename}', '${identifier}', ${vfs ? `'${vfs}'` : 'undefined'}, ${waitForConnection ? 'true' : 'false'});
  </script>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  iframe.src = url;

  return new Promise((resolve, reject) => {
    let requestIdCounter = 0;
    const pendingRequests = new Map<
      string,
      {
        resolve: (value: any) => void;
        reject: (error: Error) => void;
      }
    >();

    const messageHandler = async (event: MessageEvent) => {
      const data = event.data;

      if (data?.type === 'powersync-ready' && data.identifier === identifier) {
        // Don't remove the message handler - we need it to receive query results!
        resolve({
          iframe,
          cleanup: async () => {
            // Simulate abrupt tab closure - just remove the iframe without calling
            // disconnect/close on the PowerSync client. This tests dead tab detection.
            URL.revokeObjectURL(url);
            if (iframe.parentNode) {
              iframe.remove();
            }
          },
          executeQuery: (query: string, parameters?: unknown[]): Promise<unknown[]> => {
            return new Promise((resolveQuery, rejectQuery) => {
              const requestId = `query-${identifier}-${++requestIdCounter}`;
              pendingRequests.set(requestId, {
                resolve: resolveQuery,
                reject: rejectQuery
              });

              const iframeWindow = iframe.contentWindow;
              if (!iframeWindow) {
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
              const requestId = `credentials-count-${identifier}-${++requestIdCounter}`;
              pendingRequests.set(requestId, {
                resolve: resolveCount,
                reject: rejectCount
              });

              const iframeWindow = iframe.contentWindow;
              if (!iframeWindow) {
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
        window.removeEventListener('message', messageHandler);
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
 * - Opening a long-lived reference tab that remains open throughout the test
 * - Opening multiple additional tabs simultaneously
 * - Simultaneously closing half of the tabs (simulating abrupt tab closures)
 * - Simultaneously reopening the closed tabs
 * - Verifying that all tabs remain functional and the shared database connection
 *   is properly maintained across tab lifecycle events
 *
 * This test suite runs for both IndexedDB and OPFS VFS backends to ensure dead tab
 * detection works correctly across different storage mechanisms.
 */
function createMultipleTabsTest(vfs?: WASQLiteVFS) {
  const vfsName = vfs || 'IndexedDB';
  describe(`Multiple Tabs with Iframes (${vfsName})`, { sequential: true, timeout: 20_000 }, () => {
    const dbFilename = `test-multi-tab-${uuid()}.db`;

    // Configurable number of tabs to create (excluding the long-lived tab)
    const NUM_TABS = 20;

    it('should handle simultaneous close and reopen of tabs', async () => {
      // Step 1: Open a long-lived reference tab that stays open throughout the test
      const longLivedTab = await createIframeWithPowerSyncClient(dbFilename, 'long-lived-tab', vfs);
      onTestFinished(async () => {
        try {
          await longLivedTab.cleanup();
        } catch (e) {
          // Ignore cleanup errors
        }
      });

      // Test query execution right after creating the long-lived tab
      const initialQueryResult = await longLivedTab.executeQuery('SELECT 1 as value');
      expect(initialQueryResult).toBeDefined();
      expect(Array.isArray(initialQueryResult)).toBe(true);
      expect(initialQueryResult.length).toBe(1);
      expect((initialQueryResult[0] as { value: number }).value).toBe(1);

      // Step 2: Open a configurable number of other tabs
      const tabs: IframeClient[] = [];
      const tabIdentifiers: string[] = [];

      for (let i = 0; i < NUM_TABS; i++) {
        const identifier = `tab-${i}`;
        tabIdentifiers.push(identifier);
        const result = await createIframeWithPowerSyncClient(dbFilename, identifier, vfs);
        tabs.push(result);

        // Register cleanup for each tab
        onTestFinished(async () => {
          try {
            await result.cleanup();
          } catch (e) {
            // Ignore cleanup errors - tab might already be closed
          }
        });
      }

      expect(tabs.length).toBe(NUM_TABS);

      // Verify all tabs are connected
      for (const tab of tabs) {
        expect(tab.iframe.isConnected).toBe(true);
      }
      expect(longLivedTab.iframe.isConnected).toBe(true);

      // Step 3: Simultaneously close the first and last quarters of the tabs (simulating abrupt closure)
      const quarterCount = Math.floor(NUM_TABS / 4);
      const firstQuarterEnd = quarterCount;
      const lastQuarterStart = NUM_TABS - quarterCount;

      // Close the first quarter and last quarter of tabs
      const firstQuarter = tabs.slice(0, firstQuarterEnd);
      const lastQuarter = tabs.slice(lastQuarterStart);
      const tabsToClose = [...firstQuarter, ...lastQuarter];

      // Keep the middle two quarters
      const tabsToKeep = tabs.slice(firstQuarterEnd, lastQuarterStart);

      // Close the first and last quarters of tabs simultaneously (without proper cleanup)
      // Do this in reverse order to ensure the last connected tab is closed first.
      const closePromises = tabsToClose.reverse().map((tab) => tab.cleanup());
      await Promise.all(closePromises);

      // Verify closed tabs are removed
      for (const tab of tabsToClose) {
        expect(tab.iframe.isConnected).toBe(false);
        expect(document.body.contains(tab.iframe)).toBe(false);
      }

      // Verify remaining tabs and long-lived tab are still connected
      for (const tab of tabsToKeep) {
        expect(tab.iframe.isConnected).toBe(true);
      }
      expect(longLivedTab.iframe.isConnected).toBe(true);

      // Step 4: Reopen the closed tabs
      const reopenedTabs: IframeClient[] = [];
      // Get the identifiers for the closed tabs by finding their indices in the original tabs array
      const closedTabIdentifiers = tabsToClose.map((closedTab) => {
        const index = tabs.indexOf(closedTab);
        return tabIdentifiers[index];
      });

      const reopenPromises = closedTabIdentifiers.map(async (identifier) => {
        const result = await createIframeWithPowerSyncClient(dbFilename, identifier, vfs);
        reopenedTabs.push(result);

        // Register cleanup for reopened tabs
        onTestFinished(async () => {
          try {
            await result.cleanup();
          } catch (e) {
            // Ignore cleanup errors
          }
        });
        return result;
      });

      // Reopen all closed tabs simultaneously
      await Promise.all(reopenPromises);

      // Verify all reopened tabs are connected
      for (const tab of reopenedTabs) {
        expect(tab.iframe.isConnected).toBe(true);
      }

      // Verify tabs that were kept open are still connected
      for (const tab of tabsToKeep) {
        expect(tab.iframe.isConnected).toBe(true);
      }

      // Final verification: all tabs should be mounted
      const allTabs = [...tabsToKeep, ...reopenedTabs];
      expect(allTabs.length).toBe(NUM_TABS);
      expect(longLivedTab.iframe.isConnected).toBe(true);

      // Step 5: Execute a test query in the long-lived tab to verify its DB is still functional
      const queryResult = await longLivedTab.executeQuery('SELECT 1 as value');

      // Verify the query result
      expect(queryResult).toBeDefined();
      expect(Array.isArray(queryResult)).toBe(true);
      expect(queryResult.length).toBe(1);
      expect((queryResult[0] as { value: number }).value).toBe(1);

      // Step 6: Create a new tab which should trigger a connect. The shared sync worker should reconnect.
      // This ensures the shared sync worker is not stuck and is properly handling new connections
      const newTabIdentifier = `new-tab-${Date.now()}`;
      const newTab = await createIframeWithPowerSyncClient(dbFilename, newTabIdentifier, vfs, true);
      onTestFinished(async () => {
        try {
          await newTab.cleanup();
        } catch (e) {
          // Ignore cleanup errors
        }
      });

      // Wait for the new tab's credentials to be fetched (indicating the shared sync worker is active)
      // The mocked remote always returns 401, so the shared sync worker should try and fetch credentials again.
      await vi.waitFor(async () => {
        const credentialsFetchCount = await newTab.getCredentialsFetchCount();
        expect(
          credentialsFetchCount,
          'The new client should have been asked for credentials by the shared sync worker. ' +
            'This indicates the shared sync worker may be stuck or not processing new connections.'
        ).toBeGreaterThanOrEqual(1);
      });
    });
  });
}
