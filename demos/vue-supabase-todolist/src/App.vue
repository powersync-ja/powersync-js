<script setup lang="ts">
import Logger from 'js-logger';
import { powerSync } from '@/plugins/powerSync';
import { supabase } from '@/plugins/supabase';

Logger.useDefaults();
Logger.setLevel(Logger.DEBUG);

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
