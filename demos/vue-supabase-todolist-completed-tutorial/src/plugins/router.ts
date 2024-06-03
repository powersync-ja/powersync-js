import { RouteRecordRaw, createRouter, createWebHistory } from "vue-router";

// Import your Vue components corresponding to the pages
import LoginPage from "../views/Login.vue";
import RegisterPage from "../views/Register.vue";
import TodoList from "../views/TodoList.vue";

// Function to create router instance
export function createAppRouter() {
  const routes: RouteRecordRaw[] = [
    {
      path: "/",
      component: TodoList,
    },
    {
      path: "/login",
      component: LoginPage,
    },
    {
      path: "/register",
      component: RegisterPage,
    },
  ];

  return createRouter({
    history: createWebHistory(),
    routes,
  });
}
