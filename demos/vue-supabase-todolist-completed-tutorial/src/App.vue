<script setup lang="ts">
import { onMounted } from "vue";
import Logger from "js-logger";
import { powerSync } from "./plugins/powerSync";
import { supabase } from "./plugins/supabase";

Logger.useDefaults();
Logger.setLevel(Logger.DEBUG);

onMounted(async () => {
  await powerSync.init();
  await powerSync.connect(supabase);
  await supabase.init();
});
</script>

<template>
  <router-view />
</template>
