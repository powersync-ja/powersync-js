import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { useStatus } from '@powersync/react';
import { FC, ReactNode } from 'react';

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
      <Stack direction="column" spacing={1} sx={{p: 4}} alignItems="stretch">
        {progress != null ? (
          <>
            <LinearProgress variant="determinate" value={progress.downloadedFraction * 100} />
            <Box sx={{alignSelf: "center"}}>
                {progress.downloadedOperations == progress.totalOperations ? (
                <Typography>Applying server-side changes</Typography>
                ) : (
                <Typography>
                    Downloaded {progress.downloadedOperations} out of {progress.totalOperations}.
                </Typography>
                )}
            </Box>
          </>
        ) : (
          <LinearProgress variant="indeterminate" />
        )}
      </Stack>
    );
  };
  