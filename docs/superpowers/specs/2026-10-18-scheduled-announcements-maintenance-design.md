# Scheduled announcements and maintenance (draft)

Admins can schedule a time for (a) an announcement to go out and (b) maintenance mode to switch on and, optionally, off. When the time comes the system acts by itself.

## Scope

- `/admin/announcements`: the form gains "Send now / Send at <date, time>". Scheduled ones show in a "Scheduled" list with a Cancel button.
- `/admin/site`: a "Schedule maintenance" block: start time, optional end time, optional announcement text sent when it starts. Scheduled windows list with Cancel.
- Times are entered in Asia/Ho_Chi_Minh and stored as `timestamptz`.
- Out of scope: recurring schedules, editing a scheduled item (cancel and recreate), per-user time zones.

## Data

One table `scheduled_actions` (RLS on, no browser policies; the backend reads and writes it):

| column | note |
|---|---|
| id uuid | primary key |
| kind | `announcement`, `maintenance_on`, `maintenance_off` |
| run_at timestamptz | when to act |
| payload jsonb | the announcement input (same fields as `POST /api/admin/announcements`); empty for maintenance |
| status | `pending`, `running`, `done`, `cancelled`, `failed` |
| result jsonb, error text | counts or the failure |
| created_by, created_at, finished_at | audit |

Additive migration only. Applying it to the live database is a manual step for the owner.

## Behaviour

- A runner claims due rows (`pending` and `run_at <= now()`, `for update skip locked`, set to `running`) so a row runs once even if two runners overlap.
  - `announcement`: reuses the existing send code (bell notices plus e-mail), so counts and idempotency match "send now".
  - `maintenance_on` / `maintenance_off`: updates `site_settings.maintenance`; the existing hook does the rest.
- Failure sets `failed` with the error; nothing retries silently. The admin list shows it.
- Cancel is allowed only while `pending`.

## Runner (decided: Supabase pg_cron)

pg_cron calls the backend every minute, so timing does not depend on the Vercel plan. The endpoint is `GET /api/internal/scheduled/run` with `Authorization: Bearer <CRON_SECRET>`; it stays reachable during maintenance (it must switch maintenance off). One-time setup by the owner, in the Supabase SQL editor, after the migration is applied and `CRON_SECRET` is set on the backend (replace the two placeholders):

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('scipal-scheduled-actions', '* * * * *', $$
  select net.http_get(
    url := 'https://<BACKEND-HOST>/api/internal/scheduled/run',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  );
$$);
```

Maintenance: the end time is optional; without one an admin switches maintenance off with the existing switch.

## Tests

- Backend: claim-once under overlap, each kind, failure path, cancel only when pending, admin-only routes.
- Frontend: form validation (time in the future), list and cancel.
