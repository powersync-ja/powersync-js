<template>
  <v-list-item
    rounded
    class="bg-surface text-left"
    style="margin-bottom: 10px"
    :subtitle="props.description"
    :title="props.title"
    @click="emit('press')"
  >
    <template v-slot:prepend>
      <v-avatar color="surface-variant">
        <v-icon color="black" icon="mdi-list-box-outline" />
      </v-avatar>
    </template>

    <template v-slot:append>
      <v-btn variant="text" icon="mdi-delete-outline" @click.stop="emit('delete')" />
      <v-btn variant="text" icon="mdi-arrow-right" @click.stop="emit('press')" />
    </template>
  </v-list-item>
</template>

<script setup lang="ts">
const props = defineProps({
  title: String,
  description: String
});

const emit = defineEmits<{
  delete: [];
  press: [];
}>();
</script>

<style scoped>
.main-paper {
  margin-bottom: 10px;
}
</style>
