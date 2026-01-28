import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePowerSyncInspectorDiagnostics } from '../../src/runtime/composables/usePowerSyncInspectorDiagnostics';
import { withPowerSyncSetup, openPowerSync } from '../utils';

describe('usePowerSyncInspectorDiagnostics', () => {
  let powersync: ReturnType<typeof openPowerSync>;

  beforeEach(() => {
    powersync = openPowerSync(false); // Diagnostics disabled for most tests
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should update reactive state when sync status changes', async () => {
    let statusChangedCallback: ((status: any) => void) | null = null;
    
    vi.spyOn(powersync, 'registerListener').mockImplementation((listener) => {
      statusChangedCallback = listener.statusChanged;
      return () => {}; // Return unregister function
    });
    
    const [result] = withPowerSyncSetup(() => usePowerSyncInspectorDiagnostics(), powersync);
    
    await vi.waitFor(
      () => {
        expect(statusChangedCallback).not.toBeNull();
      },
      { timeout: 1000 }
    );
    
    // Simulate status change
    const testDate = new Date();
    if (statusChangedCallback) {
      statusChangedCallback({
        hasSynced: true,
        connected: true,
        dataFlowStatus: {
          downloading: false,
          uploading: false,
          downloadError: null,
          uploadError: null,
          downloadProgress: null
        },
        lastSyncedAt: testDate
      });
    }
    
    await vi.waitFor(
      () => {
        expect(result.hasSynced.value).toBe(true);
        expect(result.isConnected.value).toBe(true);
        expect(result.isSyncing.value).toBe(false);
        expect(result.isDownloading.value).toBe(false);
        expect(result.isUploading.value).toBe(false);
        expect(result.lastSyncedAt.value).toEqual(testDate);
      },
      { timeout: 1000 }
    );
  });

  it('should call refreshState on mount and query database', async () => {
    const getSpy = vi.spyOn(powersync, 'get');
    const getAllSpy = vi.spyOn(powersync, 'getAll');
    
    const [result] = withPowerSyncSetup(() => usePowerSyncInspectorDiagnostics(), powersync);
    
    // Wait for onMounted to execute and refreshState to run
    await vi.waitFor(
      () => {
        expect(getSpy).toHaveBeenCalled();
        expect(getAllSpy).toHaveBeenCalled();
      },
      { timeout: 1000 }
    );
    
    // Verify refreshState was called (it queries synced_at and bucket data)
    const getCalls = getSpy.mock.calls;
    const hasSyncedAtQuery = getCalls.some(call => 
      call[0]?.includes('powersync_last_synced_at')
    );
    expect(hasSyncedAtQuery).toBe(true);
  });

  it('should trigger refreshState when onChangeWithCallback fires', async () => {
    const diagnosticsDb = openPowerSync(true);
    const [result] = withPowerSyncSetup(() => usePowerSyncInspectorDiagnostics(), diagnosticsDb);

    await vi.waitFor(
      () => expect(result.uploadQueueStats.value).not.toBeNull(),
      { timeout: 2000 }
    );

    await diagnosticsDb.execute('INSERT INTO lists(id, name) VALUES (?, ?)', [
      'onchange-test-1',
      'OnChange',
    ]);

    await vi.waitFor(
      () => expect(result.uploadQueueCount.value).toBeGreaterThan(0),
      { timeout: 2000 }
    );
  });

  it('should compute totals from bucketRows correctly', async () => {
    // Totals come from bucketRows (local_bucket_data / ps_buckets), which are populated by sync.
    // With local writes only and no backend, bucket data stays empty so totals are correctly zero.
    const diagnosticsDb = openPowerSync(true);
    const [result] = withPowerSyncSetup(() => usePowerSyncInspectorDiagnostics(), diagnosticsDb);

    await new Promise(resolve => setTimeout(resolve, 300));

    expect(result.totals.value.buckets).toBe(0);
    expect(result.totals.value.row_count).toBe(0);
    expect(result.totals.value.data_size).toBe('0 Bytes');
  });

  it('should compute uploadQueueCount and uploadQueueSize from uploadQueueStats', async () => {
    const diagnosticsDb = openPowerSync(true);
    const [result] = withPowerSyncSetup(() => usePowerSyncInspectorDiagnostics(), diagnosticsDb);

    await vi.waitFor(
      () => expect(result.uploadQueueStats.value).not.toBeNull(),
      { timeout: 2000 }
    );

    await diagnosticsDb.execute('INSERT INTO lists(id, name) VALUES (?, ?)', [
      'upload-test-1',
      'Upload Test',
    ]);

    await vi.waitFor(
      () => {
        expect(result.uploadQueueCount.value).toBeGreaterThan(0);
        expect(result.uploadQueueSize.value).not.toBe('0 Bytes');
      },
      { timeout: 2000 }
    );

    expect(result.uploadQueueCount.value).toBeGreaterThanOrEqual(1);
    expect(result.uploadQueueSize.value).not.toBe('0 Bytes');
  });

  it('should handle error when diagnostic schema is not set up', async () => {
    const getSpy = vi.spyOn(powersync, 'get').mockRejectedValue(
      new Error('no such table: local_bucket_data')
    );
    
    const [result] = withPowerSyncSetup(() => usePowerSyncInspectorDiagnostics(), powersync);
    
    await vi.waitFor(
      () => {
        expect(result.isDiagnosticSchemaSetup.value).toBe(false);
      },
      { timeout: 1000 }
    );
  });

  it('should format bytes correctly', () => {
    const [result] = withPowerSyncSetup(() => usePowerSyncInspectorDiagnostics(), powersync);
    
    expect(result.formatBytes(0)).toBe('0 Bytes');
    expect(result.formatBytes(1024)).toBe('1 KiB');
    expect(result.formatBytes(1024 * 1024)).toBe('1 MiB');
    expect(result.formatBytes(1024 * 1024 * 1024)).toBe('1 GiB');
    expect(result.formatBytes(1536, 1)).toBe('1.5 KiB');
  });
});
