export const queryKeys = {
  notes: () => ["notes"] as const,
  note: (id: string) => ["note", id] as const,
  noteShared: (id: string) => ["note", id, "shared"] as const,
  noteParagraphs: (id: string) => ["note", id, "paragraphs"] as const,
} as const;
