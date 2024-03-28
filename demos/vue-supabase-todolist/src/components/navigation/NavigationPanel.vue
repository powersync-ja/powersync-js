<template>
  <!-- <v-app> -->
  xxx
  <!-- <v-app-bar app>
      <v-app-bar-nav-icon @click="toggleDrawer"></v-app-bar-nav-icon>
      <v-toolbar-title>{{ title }}</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-icon v-if="syncStatus.dataFlowStatus.uploading">mdi-arrow-up</v-icon>
      <v-icon v-if="syncStatus.dataFlowStatus.downloading">mdi-arrow-down</v-icon>
      <v-icon v-if="syncStatus.connected">mdi-wifi</v-icon>
      <v-icon v-else>mdi-wifi-off</v-icon>
    </v-app-bar>

    <v-navigation-drawer v-model="openDrawer" app>
      <v-list>
        <v-list-item v-for="item in NAVIGATION_ITEMS" :key="item.path" @click="navigateTo(item)">
          <v-list-item-icon>
            <v-icon>{{ item.icon }}</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>{{ item.title }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer> -->

  <!-- <v-main>
      <v-container>
        
        <slot></slot>
      </v-container>
    </v-main> -->
  <!-- </v-app> -->
</template>

<script>
import { ref, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';

export default {
  setup() {
    const openDrawer = ref(false);
    const syncStatus = ref(null); // Simulate the syncStatus
    const title = ref(''); // Title from your navigation context

    const router = useRouter();
    const route = useRoute();

    // Equivalent navigation items
    const NAVIGATION_ITEMS = [
      {
        path: '/sql-console',
        title: 'SQL Console',
        icon: 'mdi-console',
      },
      {
        path: '/todo-lists',
        title: 'TODO Lists',
        icon: 'mdi-format-list-checks',
      },
      {
        path: '/login',
        title: 'Sign Out',
        beforeNavigate: async () => {
          // Logic to disconnect and clear before navigating
        },
        icon: 'mdi-exit-to-app',
      },
    ];

    const toggleDrawer = () => {
      openDrawer.value = !openDrawer.value;
    };

    const navigateTo = async (item) => {
      if (item.beforeNavigate) await item.beforeNavigate();
      router.push(item.path);
      openDrawer.value = false;
    };

    // Simulate listening to changes
    watchEffect(() => {
      // Your logic to update syncStatus
    });

    return {
      openDrawer,
      syncStatus,
      NAVIGATION_ITEMS,
      toggleDrawer,
      navigateTo,
      title,
    };
  },
};
</script>

<style scoped>
/* Add any additional styling here */
</style>
