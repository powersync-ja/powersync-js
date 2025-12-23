import React from "react";
import { NoteTitle } from "@/components/app/note-title";
import { Toggle } from "@/components/ui/toggle";
import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@powersync/tanstack-react-query";
import { Share2 } from "lucide-react";
import { powersyncDrizzle } from "@/lib/powersync";
import { notes } from "@/lib/powersync-schema";
import { toCompilableQuery } from "@powersync/drizzle-driver";
import { eq } from "drizzle-orm";

type Props = {
  id: string;
  title: string;
  shared: boolean;
  owner_id: string;
  user_id: string;
  onShareToggle?: (isShared: boolean) => void;
};

export default function NoteHeader({
  id,
  title,
  shared,
  owner_id,
  user_id,
  onShareToggle,
}: Props) {
  const query = powersyncDrizzle.select({ shared: notes.shared }).from(notes).where(eq(notes.id, id));
  const { data: sharedRows } = useQuery({
    queryKey: queryKeys.noteShared(id),
    enabled: Boolean(id),
    query: toCompilableQuery(query)
  });

  const hydratedShared = (() => {
    const row = sharedRows?.[0];
    if (!row) {
      return undefined;
    }

    return typeof row.shared === "boolean" ? row.shared : Boolean(row.shared);
  })();

  const isShared = hydratedShared ?? shared ?? false;
  const queryClient = useQueryClient();

  // Invalidate on mount to catch changes that occurred while unmounted
  React.useEffect(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.noteShared(id) });
  }, [queryClient, id]);

  const toggleShareMutation = useMutation({
    mutationFn: async (newSharedState: boolean) => {
      await powersyncDrizzle.update(notes).set({ shared: newSharedState, updated_at: new Date().toISOString() }).where(eq(notes.id, id));

      return { shared: newSharedState };
    },
    onSuccess: (data) => {
      if (onShareToggle) {
        onShareToggle(data.shared);
      }
    },
  });

  return (
    <header className="flex items-center justify-between">
      <NoteTitle
        id={id}
        title={title}
        shared={isShared}
        owner={user_id === owner_id}
      />
      {user_id === owner_id && (
        <Toggle
          pressed={isShared}
          className="cursor-pointer h-6 w-6 min-w-6"
          onPressedChange={() => {
            const newSharedState = !isShared;
            toggleShareMutation.mutate(newSharedState);
          }}
        >
          <Share2 className="w-3 h-3" />
        </Toggle>
      )}
    </header>
  );
}
