import { createBrowserRouter } from 'react-router-dom';
import EditorPage from './editor/page';
import EntryPage from './page';
import SQLConsolePage from './sql-console/page';

export const TODO_LISTS_ROUTE = '/views/todo-lists';
export const TODO_EDIT_ROUTE = '/views/todo-lists/:id';
export const LOGIN_ROUTE = '/auth/login';
export const REGISTER_ROUTE = '/auth/register';
export const SQL_CONSOLE_ROUTE = '/sql-console';

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
    path: '/editor/:id',
    element: <EditorPage />
  },
  {
    path: '/sql-console',
    element: <SQLConsolePage />
  }
]);
