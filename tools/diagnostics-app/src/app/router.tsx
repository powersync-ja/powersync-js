import { Outlet, createBrowserRouter } from 'react-router-dom';
import LoginPage from './login';
import EntryPage from './page';
import ViewsLayout from './views/layout';
import SQLConsolePage from './views/sql-console';
import SyncDiagnosticsPage from './views/sync-diagnostics';
import SchemaPage from './views/schema';
import ClientParamsPage from './views/client-params';

export const LOGIN_ROUTE = '/login';
export const SQL_CONSOLE_ROUTE = '/sql-console';
export const SYNC_DIAGNOSTICS_ROUTE = '/sync-diagnostics';
export const SCHEMA_ROUTE = '/schema';
export const CLIENT_PARAMETERS_ROUTE = '/client-parameters';

/**
 * Navigate to this route after authentication
 */
export const DEFAULT_ENTRY_ROUTE = SYNC_DIAGNOSTICS_ROUTE;

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
        path: SYNC_DIAGNOSTICS_ROUTE,
        element: <SyncDiagnosticsPage />
      },
      {
        path: SCHEMA_ROUTE,
        element: <SchemaPage />
      },
      {
        path: CLIENT_PARAMETERS_ROUTE,
        element: <ClientParamsPage />
      }
    ]
  }
]);
