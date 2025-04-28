<script setup lang="ts">
import { powerSync } from '@/plugins/powerSync';
import { supabase } from '@/plugins/supabase';
import { createBaseLogger, LogLevel } from '@powersync/web';

const logger = createBaseLogger();
logger.useDefaults();
logger.setLevel(LogLevel.DEBUG);

// For console testing purposes
(window as any)._powersync = powerSync;

powerSync.init();
supabase.registerListener({
  sessionStarted: () => {
    powerSync.connect(supabase);
  }
});

supabase.init();
</script>

<template>
  <v-app dark>
    <v-main class="bg-black" style="width: 100vw">
      <router-view />
    </v-main>
  </v-app>
</template>
