import React from 'react';
import { usePowerSync } from '@powersync/react';

import { clearCanvas } from '@/library/powersync/pixels';
import { exportCanvasPng } from '@/library/exportPng';
import { getLocalUserId } from '@/library/userId';
import { useCanvasStats } from '@/library/powersync/hooks';
import type { CanvasPixel } from '@/library/powersync/hooks';

export interface AdminControlsProps {
  /** Current pixels, used for PNG export. */
  pixels: ReadonlyArray<CanvasPixel>;
}

/**
 * Booth admin actions: clear the canvas and export a PNG snapshot. Hidden by
 * default; keyboard shortcuts always work (Shift+C clear, Shift+E export) and
 * visible buttons appear when the page is opened with `?admin=1`.
 */
export const AdminControls: React.FC<AdminControlsProps> = ({ pixels }) => {
  const powerSync = usePowerSync();
  // Subscribe so the export always reflects the latest canvas even if the parent
  // passes a stale snapshot.
  useCanvasStats();

  const showButtons = React.useMemo(() => new URLSearchParams(window.location.search).has('admin'), []);

  const handleClear = React.useCallback(async () => {
    if (!window.confirm('Clear the entire canvas for everyone?')) {
      return;
    }
    await clearCanvas(powerSync, getLocalUserId());
  }, [powerSync]);

  const handleExport = React.useCallback(() => {
    void exportCanvasPng(pixels);
  }, [pixels]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        void handleClear();
      } else if (e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        handleExport();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClear, handleExport]);

  if (!showButtons) {
    return null;
  }

  return (
    <div className="admin-controls">
      <button type="button" onClick={handleExport}>
        Export PNG (⇧E)
      </button>
      <button type="button" onClick={handleClear}>
        Clear canvas (⇧C)
      </button>
    </div>
  );
};

export default AdminControls;
