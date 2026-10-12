# Bạn bè và chat cộng đồng — Design

Ngày: 2026-10-12 · Trạng thái: chờ duyệt

## Mục tiêu

Học sinh kết bạn, xem danh sách bạn, chat trong phòng theo môn học và nhắn tin riêng (DM) với bạn bè. Có chặn, báo cáo và công cụ kiểm duyệt cho admin.

Làm thành **hai plan độc lập**, mỗi plan ship được riêng:

- **Plan A — Bạn bè**: bảng `friendships`, trang `/friends`, mục menu.
- **Plan B — Chat**: phòng theo môn, DM, chặn, báo cáo, kiểm duyệt. Dựa trên Plan A.

**Ngoài phạm vi**: ảnh/file trong chat, reaction, thông báo đẩy, trạng thái đã đọc, typing indicator, nhóm chat, gợi ý bạn, trạng thái online.

## Quyết định chung

- Kết bạn hai chiều: gửi lời mời, người nhận chấp nhận thì thành bạn. DM chỉ giữa bạn bè (`accepted`).
- Tìm người theo tên hiển thị, **mở cho mọi tài khoản đã đăng nhập** (chưa giới hạn theo lớp). Đây là rủi ro với học sinh nhỏ tuổi; thu hẹp sau bằng một điều kiện trong `search`, không đổi schema.
- **Ghi chỉ qua backend** (Invariant 4, 5): Fastify kiểm tra, rồi ghi bằng service_role. Client chỉ đọc qua RLS và Supabase Realtime.
- Lỗi dùng cặp `error` (vi) / `error_en` như `backend/src/routes/profile.ts`.

---

# Plan A — Bạn bè

## Dữ liệu

Migration `supabase/migrations/20261012150000_friendships.sql`:

```sql
create table public.friendships (
  id           uuid primary key default gen_random_uuid(),
  user_a       uuid not null references public.profiles(id) on delete cascade,
  user_b       uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending','accepted')),
  created_at   timestamptz not null default now(),
  check (user_a < user_b),
  check (requested_by in (user_a, user_b)),
  unique (user_a, user_b)
);
create index on public.friendships (user_b);
```

Cặp lưu theo thứ tự `user_a < user_b` nên (A,B) và (B,A) là cùng một dòng, không thể tạo trùng.

RLS bật; chỉ có policy SELECT cho `auth.uid() in (user_a, user_b)`. Không có policy ghi cho client.

## Backend

`backend/src/routes/friends.ts`, đăng ký trong `backend/src/index.ts`. Tất cả cần đăng nhập.

| Route | Việc |
|---|---|
| `GET /api/friends` | `{ friends, incoming, outgoing }`; mỗi phần tử có `id`, `user_id` của người kia, `display_name`, `avatar_url`. |
| `GET /api/friends/search?q=` | `q` ≥ 2 ký tự; tối đa 10 kết quả; bỏ qua chính mình; kèm `relation`: `none` / `friend` / `pending_out` / `pending_in`. |
| `POST /api/friends/request` `{ user_id }` | Tạo `pending`. |
| `POST /api/friends/:id/accept` | `pending` → `accepted`. |
| `DELETE /api/friends/:id` | Từ chối, huỷ lời mời, hoặc huỷ kết bạn. |

Luật (vi phạm trả 4xx, không ghi gì):

- Tự kết bạn với mình → 400. Người kia không tồn tại → 404.
- Đã có dòng giữa hai người → 409. Ngoại lệ: nếu người kia **đã gửi** lời mời cho mình thì request tự accept.
- Chỉ người **nhận** (không phải `requested_by`) được accept → 403.
- Chỉ thành viên của dòng được xoá; người ngoài nhận 404 (không lộ sự tồn tại).
- Tối đa 20 lời mời `pending` đang gửi đi mỗi user (đếm trong DB).
- `q` được escape `%`, `_` trước khi dùng với `ilike`.

## Frontend

