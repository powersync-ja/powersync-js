import { useStatus } from '@powersync/react';
import { FC, ReactNode } from 'react';
import { View } from 'react-native';
import { Text, LinearProgress } from '@rneui/themed';

/**
 * A component that renders its child if the database has been synced at least once and shows
 * a progress indicator otherwise.
 */
export const GuardBySync: FC<{ children: ReactNode; priority?: number }> = ({ children, priority }) => {
  const status = useStatus();

  const hasSynced = priority == null ? status.hasSynced : status.statusForPriority(priority).hasSynced;
  if (hasSynced) {
    return children;
  }

  // If we haven't completed a sync yet, show a progress indicator!
  const allProgress = status.downloadProgress;
  const progress = priority == null ? allProgress : allProgress?.untilPriority(priority);

  return (
    <View>
      {progress != null ? (
        <>
          <LinearProgress variant="determinate" value={progress.downloadedFraction} />
          {progress.downloadedOperations == progress.totalOperations ? (
            <Text>Applying server-side changes</Text>
          ) : (
            <Text>
              Downloaded {progress.downloadedOperations} out of {progress.totalOperations}.
            </Text>
          )}
        </>
      ) : (
        <LinearProgress variant="indeterminate" />
      )}
    </View>
  );
};
