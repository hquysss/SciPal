# Sổ từ cá nhân + IPA (giai đoạn 1 của tiếng Anh học thuật)

Ngày: 13/10/2026. Giai đoạn 2 (flashcard SRS) và 3 (ô trả lời ngắn, tra từ tự do) có spec riêng sau.

## Mục tiêu

Mọi thuật ngữ người học tra trong bài tự vào "Sổ từ của tôi"; thẻ thuật ngữ hiện phiên âm IPA. Đây là nền dữ liệu cho SRS.

## Hiện trạng (dùng lại)

- `TermMark` mở popover `TermCard` (hover / chạm / Enter); `LessonTermsProvider` tải thuật ngữ của bài.
- Nút nghe: `glossary/pronunciation.ts`.
- Bảng `terms` (chưa có IPA); nhân viên nhập qua `TermForm` và Excel (`termSheet.ts`), route ở `backend/src/routes/terms.ts`.

## Dữ liệu (1 migration)

```sql
alter table terms add column ipa text;

create table user_terms (
  user_id       uuid not null references auth.users(id) on delete cascade,
  term_id       uuid not null references terms(id) on delete cascade,
  lesson_id     uuid references lessons(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  primary key (user_id, term_id)
);
alter table user_terms enable row level security;
create policy user_terms_own_read on user_terms for select using (auth.uid() = user_id);
```

Không có policy ghi: chỉ backend (service role) ghi.

## Backend (`routes/terms.ts`, cần đăng nhập)

- `POST /api/me/terms` `{ term_id, lesson_id? }`: thuật ngữ phải đã xuất bản và thuộc môn chưa ẩn, nếu không trả 404. Upsert; đã có thì chỉ cập nhật `last_seen_at` (giữ `lesson_id` đầu tiên). Trả `{ saved: true }`.
- `DELETE /api/me/terms/:termId`: xóa dòng của chính người dùng; không có cũng trả 204.
- Đọc sổ: client đọc thẳng `user_terms` join `terms` qua RLS.

## Giao diện

- **TermMark**: mở bằng chạm/click/Enter (pinned) hoặc bấm nghe → gọi `POST /api/me/terms` một lần mỗi lần mở. Chỉ hover không lưu. Khách: không gọi.
- **TermCard**:
  - IPA cạnh từ tiếng Anh khi có (`/ˈæl.ɡə.rɪ.ðəm/`, `lang="en"`).
  - Nút ★ (`aria-pressed`) cho người đã đăng nhập: thêm/bỏ khỏi sổ. Dùng cả trong bài và `/glossary`.
  - Khách: dòng "Đăng nhập để lưu vào sổ từ" / "Sign in to save to your word list".
  - Lỗi lưu: không chặn popover; ★ trở về trạng thái cũ, báo ngắn "Chưa lưu được. Thử lại nhé."
- **`/vocabulary` — "Sổ từ của tôi" / "My word list"**: cần đăng nhập. Nhóm theo môn, sắp theo `last_seen_at` mới nhất, ô tìm (EN/VI), mỗi mục: thuật ngữ, IPA, nghĩa, nút nghe, nút xóa, link về bài đã gặp. Trạng thái rỗng chỉ cách tra từ trong bài. Lối vào ở navbar và Profile.
- **Nhân viên**: `TermForm` và cột Excel `ipa` (tùy chọn), lưu qua route authoring hiện có.

Chữ hiển thị song ngữ, theo giọng văn ở `02-domain-rules.md` §8; màu chỉ qua token.

## Ngoài phạm vi

Ghi chú riêng của giáo viên (`noteAsTerm`, không thuộc `terms`); SRS; điền IPA hàng loạt; tra từ ngoài glossary; mobile app.

## Kiểm thử

- Backend: chưa đăng nhập 401; thuật ngữ chưa xuất bản / môn bị ẩn 404; lưu hai lần còn 1 dòng, `last_seen_at` tăng; xóa.
- SQL (PGlite): người dùng chỉ đọc được dòng của mình, không insert trực tiếp được.
- Frontend: TermMark bấm thì lưu, hover thì không, khách không gọi; TermCard hiện IPA và ★; trang `/vocabulary` rỗng / có dữ liệu / tìm / xóa; `termSheet` đọc cột `ipa`.
- QA trình duyệt `/vocabulary` và popover ở 1280px và 375px, sáng/tối.

## Triển khai

Migration chỉ thêm (cột nullable + bảng mới), áp trước hay sau deploy đều được. Rollback: `drop table user_terms; alter table terms drop column ipa;`.
