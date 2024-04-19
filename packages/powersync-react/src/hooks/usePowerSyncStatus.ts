import { useContext, useEffect, useState } from 'react';
import { PowerSyncContext } from './PowerSyncContext';

export const usePowerSyncStatus = () => {
  const powerSync = useContext(PowerSyncContext);
  const [syncStatus, setSyncStatus] = useState(powerSync.currentStatus);

  useEffect(() => {
    const listener = powerSync.registerListener({
      statusChanged: (status) => {
        setSyncStatus(status);
      }
    });

    return () => listener?.();
  }, [powerSync]);

  return syncStatus;
};
