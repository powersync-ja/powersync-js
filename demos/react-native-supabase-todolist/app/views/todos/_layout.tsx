import { Stack } from 'expo-router';
import React from 'react';
import { useSystem } from '../../../library/powersync/system';

/**
 * Stack to edit a list from the todos view
 */
const EditLayout = () => {
  const system = useSystem();

  React.useEffect(() => {
    let loadStart = new Date();

    const disposer = system.powersync.registerListener({
      statusChanged: (status) => {
        if (status.lastSyncedAt) {
          disposer();
          const difference = new Date().valueOf() - loadStart.valueOf();
          console.debug(`Took ${difference / 1000} seconds to sync.`);
        }
      }
    });

    return disposer;
  }, []);
  return <Stack />;
};

export default EditLayout;
