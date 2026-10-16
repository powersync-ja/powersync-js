import React from 'react';
import { usePowerSync } from '@powersync/react';

import { PixelCanvas } from '@/components/PixelCanvas';
import { ColorPalette } from '@/components/ColorPalette';
import { SyncStatusBar } from '@/components/SyncStatusBar';
import { useSupabase } from '@/components/providers/SystemProvider';
import { usePixels } from '@/library/powersync/hooks';
import { placePixel } from '@/library/powersync/pixels';
import { getLocalUserId } from '@/library/userId';

export const DrawPage: React.FC = () => {
  const powerSync = usePowerSync();
  const connector = useSupabase();
  const { data: pixels } = usePixels();

  const [selectedColor, setSelectedColor] = React.useState(4); // red — a visible default
  const [highlight, setHighlight] = React.useState<{ x: number; y: number } | null>(null);
  const highlightTimer = React.useRef<ReturnType<typeof setTimeout>>();

  const userId = connector?.currentSession?.user.id ?? getLocalUserId();

  const handleTap = React.useCallback(
    (x: number, y: number) => {
      void placePixel(powerSync, x, y, selectedColor, userId);
      setHighlight({ x, y });
      clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setHighlight(null), 800);
    },
    [powerSync, selectedColor, userId]
  );

  React.useEffect(() => () => clearTimeout(highlightTimer.current), []);

  return (
    <div className="draw-page">
      <SyncStatusBar />
      <div className="draw-page__canvas-wrap">
        <PixelCanvas pixels={pixels} interactive onPixelTap={handleTap} highlight={highlight} />
      </div>
      <ColorPalette selected={selectedColor} onSelect={setSelectedColor} />
    </div>
  );
};

export default DrawPage;
