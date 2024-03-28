<template>
  <!-- <navigation-panel title="SQL Console"> -->
  <!-- <v-container>
      <v-row justify="center">
        <v-col cols="12" md="10">
          <v-text-field v-model="inputText" label="Query" outlined dense @keyup.enter="executeQuery"></v-text-field>
        </v-col>
        <v-col cols="12" md="2">
          <v-btn color="primary" @click="executeQuery">Execute Query</v-btn>
        </v-col>
      </v-row>
      <v-container v-if="queryDataGridResult.columns.length > 0" class="mt-4">
        <v-data-table :columns="queryDataGridResult.columns" :items="queryDataGridResult.rows"
          :items-per-page="20"></v-data-table>
      </v-container>
    </v-container> -->
  <!-- </navigation-panel> -->
  <div> SQL CONSOLE
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
// import NavigationPanel from '@/components/navigation/NavigationPanel.vue'; // Update the path as necessary
import { usePowerSyncWatchedQuery } from '@journeyapps/powersync-vue';

const query = ref('SELECT * FROM lists');
const inputText = ref('')
const executeQuery = () => {
  query.value = inputText.value;
};
const { data: querySQLResult } = usePowerSyncWatchedQuery(query.value);

const queryDataGridResult = computed(() => {
  const firstItem = querySQLResult.value?.[0];
  return {
    columns: firstItem ? Object.keys(firstItem).map((field) => ({ text: field, value: field })) : [],
    rows: querySQLResult.value ?? [],
  };
});
</script>
