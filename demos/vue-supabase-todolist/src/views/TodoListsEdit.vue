<template>
  <div class="py-10">
    <LoadingMessage v-if="isLoading || isFetching" :isLoading :isFetching />
    <v-list v-if="listName" class="pa-2 bg-black" lines="one">
      <ErrorMessage v-if="error">{{ error.message }}</ErrorMessage>
      <TodoItemWidget
        v-else
        v-for="record of todoRecords"
        :key="record.id"
        :description="record.description"
        :is-complete="record.completed == 1"
        @delete="deleteTodo(record.id)"
        @toggle-completion="toggleCompletion(record, !record.completed)"
      />
    </v-list>
    <h2 v-else-if="!isLoading" class="text-subtitle-1">No matching List found, please navigate back...</h2>

    <v-dialog v-model="showPrompt" width="350" opacity="0.5" scrim="black">
      <v-card title="Create Todo Item" class="bg-surface-light">
        <v-card-text>
          Enter a description for a new todo item
          <v-text-field
            autofocus
            color="primary"
            hide-details
            class="mt-3"
            v-model="todoDescription"
            variant="outlined"
            label="Task Name"
            @keyup.enter="submit"
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>

          <v-btn text="Cancel" color="primary" @click="setShowPrompt(false)" />
          <v-btn text="Create" color="primary" @click="submit" />
        </v-card-actions>
      </v-card>
    </v-dialog>
    <Fab @click="setShowPrompt(true)" />
  </div>
</template>

<script setup lang="ts">
import TodoItemWidget from '@/components/widgets/TodoItemWidget.vue';
import { LISTS_TABLE, TODOS_TABLE, TodoRecord } from '@/library/powersync/AppSchema';
import { pageSubtitle } from '@/main';
import { supabase } from '@/plugins/supabase';
import { usePowerSync, useQuery } from '@powersync/vue';
import { watch } from 'vue';
import { onUnmounted } from 'vue';
import { ref } from 'vue';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const powerSync = usePowerSync();

const todoDescription = ref('');
const showPrompt = ref(false);
const setShowPrompt = (state: boolean): void => {
  if (state) todoDescription.value = '';
  showPrompt.value = state;
};
const { id: listID = '' } = useRoute().params;
const { data: listRecords } = useQuery<{ name: string }>(`SELECT name FROM ${LISTS_TABLE} WHERE id = ?`, [listID]);

const listName = computed(() => listRecords.value[0]?.name);
watch(listName, () => {
  pageSubtitle.value = `: ${listName.value}`;
});
onUnmounted(() => {
  pageSubtitle.value = '';
});

const {
  data: todoRecords,
  isLoading,
  isFetching,
  error
} = useQuery<TodoRecord>(`SELECT * FROM ${TODOS_TABLE} WHERE list_id=? ORDER BY created_at DESC, id`, [listID]);

const toggleCompletion = async (record: TodoRecord, completed: boolean) => {
  const updatedRecord = { ...record, completed: completed };
  if (completed) {
    const userID = supabase.currentSession?.user.id;
    if (!userID) {
      throw new Error(`Could not get user ID.`);
    }
    updatedRecord.completed_at = new Date().toISOString();
    updatedRecord.completed_by = userID;
  } else {
    updatedRecord.completed_at = null;
    updatedRecord.completed_by = null;
  }
  await powerSync.value.execute(
    `UPDATE ${TODOS_TABLE}
              SET completed = ?,
                  completed_at = ?,
                  completed_by = ?
              WHERE id = ?`,
    [completed, updatedRecord.completed_at, updatedRecord.completed_by, record.id]
  );
};

const deleteTodo = async (id: string) => {
  await powerSync.value.writeTransaction(async (tx) => {
    await tx.execute(`DELETE FROM ${TODOS_TABLE} WHERE id = ?`, [id]);
  });
};

const createNewTodo = async () => {
  const userID = supabase?.currentSession?.user.id;
  if (!userID) {
    throw new Error(`Could not get user ID.`);
  }

  await powerSync.value.execute(
    `INSERT INTO
                ${TODOS_TABLE}
                    (id, created_at, created_by, description, list_id)
                VALUES
                    (uuid(), datetime(), ?, ?, ?)`,
    [userID, todoDescription.value, listID!]
  );
};

const submit = () => {
  try {
    createNewTodo();
  } finally {
    setShowPrompt(false);
  }
};
</script>