- Một mục menu duy nhất **Cộng đồng / Community** dẫn tới `frontend/app/community/page.tsx` (cần đăng nhập, theo mẫu `app/classes/page.tsx`). Trang có hai tab: **Cộng đồng** (phòng chat theo môn, Plan B) và **Bạn bè**. Tab được giữ trong query `?tab=friends|rooms`. Plan A chỉ có tab Bạn bè nên hiện thẳng nội dung đó, chưa vẽ thanh tab; Plan B thêm tab Cộng đồng và thanh tab.
- `frontend/features/friends/`: `friendsApi.ts` (fetch + token, theo `classQueries.ts`) và `FriendsTab.tsx` với các khối: tìm kiếm + Kết bạn, Lời mời nhận được (Chấp nhận / Từ chối), Đã gửi (Huỷ), Danh sách bạn (Huỷ kết bạn).
- `NavBar.tsx` (menu tài khoản desktop, giữa "Hướng dẫn" và "Gói của tôi", và menu mobile): mục **Cộng đồng / Community** (icon `Users`), kèm chấm đỏ khi có lời mời nhận được.
- Song ngữ qua `t({ en, vi })`; màu theo token sẵn có, không hard-code.

## Test

- Backend (`friends.test.ts`): tự kết bạn, trùng, request chéo tự accept, accept sai người, xoá bởi người ngoài, `q` ngắn, giới hạn 20 lời mời.
- Frontend: render danh sách, lời mời, trạng thái rỗng; chấm đỏ ở NavBar.
- Sau migration: chạy Supabase advisors (RLS bật, có index).

---

# Plan B — Chat

## Dữ liệu

Migration riêng `…_chat.sql`:

```sql
alter table public.profiles add column chat_banned boolean not null default false;

create table public.chat_messages (
  id               uuid primary key default gen_random_uuid(),
  room_subject_id  uuid references public.subjects(id) on delete cascade,
  friendship_id    uuid references public.friendships(id) on delete cascade,
  sender_id        uuid not null references public.profiles(id) on delete cascade,
  sender_name      text not null,
  body             text not null check (char_length(body) between 1 and 500),
  created_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  check (num_nonnulls(room_subject_id, friendship_id) = 1)
);
create index on public.chat_messages (room_subject_id, created_at desc);
create index on public.chat_messages (friendship_id, created_at desc);

create table public.chat_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.chat_reports (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references public.chat_messages(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason      text not null check (char_length(reason) <= 300),
  created_at  timestamptz not null default now(),
  handled_at  timestamptz,
  unique (message_id, reporter_id)
);
```

- `sender_name` được chép vào lúc gửi để Realtime payload tự đủ hiển thị (`profiles` không mở cho client đọc). Đổi tên sau đó không cập nhật tin cũ; chấp nhận được.
- Huỷ kết bạn xoá luôn lịch sử DM (cascade). Đây là hành vi mong muốn: hết quan hệ thì hết đọc được.
- Đưa `chat_messages` vào publication `supabase_realtime`.

RLS (chỉ SELECT; không có policy ghi):

- `chat_messages` phòng: user đăng nhập đọc được khi `deleted_at is null` và người gửi không bị mình chặn.
- `chat_messages` DM: chỉ hai thành viên của friendship `accepted`, `deleted_at is null`.
- `chat_blocks`: chỉ `blocker_id = auth.uid()` đọc được.
- `chat_reports`: không có policy SELECT cho client (chỉ backend/admin).

Realtime `postgres_changes` tôn trọng RLS nên người ngoài không nghe lén được DM.

## Backend

`backend/src/routes/chat.ts` (người dùng) và `backend/src/routes/adminChat.ts` (admin, kiểm `app_metadata.app_role === 'admin'` như `classes.ts`).

