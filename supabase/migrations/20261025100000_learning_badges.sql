-- Learning badges (spec docs/superpowers/specs/2026-10-25-gamification-badges-design.md).
-- Apply after 20261025090000_study_days.sql: goal_days reads study_days and profiles.daily_goal_xp.
-- Rollback: delete these rows by slug, then restore the check without 'learning'.

alter table public.badges drop constraint if exists badges_category_check;
alter table public.badges add constraint badges_category_check
  check (category in ('streak', 'exam', 'excellence', 'community', 'honor', 'learning'));

-- condition types added: lessons_done, practice_right, level, goal_days, code_ac (all with min).
insert into public.badges (slug, name_vi, name_en, description_vi, description_en, icon, category, tier, is_system, sort_order, condition) values
  ('lessons_1', 'Bài học đầu tiên', 'First lesson', 'Hoàn thành 1 bài học', 'Complete 1 lesson', '🌱', 'learning', 'bronze', true, 200, '{"type":"lessons_done","min":1}'),
  ('lessons_10', 'Chăm học', 'Keen learner', 'Hoàn thành 10 bài học', 'Complete 10 lessons', '📘', 'learning', 'silver', true, 210, '{"type":"lessons_done","min":10}'),
  ('lessons_50', 'Mọt sách', 'Bookworm', 'Hoàn thành 50 bài học', 'Complete 50 lessons', '📚', 'learning', 'gold', true, 220, '{"type":"lessons_done","min":50}'),
  ('practice_right_50', 'Tay thiện xạ', 'Sharpshooter', 'Đúng ngay lần đầu 50 câu Tự luyện', 'Get 50 practice questions right first time', '🎯', 'learning', 'bronze', true, 230, '{"type":"practice_right","min":50}'),
  ('practice_right_250', 'Xạ thủ', 'Marksman', 'Đúng ngay lần đầu 250 câu Tự luyện', 'Get 250 practice questions right first time', '🏹', 'learning', 'silver', true, 240, '{"type":"practice_right","min":250}'),
  ('practice_right_1000', 'Bách phát bách trúng', 'Never misses', 'Đúng ngay lần đầu 1000 câu Tự luyện', 'Get 1000 practice questions right first time', '💎', 'learning', 'gold', true, 250, '{"type":"practice_right","min":1000}'),
  ('level_5', 'Cấp 5', 'Level 5', 'Đạt cấp 5', 'Reach level 5', '⭐', 'learning', 'bronze', true, 260, '{"type":"level","min":5}'),
  ('level_10', 'Cấp 10', 'Level 10', 'Đạt cấp 10', 'Reach level 10', '🌟', 'learning', 'silver', true, 270, '{"type":"level","min":10}'),
  ('level_20', 'Cấp 20', 'Level 20', 'Đạt cấp 20', 'Reach level 20', '👑', 'learning', 'gold', true, 280, '{"type":"level","min":20}'),
  ('goal_days_7', 'Một tuần đủ chỉ tiêu', 'Goal week', 'Đạt mục tiêu ngày 7 lần', 'Reach your daily goal 7 times', '✅', 'learning', 'bronze', true, 290, '{"type":"goal_days","min":7}'),
  ('goal_days_30', 'Một tháng đủ chỉ tiêu', 'Goal month', 'Đạt mục tiêu ngày 30 lần', 'Reach your daily goal 30 times', '🏆', 'learning', 'gold', true, 300, '{"type":"goal_days","min":30}'),
  ('code_ac_10', 'Lập trình viên nhí', 'Young coder', 'Giải đúng 10 bài lập trình', 'Solve 10 programming problems', '💻', 'learning', 'silver', true, 310, '{"type":"code_ac","min":10}')
on conflict (slug) do update set
  name_vi = excluded.name_vi, name_en = excluded.name_en, description_vi = excluded.description_vi, description_en = excluded.description_en,
  icon = excluded.icon, category = excluded.category, tier = excluded.tier, is_system = excluded.is_system,
  sort_order = excluded.sort_order, condition = excluded.condition;
