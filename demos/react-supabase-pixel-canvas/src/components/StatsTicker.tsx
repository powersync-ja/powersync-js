import React from 'react';

import { useCanvasStats } from '@/library/powersync/hooks';

export const StatsTicker: React.FC = () => {
  const { data } = useCanvasStats();
  const stats = data[0] ?? { placed: 0, artists: 0 };

  return (
    <div className="stats-ticker">
      <div className="stats-ticker__item">
        <span className="stats-ticker__value">{stats.placed.toLocaleString()}</span>
        <span className="stats-ticker__label">pixels placed</span>
      </div>
      <div className="stats-ticker__item">
        <span className="stats-ticker__value">{stats.artists.toLocaleString()}</span>
        <span className="stats-ticker__label">artists</span>
      </div>
    </div>
  );
};

export default StatsTicker;
