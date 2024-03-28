import { createRouter, createWebHistory } from 'vue-router';

// Import your Vue components corresponding to the pages
import LoginPage from '@/views/Login.vue';
// import RegisterPage from '@/auth/register/Page.vue';
// import EntryPage from './page/Page.vue';
// import TodoEditPage from './views/todo-lists/edit/Page.vue';
// import TodoListsPage from './views/todo-lists/Page.vue';
import ViewsLayout from '@/views/layouts/Layout.vue';
// import SQLConsolePage from '@/views/sql-console/Page.vue';
import SQLConsolePage from '@/views/SqlConsole.vue';

// Route paths
export const TODO_LISTS_ROUTE = '/views/todo-lists';
export const TODO_EDIT_ROUTE = '/views/todo-lists/:id';
export const LOGIN_ROUTE = '/auth/login';
export const REGISTER_ROUTE = '/auth/register';
export const SQL_CONSOLE_ROUTE = '/views/sql-console';
export const DEFAULT_ENTRY_ROUTE = '/views/todo-lists';

// Function to create router instance
export function createAppRouter() {
    const routes = [
        // {
        //     path: '/',
        //     component: EntryPage,
        // },
        {
            path: LOGIN_ROUTE,
            component: LoginPage,
        },
        // {
        //     path: REGISTER_ROUTE,
        //     component: RegisterPage,
        // },
        {
            path: '/views',
            component: ViewsLayout,
            children: [
                // {
                //     path: 'todo-lists',
                //     component: TodoListsPage,
                // },
                // {
                //     path: 'todo-lists/:id',
                //     component: TodoEditPage,
                //     props: true,
                // },
                {
                    path: 'sql-console',
                    component: SQLConsolePage
                }
            ],
        },
    ];

    return createRouter({
        history: createWebHistory(),
        routes,
    });
}