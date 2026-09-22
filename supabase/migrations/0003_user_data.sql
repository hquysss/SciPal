CREATE TABLE profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  role         text NOT NULL DEFAULT 'student' CHECK (role IN ('student','teacher')),
  avatar_url   text,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE progress (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id    uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at timestamptz,
  score        numeric(5,2),
  UNIQUE(user_id, lesson_id)
);

CREATE TABLE xp_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id),
  delta      int  NOT NULL,
  reason     text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE streaks (
  user_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id     uuid NOT NULL REFERENCES subjects(id),
  current_streak int  NOT NULL DEFAULT 0,
  longest_streak int  NOT NULL DEFAULT 0,
  last_active    date,
  PRIMARY KEY(user_id, subject_id)
);

CREATE TABLE badges (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES subjects(id),
  name_en    text NOT NULL,
  name_vi    text NOT NULL,
  icon       text NOT NULL,
  condition  jsonb NOT NULL
);

CREATE TABLE user_badges (
  user_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id  uuid NOT NULL REFERENCES badges(id),
  earned_at timestamptz DEFAULT now(),
  PRIMARY KEY(user_id, badge_id)
);

CREATE TABLE class_rooms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  uuid NOT NULL REFERENCES profiles(id),
  subject_id  uuid NOT NULL REFERENCES subjects(id),
  name        text NOT NULL,
  invite_code text UNIQUE NOT NULL DEFAULT substring(md5(random()::text), 1, 8),
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE class_members (
  class_id   uuid NOT NULL REFERENCES class_rooms(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id),
  joined_at  timestamptz DEFAULT now(),
  PRIMARY KEY(class_id, student_id)
);

CREATE TABLE assignments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id     uuid NOT NULL REFERENCES class_rooms(id) ON DELETE CASCADE,
  lesson_id    uuid REFERENCES lessons(id),
  blueprint_id uuid REFERENCES exam_blueprints(id),
  due_at       timestamptz,
  created_at   timestamptz DEFAULT now()
);

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles(id) VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
