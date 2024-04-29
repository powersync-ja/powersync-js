<template>
  <div class="py-10 pa-2">
    <LoadingMessage v-if="isLoading || isFetching" :isLoading :isFetching />

    <ErrorMessage v-if="error">{{ error.message }}</ErrorMessage>
    <v-list v-else class="bg-black pa-0" lines="two">
      <ListItemWidget
        v-for="record in listRecords"
        :key="record.id"
        :title="record.name || ''"
        :description="description(record.total_tasks, record.completed_tasks)"
        @delete="() => deleteList(record.id)"
        @press="() => navigateToList(record.id)"
      />
    </v-list>
  </div>
</template>

<script setup lang="ts">
import { LISTS_TABLE, ListRecord, TODOS_TABLE } from '@/library/powersync/AppSchema';
import { TODO_LISTS_ROUTE } from '@/plugins/router';
import { usePowerSync, useQuery } from '@powersync/vue';
import { useRouter } from 'vue-router';
import ListItemWidget from './ListItemWidget.vue';
import LoadingMessage from '../LoadingMessage.vue';

const powerSync = usePowerSync();

// Vue Router for navigation
const router = useRouter();

const {
  data: listRecords,
  isLoading,
  isFetching,
  error
} = useQuery<ListRecord & { total_tasks: number; completed_tasks: number }>(`
      SELECT
        ${LISTS_TABLE}.*, COUNT(${TODOS_TABLE}.id) AS total_tasks, SUM(CASE WHEN ${TODOS_TABLE}.completed = true THEN 1 ELSE 0 END) as completed_tasks
      FROM
        ${LISTS_TABLE}
      LEFT JOIN ${TODOS_TABLE}
        ON  ${LISTS_TABLE}.id = ${TODOS_TABLE}.list_id
      GROUP BY
        ${LISTS_TABLE}.id;
      `);

const deleteList = async (id: string) => {
  await powerSync.value.writeTransaction(async (tx) => {
    // Delete associated todos
    await tx.execute(`DELETE FROM ${TODOS_TABLE} WHERE list_id = ?`, [id]);
    // Delete list record
    await tx.execute(`DELETE FROM ${LISTS_TABLE} WHERE id = ?`, [id]);
  });
};

const navigateToList = (id: string) => {
  router.push(`${TODO_LISTS_ROUTE}/${id}`);
};

// Helper function to format the description
const description = (total: number, completed: number = 0) => {
  return `${total - completed} pending, ${completed} completed`;
};
</script>
