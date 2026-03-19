import { NavigationPage } from '@/components/navigation/NavigationPage';
import { IssueItemWidget } from '@/components/widgets/IssueItemWidget';
import { ISSUES_TABLE, IssueRecord } from '@/library/powersync/AppSchema';
import { Box, Chip, List, Stack, Typography, styled } from '@mui/material';
import { useQuery, useSyncStream } from '@powersync/react';
import React from 'react';

const AVAILABLE_DATES = ['2026-01-15', '2026-01-14', '2026-01-10', '2026-01-07', '2026-01-05'];

/**
 * Subscribes to the stream outside of `useQuery`. If `streams` is passed into `useQuery`, changing
 * parameters resets internal "stream synced" state and the hook briefly returns empty data — that
 * caused flicker when toggling chips quickly. The local query uses a matching WHERE so the list
 * stays consistent with the selection while sync catches up.
 */
function IssuesByDateStreamSubscription({ datesParam }: { datesParam: string }) {
  useSyncStream({ name: 'issues_by_date', parameters: { dates: datesParam }, ttl: 0 });
  return null;
}

export default function IssuesPage() {
  const [selectedDates, setSelectedDates] = React.useState<string[]>(AVAILABLE_DATES);

  const toggleDate = (date: string) => {
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date].sort().reverse()
    );
  };

  const datesParam = React.useMemo(() => JSON.stringify(selectedDates), [selectedDates]);

  // Same predicate as the stream in sync-config.yaml (`substring(updated_at, 1, 10)`); replicas store timestamps as text.
  const { issuesSql, issuesParams } = React.useMemo(() => {
    if (selectedDates.length === 0) {
      return {
        issuesSql: `SELECT * FROM ${ISSUES_TABLE} WHERE 1 = 0 ORDER BY created_at DESC`,
        issuesParams: [] as string[]
      };
    }
    const placeholders = selectedDates.map(() => '?').join(', ');
    return {
      issuesSql: `SELECT * FROM ${ISSUES_TABLE} WHERE substring(updated_at, 1, 10) IN (${placeholders}) ORDER BY created_at DESC`,
      issuesParams: selectedDates
    };
  }, [selectedDates]);

  const { data: issues } = useQuery<IssueRecord>(issuesSql, issuesParams);

  return (
    <NavigationPage title="Issues (Time-Based Sync)">
      <Box>
        {selectedDates.length > 0 ? (
          <IssuesByDateStreamSubscription datesParam={datesParam} />
        ) : null}
        <S.ControlsBox>
          <Typography variant="body2" sx={{ mb: 2 }}>
            The selected dates are passed as a JSON array to a single sync stream subscription.
            The stream query uses <code>json_each()</code> to expand the array and sync matching
            issues. Deselecting all dates removes the subscription and immediately deletes
            local data (TTL&nbsp;=&nbsp;0).
          </Typography>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Syncing dates:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {AVAILABLE_DATES.map((date) => (
              <Chip
                key={date}
                label={date}
                color={selectedDates.includes(date) ? 'primary' : 'default'}
                onClick={() => toggleDate(date)}
                variant={selectedDates.includes(date) ? 'filled' : 'outlined'}
              />
            ))}
          </Stack>
          <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.7 }}>
            {selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected
          </Typography>
        </S.ControlsBox>

        <Box>
          {issues.length === 0 ? (
            <Typography sx={{ p: 2, opacity: 0.7 }}>
              No issues found. Toggle dates above to sync issues.
            </Typography>
          ) : (
            <List dense={false}>
              {issues.map((issue) => (
                <IssueItemWidget key={issue.id} issue={issue} />
              ))}
            </List>
          )}
        </Box>
      </Box>
    </NavigationPage>
  );
}

namespace S {
  export const ControlsBox = styled(Box)`
    padding: 16px;
    margin-bottom: 16px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
  `;
}
