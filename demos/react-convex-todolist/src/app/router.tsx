import { Outlet, createBrowserRouter } from 'react-router-dom';
import EntryPage from './page';
import { LoginPage } from './views/auth/page';
import TodoArchivedListsPage from './views/todo-lists/TodoArchivedListsPage';
import TodoListsModalLayout from './views/todo-lists/TodoListsModalLayout';
import TodoListsPage from './views/todo-lists/page';
import TodoListsShell from './views/todo-lists/TodoListsShell';
import ViewsLayout from './views/layout';
import SQLConsolePage from './views/sql-console/page';

export const TODO_LISTS_ROUTE = '/views/todo-lists';
export const TODO_LISTS_ARCHIVED_ROUTE = `${TODO_LISTS_ROUTE}/archived`;
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
        children: [
          { index: true, element: <TodoListsPage /> },
          { path: 'archived', element: <TodoArchivedListsPage /> },
          { path: ':id', element: <TodoListsModalLayout /> }
        ]
      },
      {
        path: SQL_CONSOLE_ROUTE,
        element: <SQLConsolePage />
      }
    ]
  }
]);
