-- Community badges on the existing badges / user_badges tables. The rule for each badge lives in
-- badges.condition; the backend (service role) evaluates it and awards. Additive only.
-- Rollback: delete the seeded rows by slug, then drop the added columns.

alter table public.badges add column if not exists slug text;
alter table public.badges add column if not exists category text not null default 'honor' check (category in ('streak', 'exam', 'excellence', 'community', 'honor'));
alter table public.badges add column if not exists tier text not null default 'bronze' check (tier in ('bronze', 'silver', 'gold', 'platinum', 'special'));
alter table public.badges add column if not exists description_vi text not null default '';
alter table public.badges add column if not exists description_en text not null default '';
alter table public.badges add column if not exists is_system boolean not null default true;
alter table public.badges add column if not exists sort_order int not null default 0;
create unique index if not exists badges_slug_key on public.badges (slug);

alter table public.user_badges add column if not exists awarded_by uuid references public.profiles(id) on delete set null;
alter table public.user_badges add column if not exists reason text;

-- condition types: streak (min days), exam_count (min), perfect_score, friends (min), manual (admin awards).
insert into public.badges (slug, name_vi, name_en, description_vi, description_en, icon, category, tier, is_system, sort_order, condition) values
  ('streak_3', 'Chăm chỉ khởi đầu', 'Good start', 'Học liên tục ít nhất 3 ngày', 'Study 3 days in a row', '🔥', 'streak', 'bronze', true, 10, '{"type":"streak","min":3}'),
  ('streak_7', 'Chiến binh kiên trì', 'Steady warrior', 'Học liên tục ít nhất 7 ngày', 'Study 7 days in a row', '🔥', 'streak', 'silver', true, 20, '{"type":"streak","min":7}'),
  ('streak_30', 'Kỷ luật thép', 'Iron discipline', 'Học liên tục ít nhất 30 ngày', 'Study 30 days in a row', '🔥', 'streak', 'gold', true, 30, '{"type":"streak","min":30}'),
  ('exam_5', 'Tập sự thi thử', 'Mock exam rookie', 'Hoàn thành ít nhất 5 bài thi thử', 'Finish 5 mock exams', '📖', 'exam', 'bronze', true, 40, '{"type":"exam_count","min":5}'),
  ('exam_20', 'Thợ rèn đề thi', 'Exam smith', 'Hoàn thành ít nhất 20 bài thi thử', 'Finish 20 mock exams', '📚', 'exam', 'silver', true, 50, '{"type":"exam_count","min":20}'),
  ('exam_50', 'Bậc thầy luyện đề', 'Exam master', 'Hoàn thành ít nhất 50 bài thi thử', 'Finish 50 mock exams', '🎓', 'exam', 'gold', true, 60, '{"type":"exam_count","min":50}'),
  ('perfect_10', 'Điểm 10 tuyệt đối', 'Perfect 10', 'Đạt điểm 10 trong một bài thi thử', 'Score 10 on a mock exam', '✨', 'excellence', 'platinum', true, 70, '{"type":"perfect_score"}'),
  ('first_friend', 'Bạn đồng hành', 'Study buddy', 'Có ít nhất 1 người bạn', 'Make your first friend', '🤝', 'community', 'bronze', true, 90, '{"type":"friends","min":1}'),
  ('social_star', 'Đại sứ kết nối', 'Connector', 'Có từ 5 người bạn trở lên', 'Have 5 friends or more', '👥', 'community', 'silver', true, 100, '{"type":"friends","min":5}'),
  ('honor_star_student', 'Học sinh tiêu biểu', 'Star student', 'Danh hiệu danh dự do admin hoặc giáo viên trao', 'Honor awarded by an admin or teacher', '⭐', 'honor', 'special', false, 110, '{"type":"manual"}'),
  ('honor_contributor', 'Cống hiến vì cộng đồng', 'Community contributor', 'Ghi nhận đóng góp tích cực cho cộng đồng', 'For positive contributions to the community', '💛', 'honor', 'special', false, 120, '{"type":"manual"}'),
  ('honor_inspirational', 'Thành viên truyền cảm hứng', 'Inspiring member', 'Lan tỏa tinh thần học tập', 'For spreading the love of learning', '⚡', 'honor', 'special', false, 130, '{"type":"manual"}')
on conflict (slug) do update set
  name_vi = excluded.name_vi, name_en = excluded.name_en, description_vi = excluded.description_vi, description_en = excluded.description_en,
  icon = excluded.icon, category = excluded.category, tier = excluded.tier, is_system = excluded.is_system,
  sort_order = excluded.sort_order, condition = excluded.condition;
