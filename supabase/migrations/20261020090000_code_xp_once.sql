-- One XP grant per learner per programming question. Backend writes reason = 'code_ac:<question_id>'.
create unique index if not exists xp_log_code_once_idx
  on public.xp_log (user_id, reason)
  where reason like 'code_ac:%';
