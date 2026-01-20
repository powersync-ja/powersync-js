import { client } from '@/lib/auth';
import { powersync, neonConnector } from '@/lib/powersync';
import { useRouter } from '@tanstack/react-router';

export default function Header({ name }: { name: string }) {
  const router = useRouter();
  return (
    <header className="flex flex-col gap-6 mb-14">
      <div className="flex items-center justify-between">
        <h3>Welcome {name}</h3>
        <button
          type="button"
          className="text-foreground/70 font-normal cursor-pointer"
          onClick={async () => {
            await client.auth.signOut();
            neonConnector.updateSession(null);
            await powersync.disconnectAndClear();
            router.navigate({ to: '/signin' });
          }}
        >
          Sign out
        </button>
      </div>
      <p className="text-foreground/70">
        Your minimalist note-taking app that automatically records timestamps for each of your notes.
      </p>
    </header>
  );
}
