-- How loud an announcement is: shown as a colour and label in the bell and the e-mail.
-- Additive: existing rows become 'info'. Bell notices carry the tone in notifications.kind, so that table is unchanged.
alter table public.announcements
  add column if not exists tone text not null default 'info'
  check (tone in ('info', 'good', 'warn', 'urgent'));
