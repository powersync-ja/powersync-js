import { defineRelations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const notes = sqliteTable('notes', {
  id: text().primaryKey(),
  title: text().notNull(),
  created_at: text().notNull(),
  updated_at: text(),
  shared: integer({ mode: 'boolean' }).notNull().default(false),
  owner_id: text().notNull(),
});

export const paragraphs = sqliteTable('paragraphs', {
  id: text().primaryKey(),
  note_id: text().notNull().references(() => notes.id),
  content: text().notNull(),
  created_at: text().notNull(),
});

export const drizzleSchema = {
  notes,
  paragraphs
};

export const drizzleRelations = defineRelations(drizzleSchema, (r) => ({
  notes: {
    paragraphs: r.many.paragraphs({
      from: r.notes.id,
      to: r.paragraphs.note_id
    })
  },
  paragraphs: {
    note: r.one.notes({
      from: r.paragraphs.note_id,
      to: r.notes.id,
      optional: false
    })
  }
}));
