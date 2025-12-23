import { sql } from "drizzle-orm";
import { authUid, authenticatedRole, crudPolicy } from "drizzle-orm/neon";

import {
  boolean,
  index,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .default(sql`auth.user_id()`),
    title: text("title").notNull().default("untitled note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    shared: boolean("shared").default(false),
  },
  (table) => [
    index("owner_idx").on(table.ownerId),
    crudPolicy({
      role: authenticatedRole,
      read: authUid(table.ownerId),
      modify: authUid(table.ownerId),
    }),
    pgPolicy("shared_policy", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.shared} = true`,
    }),
  ],
).enableRLS();

export const paragraphs = pgTable(
  "paragraphs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    noteId: uuid("note_id").references(() => notes.id),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    crudPolicy({
      role: authenticatedRole,
      read: sql`(select notes.owner_id = auth.user_id() from notes where notes.id = ${table.noteId})`,
      modify: sql`(select notes.owner_id = auth.user_id() from notes where notes.id = ${table.noteId})`,
    }),
    pgPolicy("shared_policy", {
      for: "select",
      to: authenticatedRole,
      using: sql`(select notes.shared from notes where notes.id = ${table.noteId})`,
    }),
  ],
).enableRLS();
