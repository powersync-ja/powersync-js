import { NavigationPage } from '@/components/navigation/NavigationPage';
import { useSupabase } from '@/components/providers/SystemProvider';
import { IssueItemWidget } from '@/components/widgets/IssueItemWidget';
import { ISSUES_TABLE, IssueRecord } from '@/library/powersync/AppSchema';
import AddIcon from '@mui/icons-material/Add';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  List,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  styled
} from '@mui/material';
import Fab from '@mui/material/Fab';
import { usePowerSync, useQuery } from '@powersync/react';
import React from 'react';

// These are the exact dates used in the seed data.
// Each date corresponds to a separate sync stream subscription.
const AVAILABLE_DATES = ['2026-01-15', '2026-01-14', '2026-01-10', '2026-01-07', '2026-01-05'];

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'critical'];

export default function IssuesPage() {
  const powerSync = usePowerSync();
  const supabase = useSupabase();

  const [selectedDates, setSelectedDates] = React.useState<string[]>(AVAILABLE_DATES);
  const [showPrompt, setShowPrompt] = React.useState(false);
  const titleInputRef = React.createRef<HTMLInputElement>();
  const descriptionInputRef = React.createRef<HTMLInputElement>();
  const [newPriority, setNewPriority] = React.useState('medium');

  const toggleDate = (date: string) => {
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date].sort().reverse()
    );
  };

  // Subscribe to the sync stream for each selected date.
  // This matches powersync/sync-config.yaml:
  //   issues_by_date:
  //     queries:
  //       - SELECT * FROM issues WHERE substring(updated_at, 1, 10) = subscription.parameter('date')
  const streams = React.useMemo(
    () => selectedDates.map((date) => ({ name: 'issues_by_date', parameters: { date }, ttl: 0 })),
    [selectedDates]
  );

  const { data: issues } = useQuery<IssueRecord>(
    `SELECT * FROM ${ISSUES_TABLE} ORDER BY created_at DESC`,
    [],
    { streams }
  );

  const createNewIssue = async (title: string, description: string, priority: string) => {
    const userID = supabase?.currentSession?.user.id ?? null;
    if (!userID) {
      throw new Error(`Could not get user ID.`);
    }

    const now = new Date().toISOString();

    await powerSync.execute(
      `INSERT INTO ${ISSUES_TABLE} (id, title, description, status, priority, created_by, created_at, updated_at)
       VALUES (uuid(), ?, ?, 'open', ?, ?, ?, ?)`,
      [title, description, priority, userID, now, now]
    );
  };

  return (
    <NavigationPage title="Issues (Time-Based Sync)">
      <Box>
        <S.FloatingActionButton onClick={() => setShowPrompt(true)}>
          <AddIcon />
        </S.FloatingActionButton>

        {/* Date selector */}
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

        {/* Issues list */}
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

        {/* Create issue dialog */}
        <Dialog
          open={showPrompt}
          onClose={() => setShowPrompt(false)}
          PaperProps={{
            component: 'form',
            onSubmit: async (event: React.FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              await createNewIssue(
                titleInputRef.current!.value,
                descriptionInputRef.current!.value,
                newPriority
              );
              setShowPrompt(false);
            }
          }}
          aria-labelledby="create-issue-title">
          <DialogTitle id="create-issue-title">Create Issue</DialogTitle>
          <DialogContent>
            <DialogContentText>Enter the details for a new issue</DialogContentText>
            <TextField
              sx={{ marginTop: '10px' }}
              fullWidth
              inputRef={titleInputRef}
              label="Title"
              autoFocus
            />
            <TextField
              sx={{ marginTop: '10px' }}
              fullWidth
              inputRef={descriptionInputRef}
              label="Description"
              multiline
              rows={3}
            />
            <FormControl fullWidth sx={{ marginTop: '10px' }}>
              <InputLabel>Priority</InputLabel>
              <Select
                value={newPriority}
                label="Priority"
                onChange={(e) => setNewPriority(e.target.value)}>
                {PRIORITY_OPTIONS.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowPrompt(false)}>Cancel</Button>
            <Button type="submit">Create</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </NavigationPage>
  );
}

namespace S {
  export const FloatingActionButton = styled(Fab)`
    position: absolute;
    bottom: 20px;
    right: 20px;
  `;

  export const ControlsBox = styled(Box)`
    padding: 16px;
    margin-bottom: 16px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
  `;
}