| Route | Việc |
|---|---|
| `POST /api/chat/messages` `{ room_subject_id \| friendship_id, body }` | Gửi tin. |
| `POST /api/chat/blocks` `{ user_id }` | Chặn. |
| `GET /api/chat/blocks` / `DELETE /api/chat/blocks/:user_id` | Danh sách người đã chặn (kèm tên) / bỏ chặn. Bỏ chặn không khôi phục quan hệ bạn bè. Giao diện: khối "Đã chặn" trong tab Bạn bè. |
| `POST /api/chat/reports` `{ message_id, reason }` | Báo cáo tin. |
| `GET /api/admin/chat/reports` | Báo cáo chưa xử lý, kèm nội dung tin. |
| `DELETE /api/admin/chat/messages/:id` | Xoá mềm (`deleted_at`) và đánh dấu báo cáo đã xử lý. |
| `POST /api/admin/chat/ban` `{ user_id, banned }` | Bật/tắt `chat_banned`. |

Luật gửi tin (vi phạm trả 4xx, không ghi gì):

- `chat_banned` → 403.
- `body` được trim, 1–500 ký tự.
- Giới hạn tốc độ: tối đa 10 tin trong 10 giây mỗi user (đếm trong DB) → 429.
- Lọc từ cấm: danh sách nhỏ vi/en trong `backend/src/chat/wordFilter.ts`; tin chứa từ cấm bị từ chối kèm thông báo. Danh sách chỉ là lớp cơ bản, không thay thế báo cáo.
- Phòng: `room_subject_id` phải là môn tồn tại và chưa lưu trữ (dùng `isSubjectArchived`).
- DM: `friendship_id` phải `accepted`, người gửi là thành viên, và hai bên không chặn nhau.

Chặn: lưu `chat_blocks`; nếu đang là bạn thì **xoá friendship**; `POST /api/friends/request` từ chối khi có chặn ở một trong hai chiều (sửa nhỏ trong `friends.ts`). Báo cáo: chỉ báo cáo được tin mình đọc thấy (phòng, hoặc DM mình là thành viên); mỗi người báo cáo một tin một lần.

## Frontend

- `/community` (đã có từ Plan A) thêm thanh tab: **Cộng đồng** (mỗi môn một phòng) và **Bạn bè**. Không có tab "Tin nhắn" riêng: DM mở từ tab Bạn bè bằng nút **Nhắn tin** cạnh mỗi bạn (`?tab=friends&dm=<friendship_id>`), hiện ChatPane ngay trong tab.
- `frontend/features/community/`: hook `useChatRoom` (tải 50 tin gần nhất từ Supabase qua RLS, subscribe `postgres_changes` INSERT, gửi qua API), `ChatPane` (danh sách tin, ô nhập, nút Báo cáo / Chặn trên mỗi tin của người khác), `RoomsTab`, và `CommunityPage` chứa thanh tab.
- Tab Bạn bè: trong kết quả tìm kiếm có thêm **Chặn**.
- `NavBar.tsx` không đổi thêm: dùng lại mục **Cộng đồng** của Plan A.
- Màn hình admin: một trang `admin/chat` liệt kê báo cáo, với nút Xoá tin và Cấm chat; theo mẫu các trang admin hiện có.
- Hiển thị sender bằng chữ cái đầu của `sender_name` (chưa dùng avatar).

## Test

- Backend: gửi tin bị cấm / quá dài / quá tốc độ / có từ cấm; DM chưa accept; DM khi bị chặn; chặn tự huỷ kết bạn; báo cáo tin không đọc được; route admin từ chối non-admin.
- RLS (SQL test hoặc kiểm bằng hai user): người ngoài không đọc được DM; tin đã xoá mềm biến mất; tin của người bị chặn biến mất khỏi phòng.
- Frontend: `useChatRoom` nhận tin mới và gộp đúng; ChatPane render, báo cáo/chặn gọi đúng API.

## Rủi ro còn mở

- Tìm theo tên và nhắn phòng đều mở cho mọi tài khoản đã đăng nhập.
- Lọc từ cấm là danh sách tĩnh, sẽ lọt các cách viết lách; kiểm duyệt thật dựa vào báo cáo và admin.
- Chưa có thông báo khi có tin DM mới ngoài lúc đang mở trang `/community`.
