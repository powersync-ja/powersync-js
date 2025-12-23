import NoteCard from "@/components/app/note-card";
import type { Note } from "@/lib/api";
import { useRouter } from "@tanstack/react-router";
import { PlusCircleIcon } from "lucide-react";

export default function NotesList({ notes }: { notes: Note[] }) {
  const router = useRouter();

  const addNote = async () => {
    router.navigate({
      to: "/note",
      search: { id: "new-note" },
      replace: true,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h3>My notes</h3>
        <button
          type="button"
          className="cursor-pointer border-none bg-none hover:bg-none flex items-center gap-1.5"
          onClick={addNote}
        >
          <PlusCircleIcon className="w-4 h-4" />
        </button>
      </header>
      <main className="flex flex-col gap-1.5 ">
        {notes?.map((note) => (
          <NoteCard
            key={note.id}
            id={note.id}
            title={note.title}
            createdAt={note.created_at}
          />
        ))}
        {notes.length === 0 && (
          <div className="text-sm text-foreground/50">No notes yet</div>
        )}
      </main>
    </div>
  );
}
