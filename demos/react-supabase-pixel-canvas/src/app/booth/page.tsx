import React from 'react';

import { PixelCanvas } from '@/components/PixelCanvas';
import { QRCodeCard } from '@/components/QRCodeCard';
import { StatsTicker } from '@/components/StatsTicker';
import { AdminControls } from '@/components/AdminControls';
import { usePixels } from '@/library/powersync/hooks';

export const BoothPage: React.FC = () => {
  const { data: pixels } = usePixels();

  return (
    <div className="booth-page">
      <div className="booth-page__canvas-wrap">
        <PixelCanvas pixels={pixels} />
      </div>
      <StatsTicker />
      <QRCodeCard />
      <AdminControls pixels={pixels} />
    </div>
  );
};

export default BoothPage;
