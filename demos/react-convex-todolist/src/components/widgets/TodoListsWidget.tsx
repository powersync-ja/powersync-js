import { TODO_LISTS_ROUTE } from '@/app/router';
import {
  DEFAULT_NEW_LIST_PRIORITY,
  formatListTaskSummary,
  listPriorityCaption
} from '@/app/views/todo-lists/listFormUtils';
import { ALL_LIST_ROWS_WITH_COUNTS_SQL, type TodoListWithCountsRow } from '@/app/views/todo-lists/listQueries';
import { LISTS_TABLE } from '@/library/powersync/AppSchema';
import { useUserId } from '@/library/powersync/useUserId';
import { Box, Grid, List, Paper, Typography } from '@mui/material';
import { usePowerSync, useQuery } from '@powersync/react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ListItemWidget } from './ListItemWidget';
import { OutlinedComposer, OutlinedComposerSubmitSource } from './OutlinedComposer';

type ListRow = TodoListWithCountsRow;

type ListBucket = 'empty' | 'active' | 'allDone';

function normalizeCounts(row: ListRow): { total: number; completed: number } {
  const total = Number(row.total_tasks) || 0;
  const completed = Number(row.completed_tasks ?? 0) || 0;
  return { total, completed };
}

function bucketFor(row: ListRow): ListBucket {
  const { total, completed } = normalizeCounts(row);
  if (total === 0) return 'empty';
  if (completed === total) return 'allDone';
  return 'active';
}

function partitionLists(rows: ListRow[]): Record<ListBucket, ListRow[]> {
  const empty: ListRow[] = [];
  const active: ListRow[] = [];
  const allDone: ListRow[] = [];
  for (const row of rows) {
    switch (bucketFor(row)) {
      case 'empty':
        empty.push(row);
        break;
      case 'active':
        active.push(row);
        break;
      case 'allDone':
        allDone.push(row);
        break;
    }
  }
  return { empty, active, allDone };
}

type SectionConfig = {
  key: ListBucket;
  title: string;
  caption: string;
};

const SECTIONS: SectionConfig[] = [
  { key: 'empty', title: 'Empty or new', caption: 'Lists with no tasks yet' },
  { key: 'active', title: 'Has pending work', caption: 'Open tasks still to do' },
  { key: 'allDone', title: 'All completed', caption: 'Every task is finished' }
];

const BUCKET_AVATAR: Record<ListBucket, string> = {
  empty: '/thinking-dino.svg',
  active: '/busy-dino.svg',
  allDone: '/thug-dino.svg'
};

function listIsArchived(row: ListRow): boolean {
  return Number(row.archived) === 1;
}

export function TodoListsWidget() {
  const powerSync = usePowerSync();
  const navigate = useNavigate();
  const { id: openListRouteId } = useParams();
  const userID = useUserId();
  const [newListName, setNewListName] = useState('');

  const { data: listRecords } = useQuery<ListRow>(ALL_LIST_ROWS_WITH_COUNTS_SQL);

  const { activeLists, archivedLists } = useMemo(() => {
    const active: ListRow[] = [];
    const archived: ListRow[] = [];
    for (const row of listRecords) {
      if (listIsArchived(row)) archived.push(row);
      else active.push(row);
    }
    return { activeLists: active, archivedLists: archived };
  }, [listRecords]);

  const buckets = useMemo(() => partitionLists(activeLists), [activeLists]);

  const createNewList = async (source?: OutlinedComposerSubmitSource) => {
    const name = newListName.trim();
    if (!name) {
      setNewListName('');
      return;
    }
    if (!userID) {
      throw new Error('Could not create new lists, no userID found');
    }

    const res = await powerSync.execute(
      `INSERT INTO ${LISTS_TABLE} (id, created_at, name, owner_id, notes, priority, tags, archived) VALUES (uuid(), datetime(), ?, ?, '', ?, '[]', 0) RETURNING *`,
      [name, userID, DEFAULT_NEW_LIST_PRIORITY]
    );

    const created = res.rows?.item(0) as { id?: string } | undefined;
    if (!created?.id) {
      throw new Error('Could not create list');
    }
    setNewListName('');
    if (source === 'button' || source === 'submit') {
      navigate(`${TODO_LISTS_ROUTE}/${created.id}`);
    }
  };

  return (
    <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
      {SECTIONS.map((section) => {
        const rows = buckets[section.key];
        const isEmptySection = section.key === 'empty';

        return (
          <Grid item xs={12} lg={4} key={section.key}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'background.paper'
              }}
            >
              <Box
                sx={{
                  mb: 2,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 1.5,
                  flexWrap: 'wrap'
                }}
              >
                <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    {section.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {section.caption}
                  </Typography>
                </Box>
              </Box>

              {isEmptySection ? (
                <>
                  <OutlinedComposer
                    value={newListName}
                    onChange={setNewListName}
                    onSubmit={createNewList}
                    placeholder="Add a new list"
                    inputAriaLabel="New list name"
                    submitAriaLabel="Create list"
                    autoFocus={!openListRouteId}
                    formSx={{ mb: activeLists.length === 0 ? 1.5 : 2 }}
                  />
                  {activeLists.length === 0 && archivedLists.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      No lists yet — name one above and tap plus to sync your first list.
                    </Typography>
                  ) : null}
                </>
              ) : null}

              {rows.length === 0 ? (
                !(isEmptySection && activeLists.length === 0 && archivedLists.length === 0) ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    Nothing here yet.
                  </Typography>
                ) : null
              ) : (
                <List dense={false} disablePadding sx={{ flex: 1 }}>
                  {rows.map((r) => {
                    const { total, completed } = normalizeCounts(r);
                    return (
                      <ListItemWidget
                        key={r.id}
                        avatarSrc={BUCKET_AVATAR[section.key]}
                        title={r.name ?? ''}
                        description={formatListTaskSummary(total, completed)}
                        priorityLabel={listPriorityCaption(r.priority ?? undefined)}
                        selected={r.id === openListRouteId}
                        onPress={() => navigate(`${TODO_LISTS_ROUTE}/${r.id}`)}
                      />
                    );
                  })}
                </List>
              )}
            </Paper>
          </Grid>
        );
      })}
    </Grid>
  );
}
