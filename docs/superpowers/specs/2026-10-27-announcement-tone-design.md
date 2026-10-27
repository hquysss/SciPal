# Announcement tone (colour) — design

## Problem
Every admin announcement looks the same in the bell and in the e-mail, so an urgent notice (maintenance, deadline) is not told apart from good news.

## Decision
Admin picks a **tone** per announcement: `info` (blue, default), `good` (green), `warn` (yellow), `urgent` (red). Four fixed tones, not free colours, so contrast holds in light and dark mode. Colour is never the only signal: each tone also has an icon and a text label.

## Where it shows
- **Bell list**: a coloured left bar and the tone icon on the row.
- **E-mail**: a coloured band with the tone label above the title.
- A live toast for new notifications does not exist today, so none is added.

## Data (additive, nothing is dropped)
- `announcements.tone text not null default 'info' check (tone in ('info','good','warn','urgent'))` — one new migration. It is applied to the live database by a person, not by the agent.
- Bell rows reuse `notifications.kind`: `announcement` stays `info`; the others are `announcement:good|warn|urgent`. No change to the `notifications` table. The bell reads the tone from `kind`.
- Scheduled announcements carry `tone` in their existing JSON `payload`.

## Backend (`adminAnnouncements.ts`)
- Accept `tone` (optional, default `info`); an unknown value is a 400.
- Store it on the announcement, write it into `kind` for bell rows, pass it to `announcementEmail`.
- List returns `tone`.

## Frontend
- `AnnouncementsPage`: a row of four tone buttons (radio group) with the colour, icon and label; a small preview of the bell row beside it.
- `NotificationBell`: tone bar and icon from `kind`. Unknown kinds look as they do now.
- Shared `toneStyle` map (tokens only: `info`, `success`, `warning`, `danger` surfaces already in the design system).

## Out of scope
Free colour picker, per-user tone settings, toast for live notifications.

## Tests
Backend: tone default, valid tone stored and written into `kind`, unknown tone rejected, e-mail contains the tone label. Frontend: tone picker sends the value; bell row shows the tone icon and label for `announcement:warn`, plain for `announcement`.

## Done when
Typecheck and tests pass, and a `warn` announcement shows a yellow bar in the bell and a yellow band in the e-mail.
