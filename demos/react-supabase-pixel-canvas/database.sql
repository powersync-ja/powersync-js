-- PowerSync Pixel Canvas — Supabase setup
-- Run this in the Supabase SQL editor for your cloud project (or as a migration).

-- 1. Table: one row per canvas cell. `id` is the deterministic "x:y" string the
--    client uses, so client UPDATEs (PATCH ops) target existing rows by id.
--    `id` must be text — PowerSync requires a text id column named `id`.
CREATE TABLE IF NOT EXISTS public.pixels (
  id text PRIMARY KEY,
  x integer NOT NULL,
  y integer NOT NULL,
  color integer NOT NULL DEFAULT 0,
  updated_by text,
  updated_at text
);

-- 2. Seed all 1024 cells (32x32) white (color 0). The client NEVER inserts — it
--    only UPDATEs pre-existing rows — so the canvas MUST be seeded here, or
--    placed pixels would update zero rows and silently fail to persist.
INSERT INTO public.pixels (id, x, y, color, updated_by, updated_at)
SELECT gx || ':' || gy, gx, gy, 0, 'seed', ''
FROM generate_series(0, 31) AS gx,
     generate_series(0, 31) AS gy
ON CONFLICT (id) DO NOTHING;

-- 3. Row-level security. Anonymous Supabase sessions carry the `authenticated`
--    role, so these policies cover booth visitors. The client only reads and
--    updates pixels (no insert/delete), so we grant exactly those two.
ALTER TABLE public.pixels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read pixels" ON public.pixels;
CREATE POLICY "Anyone can read pixels"
  ON public.pixels FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can paint pixels" ON public.pixels;
CREATE POLICY "Anyone can paint pixels"
  ON public.pixels FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Publication PowerSync replicates from. It must be named `powersync`.
DROP PUBLICATION IF EXISTS powersync;
CREATE PUBLICATION powersync FOR TABLE public.pixels;
