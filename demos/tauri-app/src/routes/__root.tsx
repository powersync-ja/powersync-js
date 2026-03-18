import { Link, Outlet, createRootRoute } from '@tanstack/react-router';
import { SyncStatus } from '../components/SyncStatus';

export const Route = createRootRoute({
  component: RootComponent
});

function RootComponent() {
  return (
    <>
      <div>
        <Link to="/" activeOptions={{ exact: true }}>
          Todo Lists
        </Link>
      </div>
      <hr />

      <SyncStatus />
      <Outlet />
    </>
  );
}
