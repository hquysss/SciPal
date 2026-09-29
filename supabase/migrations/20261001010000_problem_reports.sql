-- Anyone can report a problem (landing footer, profile page); an admin reads the open reports on
-- the account management page and marks them resolved. Only the backend (service role) reads or
-- writes these rows: RLS is on and nothing is granted to clients.

create table public.problem_reports (
  id uuid primary key default gen_random_uuid(),
  -- The account that reported, or null for a visitor.
  user_id uuid references auth.users (id) on delete set null,
  -- A visitor: an HMAC of their IP address (never the address), to limit how often they report.
  visitor_hash text check (visitor_hash is null or char_length(visitor_hash) = 64),
  -- Where to answer: the account's e-mail, or the one a visitor typed (optional).
  email text check (email is null or char_length(email) <= 320),
  category text not null check (category in ('bug', 'content', 'payment', 'account', 'other')),
  message text not null check (char_length(btrim(message)) between 10 and 2000),
  page_url text check (page_url is null or char_length(page_url) <= 2048),
  user_agent text check (user_agent is null or char_length(user_agent) <= 500),
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint problem_reports_who check (user_id is not null or visitor_hash is not null)
);

create index problem_reports_open_created on public.problem_reports (created_at) where status = 'open';
create index problem_reports_user_created on public.problem_reports (user_id, created_at desc) where user_id is not null;
create index problem_reports_visitor_created on public.problem_reports (visitor_hash, created_at desc) where visitor_hash is not null;

alter table public.problem_reports enable row level security;
revoke all on public.problem_reports from anon, authenticated;
