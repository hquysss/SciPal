-- supabase/migrations/0005_surveys.sql
CREATE TABLE IF NOT EXISTS surveys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles(id),
  type        text NOT NULL CHECK (type IN ('post_lesson', 'demand', 'feature_request')),
  payload     jsonb NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "surveys_insert_anon" ON surveys FOR INSERT WITH CHECK (true);
CREATE POLICY "surveys_read_service" ON surveys FOR SELECT USING (auth.role() = 'service_role');
