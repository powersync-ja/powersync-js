import { Outlet, createBrowserRouter } from 'react-router-dom';
import LoginPage from './login';
import EntryPage from './page';
import ViewsLayout from './views/layout';
import SQLConsolePage from './views/sql-console/page';

export const LOGIN_ROUTE = '/login';
export const SQL_CONSOLE_ROUTE = '/sql-console';

/**
 * Navigate to this route after authentication
 */
export const DEFAULT_ENTRY_ROUTE = SQL_CONSOLE_ROUTE;

export const router = createBrowserRouter([
  {
    path: '/',
    element: <EntryPage />
  },
  {
    path: LOGIN_ROUTE,
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
        path: SQL_CONSOLE_ROUTE,
        element: <SQLConsolePage />
      }
    ]
  }
]);
