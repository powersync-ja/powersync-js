import { ISSUES_TABLE, IssueRecord } from '@/library/powersync/AppSchema';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { Box, Chip, IconButton, ListItem, ListItemText, Paper, styled } from '@mui/material';
import { usePowerSync } from '@powersync/react';
import React from 'react';

export type IssueItemWidgetProps = {
  issue: IssueRecord;
};

const priorityColor = (priority: string | null): 'default' | 'info' | 'warning' | 'error' => {
  switch (priority) {
    case 'low':
      return 'default';
    case 'medium':
      return 'info';
    case 'high':
      return 'warning';
    case 'critical':
      return 'error';
    default:
      return 'default';
  }
};

const statusColor = (status: string | null): 'default' | 'success' | 'primary' => {
  switch (status) {
    case 'open':
      return 'primary';
    case 'closed':
      return 'success';
    default:
      return 'default';
  }
};

export const IssueItemWidget: React.FC<IssueItemWidgetProps> = React.memo(({ issue }) => {
  const powerSync = usePowerSync();

  const deleteIssue = React.useCallback(async () => {
    await powerSync.execute(`DELETE FROM ${ISSUES_TABLE} WHERE id = ?`, [issue.id]);
  }, [issue.id]);

  return (
    <S.MainPaper elevation={1}>
      <ListItem
        secondaryAction={
          <IconButton edge="end" aria-label="delete" onClick={deleteIssue}>
            <DeleteIcon />
          </IconButton>
        }>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {issue.title}
              <Chip size="small" label={issue.priority} color={priorityColor(issue.priority)} />
              <Chip size="small" label={issue.status} color={statusColor(issue.status)} variant="outlined" />
            </Box>
          }
          secondary={
            <Box component="span">
              {issue.description}
              {issue.updated_at && (
                <Box component="span" sx={{ display: 'block', opacity: 0.7, fontSize: '0.75rem', mt: 0.5 }}>
                  Updated: {issue.updated_at}
                </Box>
              )}
            </Box>
          }
        />
      </ListItem>
    </S.MainPaper>
  );
});

namespace S {
  export const MainPaper = styled(Paper)`
    margin-bottom: 10px;
  `;
}
