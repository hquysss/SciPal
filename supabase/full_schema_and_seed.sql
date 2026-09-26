-- ⚠️ HISTORICAL SNAPSHOT — NOT the source of truth.
-- Schema and RLS are defined by supabase/migrations/* (applied in timestamp order).
-- This file predates 20260926090000_security_hardening_rls.sql and has weaker
-- policies on user tables. Do not use it to bootstrap a new database.
-- Contains demo content (topic-f-algorithms, binary-search, term "algorithm"); never run it to create a new environment.

-- =====================================================================
-- SciPal — Consolidated Full Schema & Seed Script (Migrations 0001 - 0005)
-- Run this script in the Supabase Dashboard SQL Editor to set up everything!
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Extension & Subjects Table
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS subjects (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text UNIQUE NOT NULL,
  name_en      text NOT NULL,
  name_vi      text NOT NULL,
  accent_color text NOT NULL,
  icon         text NOT NULL,
  status       text NOT NULL DEFAULT 'upcoming'
                 CHECK (status IN ('active', 'upcoming')),
  sort_order   int  NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 2. Educational Content Tables
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS topics (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  slug       text NOT NULL,
  name_en    text NOT NULL,
  name_vi    text NOT NULL,
  sort_order int  NOT NULL DEFAULT 0,
  UNIQUE(subject_id, slug)
);

CREATE TABLE IF NOT EXISTS lessons (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id   uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id),
  slug       text NOT NULL,
  title_en   text NOT NULL,
  title_vi   text NOT NULL,
  grade      int  NOT NULL DEFAULT 11 CHECK (grade IN (10,11,12)),
  blocks     jsonb NOT NULL DEFAULT '[]',
  sort_order int  NOT NULL DEFAULT 0,
  published  bool NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  review_status text NOT NULL DEFAULT 'approved'
    CHECK (review_status IN ('draft', 'pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(subject_id, slug)
);

CREATE INDEX IF NOT EXISTS lessons_author_review_idx
  ON lessons (created_by, review_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS lessons_pending_review_idx
  ON lessons (created_at ASC)
  WHERE review_status = 'pending';

CREATE TABLE IF NOT EXISTS terms (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id     uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  term_en        text NOT NULL,
  term_vi        text NOT NULL,
  part_of_speech text,
  definition_en  text NOT NULL,
  definition_vi  text NOT NULL,
  example_en     text,
  example_vi     text,
  audio_url      text,
  tags           text[] DEFAULT '{}',
  UNIQUE(subject_id, term_en)
);

CREATE TABLE IF NOT EXISTS questions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id   uuid NOT NULL REFERENCES subjects(id),
  lesson_id    uuid REFERENCES lessons(id),
  type         text NOT NULL CHECK (type IN ('mc','truefalse','short')),
  difficulty   int  NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  objective_id text,
  data         jsonb NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exam_blueprints (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text UNIQUE NOT NULL,
  grade      int,
  subject_id uuid REFERENCES subjects(id),
  sections   jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS resources (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id  uuid REFERENCES subjects(id),
  lesson_id   uuid REFERENCES lessons(id),
  title_en    text NOT NULL,
  title_vi    text NOT NULL,
  url         text NOT NULL,
  type        text NOT NULL CHECK (type IN ('video','article','dataset','tool')),
  is_external bool NOT NULL DEFAULT true
);

-- Public read policies for educational content
ALTER TABLE subjects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons         ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms           ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources       ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'subjects: public read') THEN
    CREATE POLICY "subjects: public read" ON subjects FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'topics: public read') THEN
    CREATE POLICY "topics: public read" ON topics FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'lessons: published read') THEN
    CREATE POLICY "lessons: published read" ON lessons FOR SELECT USING (published = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'terms: public read') THEN
    CREATE POLICY "terms: public read" ON terms FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'resources: public read') THEN
    CREATE POLICY "resources: public read" ON resources FOR SELECT USING (true);
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 3. User Data, Gamification & Classrooms
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  role         text NOT NULL DEFAULT 'student' CHECK (role IN ('student','teacher')),
  avatar_url   text,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS progress (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id    uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at timestamptz,
  score        numeric(5,2),
  UNIQUE(user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS xp_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id),
  delta      int  NOT NULL,
  reason     text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS streaks (
  user_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id     uuid NOT NULL REFERENCES subjects(id),
  current_streak int  NOT NULL DEFAULT 0,
  longest_streak int  NOT NULL DEFAULT 0,
  last_active    date,
  PRIMARY KEY(user_id, subject_id)
);

CREATE TABLE IF NOT EXISTS badges (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES subjects(id),
  name_en    text NOT NULL,
  name_vi    text NOT NULL,
  icon       text NOT NULL,
  condition  jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id  uuid NOT NULL REFERENCES badges(id),
  earned_at timestamptz DEFAULT now(),
  PRIMARY KEY(user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS class_rooms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  uuid NOT NULL REFERENCES profiles(id),
  subject_id  uuid NOT NULL REFERENCES subjects(id),
  name        text NOT NULL,
  invite_code text UNIQUE NOT NULL DEFAULT substring(md5(random()::text), 1, 8),
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_members (
  class_id   uuid NOT NULL REFERENCES class_rooms(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at  timestamptz DEFAULT now(),
  PRIMARY KEY(class_id, student_id)
);

CREATE TABLE IF NOT EXISTS assignments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id   uuid NOT NULL REFERENCES class_rooms(id) ON DELETE CASCADE,
  lesson_id  uuid REFERENCES lessons(id),
  due_date   timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Trigger auto-creating profile on Supabase auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 'student')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- User data RLS policies
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress      ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges   ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_rooms   ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments   ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles: own row') THEN
    CREATE POLICY "profiles: own row" ON profiles FOR ALL USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'progress: own rows') THEN
    CREATE POLICY "progress: own rows" ON progress FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'xp_log: own rows') THEN
    CREATE POLICY "xp_log: own rows" ON xp_log FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'streaks: own rows') THEN
    CREATE POLICY "streaks: own rows" ON streaks FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_badges: own rows') THEN
    CREATE POLICY "user_badges: own rows" ON user_badges FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'class_rooms: teacher') THEN
    CREATE POLICY "class_rooms: teacher" ON class_rooms FOR ALL USING (auth.uid() = teacher_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'class_rooms: member') THEN
    CREATE POLICY "class_rooms: member" ON class_rooms FOR SELECT USING (
      EXISTS (SELECT 1 FROM class_members WHERE class_members.class_id = id AND class_members.student_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'class_members: visible') THEN
    CREATE POLICY "class_members: visible" ON class_members FOR ALL USING (
      auth.uid() = student_id OR EXISTS (SELECT 1 FROM class_rooms WHERE class_rooms.id = class_id AND class_rooms.teacher_id = auth.uid())
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 4. Survey Subsystem (§9.7)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS surveys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles(id),
  type        text NOT NULL CHECK (type IN ('post_lesson', 'demand', 'feature_request')),
  payload     jsonb NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'surveys_insert_all') THEN
    CREATE POLICY "surveys_insert_all" ON surveys FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'surveys_read_service') THEN
    CREATE POLICY "surveys_read_service" ON surveys FOR SELECT USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 5. Seed Data: 5 Natural Science Subjects
-- ---------------------------------------------------------------------
INSERT INTO subjects (slug, name_en, name_vi, accent_color, icon, status, sort_order)
VALUES
  ('informatics', 'Informatics', 'Tin học',  '#16a34a', '</>', 'active',   0),
  ('math',        'Mathematics', 'Toán',     '#2563eb', '∑',   'upcoming', 1),
  ('physics',     'Physics',     'Vật lí',   '#7c3aed', '⚛',   'upcoming', 2),
  ('chemistry',   'Chemistry',   'Hoá học',  '#0d9488', '⚗',   'upcoming', 3),
  ('biology',     'Biology',     'Sinh học', '#65a30d', '❁',   'upcoming', 4)
ON CONFLICT (slug) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_vi = EXCLUDED.name_vi,
  accent_color = EXCLUDED.accent_color,
  icon = EXCLUDED.icon,
  status = EXCLUDED.status;

-- ---------------------------------------------------------------------
-- 6. Seed Data: Sample Informatics Topic, Term & Lesson (Binary Search)
-- ---------------------------------------------------------------------
WITH subj AS (SELECT id FROM subjects WHERE slug = 'informatics')
INSERT INTO topics (subject_id, slug, name_en, name_vi, sort_order)
SELECT id, 'topic-f-algorithms', 'Topic F — Algorithms', 'Chủ đề F — Thuật toán', 0
FROM subj
ON CONFLICT (subject_id, slug) DO NOTHING;

WITH subj AS (SELECT id FROM subjects WHERE slug = 'informatics')
INSERT INTO terms (subject_id, term_en, term_vi, part_of_speech, definition_en, definition_vi)
SELECT id,
  'algorithm',
  'thuật toán',
  'noun',
  'A step-by-step procedure for solving a problem.',
  'Một tập hợp các bước có thứ tự để giải quyết một vấn đề.'
FROM subj
ON CONFLICT (subject_id, term_en) DO NOTHING;

WITH topic AS (
  SELECT t.id AS topic_id, t.subject_id
  FROM topics t
  JOIN subjects s ON s.id = t.subject_id
  WHERE s.slug = 'informatics' AND t.slug = 'topic-f-algorithms'
),
term AS (
  SELECT id FROM terms WHERE term_en = 'algorithm'
)
INSERT INTO lessons (topic_id, subject_id, slug, title_en, title_vi, grade, published, blocks)
SELECT
  topic.topic_id,
  topic.subject_id,
  'binary-search',
  'Binary Search',
  'Tìm kiếm nhị phân',
  11,
  true,
  jsonb_build_array(
    jsonb_build_object(
      'type', 'theory',
      'content', jsonb_build_object(
        'en', 'Binary search is an efficient algorithm for finding a target value in a **sorted** array. It works by repeatedly halving the search interval.',
        'vi', 'Tìm kiếm nhị phân là thuật toán hiệu quả để tìm giá trị mục tiêu trong mảng **đã sắp xếp**. Thuật toán hoạt động bằng cách liên tục thu hẹp phạm vi tìm kiếm một nửa.'
      )
    ),
    jsonb_build_object(
      'type', 'formula',
      'katex', 'T(n) = \\mathcal{O}(\\log n)',
      'caption', jsonb_build_object(
        'en', 'Logarithmic Time Complexity',
        'vi', 'Độ phức tạp thời gian logarit'
      )
    ),
    jsonb_build_object(
      'type', 'code',
      'tabs', jsonb_build_array(
        jsonb_build_object(
          'lang', 'python',
          'code', E'def binary_search(arr, target):\n    lo, hi = 0, len(arr) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1'
        ),
        jsonb_build_object(
          'lang', 'cpp',
          'code', E'int binarySearch(vector<int>& arr, int target) {\n    int lo = 0, hi = arr.size() - 1;\n    while (lo <= hi) {\n        int mid = lo + (hi - lo) / 2;\n        if (arr[mid] == target) return mid;\n        else if (arr[mid] < target) lo = mid + 1;\n        else hi = mid - 1;\n    }\n    return -1;\n}'
        )
      )
    ),
    jsonb_build_object(
      'type', 'interactive',
      'kind', 'algorithm-sim',
      'heading', jsonb_build_object('en', 'Interactive Binary Search Simulator', 'vi', 'Mô phỏng tương tác Tìm kiếm nhị phân'),
      'offline', true,
      'config', jsonb_build_object(
        'algorithm', 'binary-search',
        'data', jsonb_build_array(4,8,15,16,23,42),
        'target', 23
      )
    )
  )
FROM topic
ON CONFLICT (subject_id, slug) DO NOTHING;
