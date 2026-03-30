import { Outlet, createBrowserRouter, Navigate } from 'react-router-dom';
import IssuesPage from '@/app/views/issues/page';
import ViewsLayout from '@/app/views/layout';

export const ISSUES_ROUTE = '/views/issues';
export const DEFAULT_ENTRY_ROUTE = ISSUES_ROUTE;

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to={DEFAULT_ENTRY_ROUTE} replace />
  },
  {
    element: (
      <ViewsLayout>
        <Outlet />
      </ViewsLayout>
    ),
    children: [
      {
        path: ISSUES_ROUTE,
        element: <IssuesPage />
      }
    ]
  }
]);
