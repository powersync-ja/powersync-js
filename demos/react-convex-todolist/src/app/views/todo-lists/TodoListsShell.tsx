import { Outlet } from 'react-router-dom';
import TodoListsPage from './page';

/**
 * Keeps the todo lists index mounted while nested routes (e.g. list detail modal) render via Outlet.
 */
export default function TodoListsShell() {
  return (
    <>
      <TodoListsPage />
      <Outlet />
    </>
  );
}
