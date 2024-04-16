<template>
  <v-fab class="fab mr-4" size="large" color="white" icon="mdi-plus" @click="$emit('click')" />
</template>

<style scoped>
.fab {
  bottom: 50px;
  right: 10px;
  position: fixed;
}
</style>
