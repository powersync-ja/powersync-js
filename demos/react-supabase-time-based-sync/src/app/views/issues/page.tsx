import { NavigationPage } from '@/components/navigation/NavigationPage';
import { IssueItemWidget } from '@/components/widgets/IssueItemWidget';
import { ISSUES_TABLE, IssueRecord } from '@/library/powersync/AppSchema';
import { Box, Chip, Divider, List, Stack, Typography, styled } from '@mui/material';
import { useQuery } from '@powersync/react';
import React from 'react';

const AVAILABLE_DATES = ['2026-01-15', '2026-01-14', '2026-01-10', '2026-01-07', '2026-01-05'];

/**
 * Subscribes to a sync stream for a single date and renders the matching issues.
 * Each instance is an independent useQuery — toggling one date does not
 * affect the subscription or render of any other date.
 */
function DateIssuesSection({ date }: { date: string }) {
  const { data: issues } = useQuery<IssueRecord>(
    `SELECT * FROM ${ISSUES_TABLE} WHERE substring(updated_at, 1, 10) = ? ORDER BY created_at DESC`,
    [date],
    { streams: [{ name: 'issues_by_date', parameters: { date }, ttl: 0 }] }
  );

  if (issues.length === 0) return null;

  return (
    <Box>
      <Typography variant="overline" sx={{ px: 2, pt: 1, display: 'block', opacity: 0.6 }}>
        {date} — {issues.length} issue{issues.length !== 1 ? 's' : ''}
      </Typography>
      {issues.map((issue) => (
        <IssueItemWidget key={issue.id} issue={issue} />
      ))}
    </Box>
  );
}

export default function IssuesPage() {
  const [selectedDates, setSelectedDates] = React.useState<string[]>(AVAILABLE_DATES);

  const toggleDate = (date: string) => {
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date].sort().reverse()
    );
  };

  return (
    <NavigationPage title="Issues (Time-Based Sync)">
      <Box>
        <S.ControlsBox>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Each date below is a separate sync stream subscription. Toggling a date on subscribes to issues
            updated on that date and syncs them to this device. Toggling it off removes the subscription and
            immediately deletes the local data (TTL&nbsp;=&nbsp;0).
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
            {selectedDates.length} date stream{selectedDates.length !== 1 ? 's' : ''} active
          </Typography>
        </S.ControlsBox>

        {selectedDates.length === 0 ? (
          <Typography sx={{ p: 2, opacity: 0.7 }}>
            No dates selected. Toggle dates above to sync issues.
          </Typography>
        ) : (
          <List dense={false}>
            {selectedDates.map((date, i) => (
              <React.Fragment key={date}>
                {i > 0 && <Divider sx={{ my: 1 }} />}
                <DateIssuesSection date={date} />
              </React.Fragment>
            ))}
          </List>
        )}
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
