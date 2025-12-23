import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

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

export const notesRelations = relations(notes, ({ many }) => ({
  paragraphs: many(paragraphs),
}));

export const drizzleSchema = {
  notes, paragraphs, notesRelations
};