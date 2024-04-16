import { RouteRecordRaw, createRouter, createWebHistory } from 'vue-router';

// Import your Vue components corresponding to the pages
import LoginPage from '@/views/Login.vue';
import RegisterPage from '@/views/Register.vue';
import EntryPage from '@/views/Entry.vue';
import TodoListsPage from '@/views/TodoLists.vue';
import TodoEditPage from '@/views/TodoListsEdit.vue';
import SQLConsolePage from '@/views/SqlConsole.vue';
import ViewsLayout from '@/views/layouts/Layout.vue';

// Route paths
export const TODO_LISTS_ROUTE = '/views/todo-lists';
export const TODO_EDIT_ROUTE = '/views/todo-lists/:id';
export const LOGIN_ROUTE = '/auth/login';
export const REGISTER_ROUTE = '/auth/register';
export const SQL_CONSOLE_ROUTE = '/views/sql-console';

export const DEFAULT_ENTRY_ROUTE = TODO_LISTS_ROUTE;

// Function to create router instance
export function createAppRouter() {
  const routes: RouteRecordRaw[] = [
    {
      path: '/',
      component: EntryPage
    },
    {
      path: LOGIN_ROUTE,
      component: LoginPage
    },
    {
      path: REGISTER_ROUTE,
      component: RegisterPage
    },
    {
      path: '/views',
      component: ViewsLayout,
      children: [
        {
          name: 'Todo Lists',
          path: TODO_LISTS_ROUTE,
          component: TodoListsPage
        },
        {
          name: 'Todo List',
          path: TODO_EDIT_ROUTE,
          component: TodoEditPage,
          props: true
        },
        {
          name: 'SQL Console',
          path: SQL_CONSOLE_ROUTE,
          component: SQLConsolePage
        }
      ]
    }
  ];

  return createRouter({
    history: createWebHistory(),
    routes
  });
}
