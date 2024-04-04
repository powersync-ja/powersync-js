import { Outlet, createBrowserRouter } from 'react-router-dom';
import LoginPage from './login';
import EntryPage from './page';
import ViewsLayout from './views/layout';
import SQLConsolePage from './views/sql-console/page';
import SyncDiagnosticsPage from './views/sync-diagnostics';

export const LOGIN_ROUTE = '/login';
export const SQL_CONSOLE_ROUTE = '/sql-console';
export const SYNC_DIAGNOSTICS = '/sync-diagnostics';

/**
 * Navigate to this route after authentication
 */
export const DEFAULT_ENTRY_ROUTE = SYNC_DIAGNOSTICS;

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
      },
      {
        path: SYNC_DIAGNOSTICS,
        element: <SyncDiagnosticsPage />
      }
    ]
  }
]);
