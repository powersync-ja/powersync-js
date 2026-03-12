import { NavigationPage } from '@/components/navigation/NavigationPage';
import { IssueItemWidget } from '@/components/widgets/IssueItemWidget';
import { ISSUES_TABLE, IssueRecord } from '@/library/powersync/AppSchema';
import { Box, Chip, List, Stack, Typography, styled } from '@mui/material';
import { useQuery } from '@powersync/react';
import React from 'react';

const AVAILABLE_DATES = ['2026-01-15', '2026-01-14', '2026-01-10', '2026-01-07', '2026-01-05'];

/**
 * Maintains a sync stream subscription for a single date without rendering anything.
 * Each instance is a separate useQuery call so toggling one date doesn't
 * tear down / re-create the subscriptions for the other dates.
 */
function DateSubscription({ date }: { date: string }) {
  useQuery('SELECT 1', [], {
    streams: [{ name: 'issues_by_date', parameters: { date }, ttl: 0 }]
  });
  return null;
}

export default function IssuesPage() {
  const [selectedDates, setSelectedDates] = React.useState<string[]>(AVAILABLE_DATES);

  const toggleDate = (date: string) => {
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date].sort().reverse()
    );
  };

  const { data: issues } = useQuery<IssueRecord>(
    `SELECT * FROM ${ISSUES_TABLE} ORDER BY created_at DESC`
  );

  return (
    <NavigationPage title="Issues (Time-Based Sync)">
      <Box>
        {/* One invisible subscription per selected date */}
        {selectedDates.map((date) => (
          <DateSubscription key={date} date={date} />
        ))}

        <S.ControlsBox>
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
            {selectedDates.length} date stream{selectedDates.length !== 1 ? 's' : ''} active
          </Typography>
        </S.ControlsBox>

        <Box>
          {issues.length === 0 ? (
            <Typography sx={{ p: 2, opacity: 0.7 }}>
              No issues found for the selected dates. Toggle dates above to sync issues.
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
