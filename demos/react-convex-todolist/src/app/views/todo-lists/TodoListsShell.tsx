import { Outlet } from 'react-router-dom';

/**
 * Renders the active child route: main board (index), archived lists, or board + list modal (`:id`).
 */
export default function TodoListsShell() {
  return <Outlet />;
}
