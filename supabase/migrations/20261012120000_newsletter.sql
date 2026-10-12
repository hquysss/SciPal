-- Newsletter sign-ups from the landing page and the announcements admins send to accounts (bell)
-- and to confirmed subscribers (e-mail). The backend (service role) reads and writes both tables;
-- browsers have no policies. Confirm and unsubscribe links are HMACs of the row id, nothing is stored.

create table if not exists public.newsletter_subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           text not null check (email = lower(email) and char_length(email) <= 320),
  user_id         uuid references public.profiles(id) on delete set null,
  levels          text[] not null default '{}'
                  check (levels <@ array['primary', 'lower_secondary', 'upper_secondary']::text[]),
  locale          text not null default 'vi' check (locale in ('vi', 'en')),
  status          text not null default 'pending' check (status in ('pending', 'confirmed', 'unsubscribed')),
  visitor_hash    text,
  last_sent_at    timestamptz,
  requested_at    timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  confirmed_at    timestamptz,
  unsubscribed_at timestamptz
);
create unique index if not exists newsletter_subscribers_email_key on public.newsletter_subscribers (email);
create index if not exists newsletter_subscribers_status_idx on public.newsletter_subscribers (status);
create index if not exists newsletter_subscribers_visitor_idx on public.newsletter_subscribers (visitor_hash, requested_at desc);

create table if not exists public.announcements (
  id                uuid primary key default gen_random_uuid(),
  client_request_id uuid not null unique,
  created_by        uuid references public.profiles(id) on delete set null,
  title_vi          text not null check (char_length(title_vi) between 1 and 120),
  title_en          text not null check (char_length(title_en) between 1 and 120),
  body_vi           text not null default '' check (char_length(body_vi) <= 1000),
  body_en           text not null default '' check (char_length(body_en) <= 1000),
  link              text,
  level             text check (level in ('primary', 'lower_secondary', 'upper_secondary')),
  send_app          boolean not null default false,
  send_email        boolean not null default false,
  app_count         int not null default 0,
  email_count       int not null default 0,
  created_at        timestamptz not null default now(),
  check (send_app or send_email)
);
create index if not exists announcements_created_idx on public.announcements (created_at desc);

alter table public.newsletter_subscribers enable row level security;
alter table public.announcements enable row level security;
revoke all on public.newsletter_subscribers from anon, authenticated;
revoke all on public.announcements from anon, authenticated;
