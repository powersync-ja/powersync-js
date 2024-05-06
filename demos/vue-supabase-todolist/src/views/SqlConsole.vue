<template>
  <div class="py-12 mt-1 px-4">
    <div class="d-flex">
      <v-text-field v-model="inputText" variant="outlined" label="Query" hide-details @keyup.enter="executeQuery" />
      <v-btn @click="executeQuery" class="ml-2" color="primary" height="auto">Execute Query</v-btn>
    </div>
    <div class="mt-9">
      <LoadingMessage v-if="isLoading || isFetching" :isLoading :isFetching />
      <ErrorMessage v-if="error">{{ error.message }}</ErrorMessage>
      <v-container v-else-if="queryDataGridResult.columns.length > 0" class="mt-4 pa-0" fluid>
        <v-data-table
          class="bg-transparent table-outline rounded text-left"
          :columns="queryDataGridResult.columns"
          :items="queryDataGridResult.rows"
          :items-per-page="20"
        />
      </v-container>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuery } from '@powersync/vue';
const query = ref('SELECT * FROM lists');
const inputText = ref(query.value);
const executeQuery = () => {
  query.value = inputText.value;
};
const { data: querySQLResult, isLoading, isFetching, error } = useQuery(query);
const queryDataGridResult = computed(() => {
  const firstItem = querySQLResult.value?.[0];
  return {
    columns: firstItem ? Object.keys(firstItem).map((field) => ({ text: field, value: field })) : [],
    rows: querySQLResult.value ?? []
  };
});
</script>

<style scoped>
.table-outline {
  border: 1px solid rgba(255, 255, 255, 0.12);
}
</style>
