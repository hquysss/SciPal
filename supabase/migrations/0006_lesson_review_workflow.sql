ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'approved'
    CHECK (review_status IN ('draft', 'pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

CREATE INDEX IF NOT EXISTS lessons_author_review_idx
  ON lessons (created_by, review_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS lessons_pending_review_idx
  ON lessons (created_at ASC)
  WHERE review_status = 'pending';

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lessons'
      AND policyname = 'lessons: published read'
  ) THEN
    CREATE POLICY "lessons: published read" ON lessons
      FOR SELECT USING (published = true);
  END IF;
END $$;
