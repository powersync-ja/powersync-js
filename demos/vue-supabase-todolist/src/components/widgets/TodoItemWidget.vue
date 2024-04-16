<template>
  <v-list-item rounded class="bg-surface text-left" style="margin-bottom: 10px" :title="props.description || ''">
    <template v-slot:prepend>
      <v-btn icon @click="emit('toggleCompletion')">
        <v-icon>
          {{ isComplete ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}
        </v-icon>
      </v-btn>
    </template>

    <template v-slot:append>
      <v-btn variant="text" icon="mdi-delete-outline" @click.stop="emit('delete')" />
    </template>
  </v-list-item>
</template>

<script setup lang="ts">
import { PropType } from 'vue';

const props = defineProps({
  description: { type: String as PropType<string | null>, default: '' },
  isComplete: { type: Boolean as PropType<boolean | null>, default: false }
});

const emit = defineEmits<{
  delete: [];
  toggleCompletion: [];
}>();
</script>

<style scoped>
.main-paper {
  margin-bottom: 10px;
}
</style>
