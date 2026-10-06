alter table public.surveys drop constraint if exists surveys_type_check;
alter table public.surveys add constraint surveys_type_check
  check (type in ('post_lesson', 'demand', 'feature_request', 'website_feedback'));
alter table public.surveys add constraint surveys_website_feedback_check check (
  type <> 'website_feedback' or coalesce(
    jsonb_typeof(payload) = 'object'
    and (payload -> 'rating') in ('1'::jsonb, '2'::jsonb, '3'::jsonb, '4'::jsonb, '5'::jsonb)
    and payload ->> 'usability' in ('easy', 'okay', 'hard')
    and jsonb_typeof(payload -> 'feedback') = 'string'
    and char_length(payload ->> 'feedback') <= 500,
    false
  )
);
create index surveys_website_feedback_created_idx on public.surveys (created_at desc, id desc)
  where type = 'website_feedback';
create or replace function public.website_feedback_summary()
returns jsonb language sql stable security invoker set search_path = ''
as $$
  select jsonb_build_object(
    'total', count(*),
    'average', round(avg((payload ->> 'rating')::numeric), 2),
    'distribution', jsonb_build_array(
      count(*) filter (where payload -> 'rating' = '1'::jsonb),
      count(*) filter (where payload -> 'rating' = '2'::jsonb),
      count(*) filter (where payload -> 'rating' = '3'::jsonb),
      count(*) filter (where payload -> 'rating' = '4'::jsonb),
      count(*) filter (where payload -> 'rating' = '5'::jsonb)
    )
  ) from public.surveys where type = 'website_feedback';
$$;
revoke all on function public.website_feedback_summary() from public, anon, authenticated;
grant execute on function public.website_feedback_summary() to service_role;
