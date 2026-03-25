import { NavigationPage } from '@/components/navigation/NavigationPage';
import { IssueItemWidget } from '@/components/widgets/IssueItemWidget';
import { ISSUES_TABLE, IssueRecord } from '@/library/powersync/AppSchema';
import { useSyncStreams } from '@/library/hooks/useSyncStreams';
import { Box, Chip, List, Stack, Typography, styled } from '@mui/material';
import { useQuery } from '@powersync/react';
import React from 'react';

// const AVAILABLE_DATES = ['2026-01-15'];
const AVAILABLE_DATES = ['2026-01-15', '2026-01-14', '2026-01-10', '2026-01-07', '2026-01-05'];

export default function IssuesPage() {
  const [selectedDates, setSelectedDates] = React.useState<string[]>(AVAILABLE_DATES);

  const toggleDate = (date: string) => {
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date].sort().reverse()
    );
  };

  const streams = selectedDates.map((date) => ({ name: 'issues_by_date', parameters: { date }, ttl: 0 }));

  // --- Option A: useQuery with built-in streams support ---
  // useQuery manages subscriptions internally. Comment out Option B when using this.
  const { data: issues } = useQuery<IssueRecord>(
    `SELECT * FROM ${ISSUES_TABLE} ORDER BY updated_at DESC`,
    [],
    { streams }
  );

  // --- Option B: useSyncStreams hook (custom) + plain useQuery ---
  // useSyncStreams manages subscriptions separately from the query.
  // Comment out Option A and uncomment both lines below when using this.
  // useSyncStreams(streams);
  // const { data: issues } = useQuery<IssueRecord>(`SELECT * FROM ${ISSUES_TABLE} ORDER BY updated_at DESC`);

  console.log('streams', streams.length);

  return (
    <NavigationPage title="Issues (Time-Based Sync)">
      <Box>
        <S.ControlsBox>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Each selected date subscribes to its own sync stream. Deselecting a date unsubscribes
            from that stream and local data is removed (TTL&nbsp;=&nbsp;0).
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
