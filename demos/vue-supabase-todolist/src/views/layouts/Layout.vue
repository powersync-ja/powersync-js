<template>
    <v-app-bar app>
        <v-app-bar-nav-icon @click="toggleDrawer"></v-app-bar-nav-icon>
    </v-app-bar>

    <v-navigation-drawer v-model="openDrawer">
        <v-list>
            <v-list-item v-for="item in NAVIGATION_ITEMS" :key="item.path" @click="navigateTo(item)">
                <template v-slot:prepend>
                    <v-icon :icon="item.icon"></v-icon>
                </template>

                <v-list-item-title>{{ item.title }}</v-list-item-title>
            </v-list-item>
        </v-list>
    </v-navigation-drawer>

    <v-main>
        <v-container>
            <router-view />
        </v-container>
    </v-main>
</template>

<script setup>
import { LOGIN_ROUTE, SQL_CONSOLE_ROUTE, TODO_LISTS_ROUTE } from '@/plugins/router';
import { ref, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';



const openDrawer = ref(false);
const syncStatus = ref(null); // Simulate the syncStatus
const title = ref(''); // Title from your navigation context

const router = useRouter();
const route = useRoute();

// Equivalent navigation items
const NAVIGATION_ITEMS = [
    {
        path: SQL_CONSOLE_ROUTE,
        title: 'SQL Console',
        icon: 'mdi-console',
    },
    {
        path: TODO_LISTS_ROUTE,
        title: 'TODO Lists',
        icon: 'mdi-format-list-checks',
    },
    {
        path: LOGIN_ROUTE,
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
</script>
