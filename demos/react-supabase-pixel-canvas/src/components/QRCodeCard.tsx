import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

/** URL of the draw page, resolved against the current origin. */
function drawUrl(): string {
  if (typeof window === 'undefined') {
    return '/draw';
  }
  return new URL('/draw', window.location.origin).href;
}

export const QRCodeCard: React.FC = () => {
  const url = drawUrl();
  return (
    <div className="qr-card">
      <QRCodeSVG value={url} size={160} marginSize={2} />
      <div className="qr-card__label">
        <strong>Scan to draw</strong>
        <span>{url.replace(/^https?:\/\//, '')}</span>
      </div>
    </div>
  );
};

export default QRCodeCard;
