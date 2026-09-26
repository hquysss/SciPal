-- One exam XP grant per user per blueprint. Backend writes reason = 'exam_complete:<blueprint_id>'.
-- Legacy rows used reason = 'exam_complete' (no colon) and are not affected.
create unique index if not exists xp_log_exam_once_idx
  on public.xp_log (user_id, reason)
  where reason like 'exam_complete:%';
