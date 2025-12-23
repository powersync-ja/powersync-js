CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text DEFAULT auth.user_id() NOT NULL,
	"title" text DEFAULT 'untitled note' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"shared" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "paragraphs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note_id" uuid,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "paragraphs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "paragraphs" ADD CONSTRAINT "paragraphs_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "owner_idx" ON "notes" USING btree ("owner_id");--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "notes" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.user_id() = "notes"."owner_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "notes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.user_id() = "notes"."owner_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "notes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.user_id() = "notes"."owner_id")) WITH CHECK ((select auth.user_id() = "notes"."owner_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "notes" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.user_id() = "notes"."owner_id"));--> statement-breakpoint
CREATE POLICY "shared_policy" ON "notes" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("notes"."shared" = true);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "paragraphs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select notes.owner_id = auth.user_id() from notes where notes.id = "paragraphs"."note_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "paragraphs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select notes.owner_id = auth.user_id() from notes where notes.id = "paragraphs"."note_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "paragraphs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select notes.owner_id = auth.user_id() from notes where notes.id = "paragraphs"."note_id")) WITH CHECK ((select notes.owner_id = auth.user_id() from notes where notes.id = "paragraphs"."note_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "paragraphs" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select notes.owner_id = auth.user_id() from notes where notes.id = "paragraphs"."note_id"));--> statement-breakpoint
CREATE POLICY "shared_policy" ON "paragraphs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select notes.shared from notes where notes.id = "paragraphs"."note_id"));