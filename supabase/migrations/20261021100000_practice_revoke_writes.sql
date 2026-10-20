-- Only the backend (service role) writes practice attempts and offline downloads. RLS already has no
-- write policy for them; this states it in grants too, like progress and xp_log.
revoke insert, update, delete on public.practice_attempts from anon, authenticated;
revoke insert, update, delete on public.offline_downloads from anon, authenticated;
