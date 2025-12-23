import Header from '@/components/app/header';
import NotesList from '@/components/app/notes-list';
import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@powersync/tanstack-react-query';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { neonConnector, powersyncDrizzle } from '@/lib/powersync';
import { notes } from '@/lib/powersync-schema';
import { eq, desc, InferSelectModel } from 'drizzle-orm';
import { toCompilableQuery } from '@powersync/drizzle-driver';
type Note = InferSelectModel<typeof notes>;

export const Route = createFileRoute('/')({
  component: RouteComponent,
  // Prevent access to this route if the user is not authenticated
  async beforeLoad() {
    // Wait for connector to initialize (not guaranteed that the useEffect in app.tsx has run yet)
    await neonConnector.init();
    if (!neonConnector.currentSession) {
      throw redirect({
        to: '/signin'
      });
    }
  }
});

function useNotes() {
  const userId = neonConnector.currentSession?.user?.id ?? '';
  const query = powersyncDrizzle.select().from(notes).where(eq(notes.owner_id, userId)).orderBy(desc(notes.created_at));

  return useQuery({
    queryKey: queryKeys.notes(),
    enabled: Boolean(userId),
    query: toCompilableQuery(query)
  });
}

function RouteComponent() {
  const session = neonConnector.currentSession;
  const { data, error, status, isLoading } = useNotes();

  if (!session?.user) {
    return null;
  }

  return (
    <>
      <Header name={session.user.name} />
      {(status === 'pending' || isLoading) && <div className="text-foreground/70">Loading...</div>}
      {status === 'error' && <div className="text-foreground/70">Error: {error.message}</div>}
      {status === 'success' && <NotesList notes={data as Note[]} />}
    </>
  );
}
