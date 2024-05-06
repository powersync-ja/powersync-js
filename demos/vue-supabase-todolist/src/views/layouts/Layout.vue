<template>
  <v-app-bar app class="pr-6">
    <v-app-bar-nav-icon @click="toggleDrawer"></v-app-bar-nav-icon>
    <h1 class="ml-5 text-subtitle-1 font-weight-bold">{{ title }}</h1>
    <v-spacer />
    <div class="d-flex">
      <v-icon
        :color="syncStatus.dataFlowStatus.uploading ? 'primary' : 'inherit'"
        class="mr-n2 pa-0"
        icon="mdi-arrow-up"
      />

      <v-icon :color="syncStatus.dataFlowStatus.downloading ? 'primary' : 'inherit'" icon="mdi-arrow-down" />
      <v-icon :icon="syncStatus.connected ? 'mdi-wifi' : 'mdi-wifi-strength-off'" />
    </div>
  </v-app-bar>

  <v-navigation-drawer v-model="openDrawer" class="bg-surface-light">
    <img alt="PowerSync Logo" class="pa-5" width="250px" height="100" src="@/assets/powersync-logo.svg" />
    <v-divider></v-divider>
    <v-list>
      <v-list-item v-for="item in NAVIGATION_ITEMS" :key="item.path" @click="navigateTo(item)">
        <template v-slot:prepend>
          <v-icon :icon="item.icon"></v-icon>
        </template>

        <v-list-item-title class="text-left">{{ item.title }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>

  <v-container class="pa-0" fluid>
    <router-view />
  </v-container>
</template>

<script setup lang="ts">
import { powerSync } from '@/plugins/powerSync';
import { LOGIN_ROUTE, SQL_CONSOLE_ROUTE, TODO_LISTS_ROUTE } from '@/plugins/router';
import { supabase } from '@/plugins/supabase';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { pageSubtitle } from '@/main';
import { useStatus } from '@powersync/vue';

const openDrawer = ref(false);
const syncStatus = useStatus();
const router = useRouter();
const route = useRoute();

const title = computed(() => (route.name?.toString() || 'unknown') + pageSubtitle.value);

// Equivalent navigation items
const NAVIGATION_ITEMS = [
  {
    path: SQL_CONSOLE_ROUTE,
    title: 'SQL Console',
    icon: 'mdi-console'
  },
  {
    path: TODO_LISTS_ROUTE,
    title: 'TODO Lists',
    icon: 'mdi-format-list-checks'
  },
  {
    path: LOGIN_ROUTE,
    title: 'Sign Out',
    beforeNavigate: async () => {
      // Logic to disconnect and clear before navigating
      await powerSync.disconnectAndClear();
      await supabase.client.auth.signOut();
    },
    icon: 'mdi-exit-to-app'
  }
];

const toggleDrawer = () => {
  openDrawer.value = !openDrawer.value;
};

const navigateTo = async (item: (typeof NAVIGATION_ITEMS)[0]) => {
  if (item.beforeNavigate) await item.beforeNavigate();
  router.push(item.path);
  openDrawer.value = false;
};
</script>
