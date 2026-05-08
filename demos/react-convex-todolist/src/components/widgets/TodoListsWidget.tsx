import { TODO_LISTS_ROUTE } from '@/app/router';
import { LISTS_TABLE, ListRecord, TODOS_TABLE } from '@/library/powersync/AppSchema';
import { useUserId } from '@/library/powersync/useUserId';
import { Box, Grid, List, Paper, Typography } from '@mui/material';
import { usePowerSync, useQuery } from '@powersync/react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ListItemWidget } from './ListItemWidget';
import { OutlinedComposer, OutlinedComposerSubmitSource } from './OutlinedComposer';

export type TodoListsWidgetProps = {
  selectedId?: string;
};

type ListRow = ListRecord & { total_tasks: number; completed_tasks: number };

type ListBucket = 'empty' | 'active' | 'allDone';

const description = (total: number, completed: number = 0) => {
  return `${total - completed} pending, ${completed} completed`;
};

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

export function TodoListsWidget(props: TodoListsWidgetProps) {
  const powerSync = usePowerSync();
  const navigate = useNavigate();
  const { id: openListRouteId } = useParams();
  const userID = useUserId();
  const [newListName, setNewListName] = useState('');

  const { data: listRecords } = useQuery<ListRow>(`
      SELECT 
        ${LISTS_TABLE}.*, COUNT(${TODOS_TABLE}.id) AS total_tasks, SUM(CASE WHEN ${TODOS_TABLE}.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
      FROM 
        ${LISTS_TABLE}
      LEFT JOIN ${TODOS_TABLE} 
        ON  ${LISTS_TABLE}.id = ${TODOS_TABLE}.list_uuid
      GROUP BY 
        ${LISTS_TABLE}.id;
      `);

  const buckets = useMemo(() => partitionLists(listRecords), [listRecords]);

  const deleteList = async (id: string) => {
    await powerSync.writeTransaction(async (tx) => {
      await tx.execute(`DELETE FROM ${TODOS_TABLE} WHERE list_uuid = ?`, [id]);
      await tx.execute(`DELETE FROM ${LISTS_TABLE} WHERE id = ?`, [id]);
    });
  };

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
      `INSERT INTO ${LISTS_TABLE} (id, created_at, name, owner_id) VALUES (uuid(), datetime(), ?, ?) RETURNING *`,
      [name, userID]
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
                    formSx={{ mb: listRecords.length === 0 ? 1.5 : 2 }}
                  />
                  {listRecords.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      No lists yet — name one above and tap plus to sync your first list.
                    </Typography>
                  ) : null}
                </>
              ) : null}

              {rows.length === 0 ? (
                !(isEmptySection && listRecords.length === 0) ? (
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
                        description={description(total, completed)}
                        selected={r.id === props.selectedId}
                        onDelete={() => deleteList(r.id)}
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
