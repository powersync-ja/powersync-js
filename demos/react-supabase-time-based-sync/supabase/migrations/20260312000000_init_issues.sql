CREATE TABLE IF NOT EXISTS public.issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  created_by UUID REFERENCES auth.users(id),
  created_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  updated_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read issues" ON public.issues;
CREATE POLICY "Authenticated users can read issues"
  ON public.issues FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert issues" ON public.issues;
CREATE POLICY "Authenticated users can insert issues"
  ON public.issues FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update issues" ON public.issues;
CREATE POLICY "Authenticated users can update issues"
  ON public.issues FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete issues" ON public.issues;
CREATE POLICY "Authenticated users can delete issues"
  ON public.issues FOR DELETE
  TO authenticated
  USING (true);

DO
$$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'issues'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.issues;
  END IF;
END
$$;

INSERT INTO public.issues (title, description, status, priority, created_at, updated_at)
VALUES
  ('App crashes on login', 'Users report a crash when tapping the login button on iOS 17.', 'open', 'critical', '2026-01-15T10:30:00Z', '2026-01-15T10:30:00Z'),
  ('Update onboarding copy', 'Marketing wants to revise the welcome screen text.', 'open', 'low', '2026-01-15T14:00:00Z', '2026-01-15T14:00:00Z'),
  ('Fix broken pagination', 'The "next page" button returns an empty list after page 5.', 'open', 'high', '2026-01-14T09:00:00Z', '2026-01-14T09:00:00Z'),
  ('Add dark mode toggle', 'Users have requested a dark mode option in settings.', 'open', 'medium', '2026-01-14T11:30:00Z', '2026-01-14T11:30:00Z'),
  ('Database migration failing', 'Migration 042 fails on Postgres 15 due to deprecated syntax.', 'open', 'critical', '2026-01-10T08:00:00Z', '2026-01-10T08:00:00Z'),
  ('Improve search performance', 'Search queries over 10k rows take >2s. Add proper indexing.', 'open', 'high', '2026-01-10T16:45:00Z', '2026-01-10T16:45:00Z'),
  ('Typo in error message', 'Error says "Somthing went wrong" instead of "Something went wrong".', 'closed', 'low', '2026-01-10T12:00:00Z', '2026-01-10T12:00:00Z'),
  ('Add CSV export', 'Allow users to export their data as CSV from the dashboard.', 'open', 'medium', '2026-01-07T10:00:00Z', '2026-01-07T10:00:00Z'),
  ('Session timeout too short', 'Users are logged out after 5 minutes of inactivity. Increase to 30.', 'closed', 'high', '2026-01-07T15:30:00Z', '2026-01-07T15:30:00Z'),
  ('Add rate limiting', 'API endpoints have no rate limiting. Add 100 req/min per user.', 'open', 'high', '2026-01-05T09:15:00Z', '2026-01-05T09:15:00Z'),
  ('Fix timezone display', 'Times are shown in UTC instead of the user''s local timezone.', 'closed', 'medium', '2026-01-05T13:00:00Z', '2026-01-05T13:00:00Z')
ON CONFLICT (id) DO NOTHING;
