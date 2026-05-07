import { Outlet, createBrowserRouter } from 'react-router-dom';
import EntryPage from './page';
import { LoginPage } from './views/auth/page';
import TodoEditModalRoute from './views/todo-lists/TodoEditModalRoute';
import TodoListsShell from './views/todo-lists/TodoListsShell';
import ViewsLayout from './views/layout';
import SQLConsolePage from './views/sql-console/page';

export const TODO_LISTS_ROUTE = '/views/todo-lists';
export const TODO_EDIT_ROUTE = '/views/todo-lists/:id';
export const SQL_CONSOLE_ROUTE = '/sql-console';
export const AUTH_ROUTE = '/auth';

/**
 * Navigate to this route after authentication
 */
export const DEFAULT_ENTRY_ROUTE = '/views/todo-lists';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <EntryPage />
  },
  {
    path: AUTH_ROUTE,
    element: <LoginPage />
  },
  {
    element: (
      <ViewsLayout>
        <Outlet />
      </ViewsLayout>
    ),
    children: [
      {
        path: TODO_LISTS_ROUTE,
        element: <TodoListsShell />,
        children: [{ path: ':id', element: <TodoEditModalRoute /> }]
      },
      {
        path: SQL_CONSOLE_ROUTE,
        element: <SQLConsolePage />
      }
    ]
  }
]);
