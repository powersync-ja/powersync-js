import './MenuItem.scss';

import React from 'react';
import remixiconUrl from 'remixicon/fonts/remixicon.symbol.svg';

export default function MenuItem({ icon, title, action, isActive = null }) {
  return (
    <button className={`menu-item${isActive && isActive() ? ' is-active' : ''}`} onClick={action} title={title}>
      <svg className="remix">
        <use xlinkHref={`${remixiconUrl}#ri-${icon}`} />
      </svg>
    </button>
  );
}
