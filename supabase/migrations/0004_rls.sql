-- Enable RLS on all user tables
ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress     ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges  ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_rooms  ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments  ENABLE ROW LEVEL SECURITY;

-- profiles: own row only
CREATE POLICY "profiles: own row" ON profiles
  USING (auth.uid() = id);

-- progress: own rows only
CREATE POLICY "progress: own rows" ON progress
  USING (auth.uid() = user_id);

-- xp_log: own rows only
CREATE POLICY "xp_log: own rows" ON xp_log
  USING (auth.uid() = user_id);

-- streaks: own rows only
CREATE POLICY "streaks: own rows" ON streaks
  USING (auth.uid() = user_id);

-- user_badges: own rows only
CREATE POLICY "user_badges: own rows" ON user_badges
  USING (auth.uid() = user_id);

-- class_rooms: teacher sees own; student sees rooms they're in
CREATE POLICY "class_rooms: teacher" ON class_rooms
  USING (auth.uid() = teacher_id);
CREATE POLICY "class_rooms: member" ON class_rooms
  USING (EXISTS (
    SELECT 1 FROM class_members
    WHERE class_members.class_id = id
      AND class_members.student_id = auth.uid()
  ));

-- class_members: visible to teacher of the room or the student themselves
CREATE POLICY "class_members: visible" ON class_members
  USING (
    auth.uid() = student_id
    OR EXISTS (
      SELECT 1 FROM class_rooms
      WHERE class_rooms.id = class_id
        AND class_rooms.teacher_id = auth.uid()
    )
  );

-- assignments: visible to class members
CREATE POLICY "assignments: visible" ON assignments
  USING (EXISTS (
    SELECT 1 FROM class_members
    WHERE class_members.class_id = assignments.class_id
      AND class_members.student_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM class_rooms
    WHERE class_rooms.id = assignments.class_id
      AND class_rooms.teacher_id = auth.uid()
  ));

-- Content tables: public read (no RLS needed — default Supabase allows anon read)
-- Write is restricted to service_role via Supabase dashboard setting
