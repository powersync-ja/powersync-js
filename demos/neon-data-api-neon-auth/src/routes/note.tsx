import Header from "@/components/app/header";
import NoteHeader from "@/components/app/note-header";
import {
  CurrentParagraph,
  Paragraph as WrittenParagraph,
} from "@/components/app/paragraph";
import { neonConnector } from "@/lib/powersync";
import { queryKeys } from "@/lib/query-keys";
import { generateNameNote } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@powersync/tanstack-react-query";
import {
  createFileRoute,
  redirect,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { powersyncDrizzle } from "@/lib/powersync";
import { notes, paragraphs } from "@/lib/powersync-schema";
import { toCompilableQuery } from "@powersync/drizzle-driver";
import { eq, asc, InferSelectModel } from "drizzle-orm";

type InProgressParagraph = { content: string; timestamp: string };
type Paragraph = InferSelectModel<typeof paragraphs>;
type Note = InferSelectModel<typeof notes>;

// Define the search params schema
export const Route = createFileRoute("/note")({
  component: NoteComponent,
  async beforeLoad() {
    // Wait for connector to initialize (not guaranteed that the useEffect in app.tsx has run yet)
    await neonConnector.init();
    if (!neonConnector.currentSession) {
      throw redirect({
        to: "/signin",
      });
    }
  },
  validateSearch: (search: Record<string, unknown>) => {
    return {
      id: search.id as string | undefined,
    };
  },
});

function NoteComponent() {
  const session = neonConnector.currentSession;
  const { id } = useSearch({ from: Route.fullPath });
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();

  const [currentParagraph, setCurrentParagraph] = useState<InProgressParagraph>(
    { content: "", timestamp: new Date().toISOString() },
  );
  const [currentTime, setCurrentTime] = useState(() => new Date().toISOString());
  const creatingNoteRef = useRef(false);
  const storageKey = id ? `note-${id}-current-paragraph` : null;

  const createNoteMutation = useMutation({
    mutationFn: async () => {
      // User is guaranteed to be authenticated by beforeLoad guard
      const userId = session!.user!.id;

      const noteId = crypto.randomUUID();
      const now = new Date().toISOString();
      const title = generateNameNote();

      await powersyncDrizzle.insert(notes).values({id: noteId, owner_id: userId, title, shared: false, created_at: now, updated_at: now});

      return {
        id: noteId,
        title,
        shared: false,
        owner_id: userId,
        created_at: now,
        updated_at: now,
        paragraphs: [],
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.note(data.id), data);
      navigate({ search: { id: data.id } });
    },
  });

  const noteQuery = powersyncDrizzle.select().from(notes).where(eq(notes.id, id!));

  const {
    data: noteRows,
    isLoading: isLoadingNote,
    error: noteError,
  } = useQuery<Note, Error>({
    queryKey: queryKeys.note(id!),
    retry: false,
    enabled: id !== "new-note" && Boolean(id),
    query: toCompilableQuery(noteQuery),
  });

  const paragraphQuery = powersyncDrizzle.select().from(paragraphs).where(eq(paragraphs.note_id, id!)).orderBy(asc(paragraphs.created_at));

  const {
    data: paragraphRows,
    isLoading: isLoadingParagraphs,
    error: paragraphsError,
  } = useQuery<Paragraph, Error>({
    queryKey: queryKeys.noteParagraphs(id!),
    retry: false,
    enabled: id !== "new-note" && Boolean(id),
    query: toCompilableQuery(paragraphQuery),
  });

  const noteRow = noteRows?.[0];
  const note = noteRow
    ? { ...noteRow, shared: Boolean(noteRow.shared) } 
    : undefined;

  const isLoading = isLoadingNote || isLoadingParagraphs;
  const error = noteError ?? paragraphsError;

  // Create new note if needed
  useEffect(() => {
    if (id === "new-note" && !creatingNoteRef.current) {
      creatingNoteRef.current = true;
      createNoteMutation.mutate();
    } else if (id !== "new-note") {
      creatingNoteRef.current = false;
    }
  }, [id]);

  // Load/save in-progress paragraph from localStorage
  useEffect(() => {
    if (!storageKey) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { setCurrentParagraph(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, [storageKey]);

  useEffect(() => {
    if (storageKey && currentParagraph.content) {
      localStorage.setItem(storageKey, JSON.stringify(currentParagraph));
    }
  }, [currentParagraph, storageKey]);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toISOString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Invalidate on mount to catch changes that occurred while unmounted
  useEffect(() => {
    if (id && id !== "new-note") {
      queryClient.invalidateQueries({ queryKey: queryKeys.note(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.noteParagraphs(id) });
    }
  }, [queryClient, id]);

  const addParagraphMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!id) throw new Error("Note ID is required");
      await powersyncDrizzle.insert(paragraphs).values({id: crypto.randomUUID(), note_id: id, content, created_at: new Date().toISOString()});
    },
    onError: (err) => {
      console.error("Failed to save paragraph", err);
      alert("Failed to save paragraph. Please try again.");
    },
  });

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentParagraph({ content: e.target.value, timestamp: currentTime });
  }, [currentTime]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const content = currentParagraph.content.trim();
      if (content && id) {
        setCurrentParagraph({ content: "", timestamp: new Date().toISOString() });
        if (storageKey) localStorage.removeItem(storageKey);
        addParagraphMutation.mutate(content);
      }
    }
  }, [currentParagraph.content, id, storageKey, addParagraphMutation]);

  if (!session?.user) {
    return null;
  }

  if (isLoading) {
    return (
      <>
        <Header name={session.user.name} />
        <div className="my-10 max-w-2xl mx-auto">
          <div className="text-foreground/70">Loading...</div>
        </div>
      </>
    );
  }

  if (error || !note) {
    return null;
  }

  const isOwner = note.owner_id === session.user.id;

  return (
    <>
      <Header name={session.user.name} />
      <div className="flex flex-col gap-4">
        <NoteHeader
          id={note.id}
          title={note.title}
          shared={note.shared}
          owner_id={note.owner_id}
          user_id={session.user.id}
        />
        <main className="space-y-4">
          {(paragraphRows ?? []).map((para) => (
            <WrittenParagraph
              key={para.id}
              content={para.content}
              timestamp={para.created_at}
            />
          ))}
          {isOwner && (
            <CurrentParagraph
              content={currentParagraph.content}
              timestamp={currentTime}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
            />
          )}
        </main>
      </div>
    </>
  );
}
