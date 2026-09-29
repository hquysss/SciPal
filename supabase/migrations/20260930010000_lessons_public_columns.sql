-- Visitors and learners read published lessons straight from Supabase (RLS: status = 'published').
-- They get only the columns the apps show; internal review and delete-request notes and the ids
-- of the staff who wrote or reviewed a lesson stay with the backend (service role).

revoke select on public.lessons from anon, authenticated;

grant select (
  id, topic_id, subject_id, track_id, slug, title_en, title_vi, grade, blocks, sort_order,
  status, digital_competency, published_at, created_at, updated_at
) on public.lessons to anon, authenticated;
