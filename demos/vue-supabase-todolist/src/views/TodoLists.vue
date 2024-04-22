<template>
  <TodoListsWidget />
  <v-dialog v-model="showPrompt" width="300" opacity="0.5" scrim="black">
    <v-card title="Create Todo List" class="bg-surface-light">
      <v-card-text>
        Enter a name for a new todo list
        <v-text-field
          autofocus
          color="primary"
          hide-details
          class="mt-3"
          v-model="listName"
          variant="outlined"
          label="List Name"
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
</template>

<script setup lang="ts">
import TodoListsWidget from '@/components/widgets/TodoListsWidget.vue';
import { LISTS_TABLE } from '@/library/powersync/AppSchema';
import { supabase } from '@/plugins/supabase';
import { usePowerSync } from '@powersync/vue';
import { ref } from 'vue';

const powerSync = usePowerSync();

const showPrompt = ref(false);
const setShowPrompt = (state: boolean): void => {
  if (state) listName.value = '';
  showPrompt.value = state;
};

const listName = ref('');

const createNewList = async () => {
  const session = await supabase.client.auth.getSession();
  const userID = session?.data.session?.user?.id;
  if (!userID) {
    throw new Error(`Could not create new lists, no userID found`);
  }

  const res = await powerSync.value.execute(
    `INSERT INTO ${LISTS_TABLE} (id, created_at, name, owner_id) VALUES (uuid(), datetime(), ?, ?) RETURNING *`,
    [listName.value, userID]
  );

  const resultRecord = res.rows?.item(0);
  if (!resultRecord) {
    throw new Error('Could not create list');
  }
};

const submit = () => {
  try {
    createNewList();
  } finally {
    setShowPrompt(false);
  }
};
</script>
