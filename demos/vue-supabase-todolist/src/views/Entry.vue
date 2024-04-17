<template>
  <v-progress-circular indeterminate color="primary" />
</template>

<script setup lang="ts">
import { DEFAULT_ENTRY_ROUTE, LOGIN_ROUTE } from '@/plugins/router';
import { supabase } from '@/plugins/supabase';
import { useRouter } from 'vue-router';
const router = useRouter();

if (!supabase.ready) {
  supabase.registerListener({
    initialized: () => {
      /**
       * Redirect if on the entry view
       */
      if (supabase.currentSession) {
        router.push(DEFAULT_ENTRY_ROUTE);
      } else {
        router.push(LOGIN_ROUTE);
      }
    }
  });
} else {
  router.push(DEFAULT_ENTRY_ROUTE);
}
</script>
