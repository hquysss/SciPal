# Sổ từ cá nhân + IPA (giai đoạn 1 của tiếng Anh học thuật)

Ngày: 13/10/2026. Giai đoạn 2 (flashcard SRS) và 3 (ô trả lời ngắn, tra từ tự do) có spec riêng sau.

## Mục tiêu

Mọi thuật ngữ người học tra trong bài tự vào "Sổ từ của tôi"; thẻ thuật ngữ hiện phiên âm IPA. Đây là nền dữ liệu cho SRS.

## Hiện trạng (dùng lại)

- `TermMark` mở popover `TermCard` (hover / chạm / Enter); `LessonTermsProvider` tải thuật ngữ của bài.
- `/glossary` (`GlossarySearch`) đã có nút dấu trang và bộ lọc "Đã lưu", nhưng chỉ lưu trong `localStorage` của trình duyệt.
- Nút nghe: `glossary/pronunciation.ts`.
- Bảng `terms` (chưa có IPA); nhân viên thêm thuật ngữ qua `TermForm` và Excel (`termSheet.ts`), route ở `backend/src/routes/terms.ts`. Chưa có route sửa thuật ngữ đã có.

## Quyết định

- **Sổ từ = bộ lọc "Đã lưu" của `/glossary`**, đổi tên thành "Sổ từ của tôi" / "My words". Không làm trang mới: bộ lọc này đã có tìm kiếm, lọc môn, nghe, bỏ lưu.
- Đã đăng nhập: sổ lưu trên server (bảng `user_terms`), dùng được trên mọi thiết bị. Khách: vẫn lưu trong trình duyệt như hiện nay. Khi đăng nhập, các từ khách đã lưu được chuyển lên server một lần, chuyển xong mới xóa bản trong trình duyệt.
- Dấu trang (Bookmark) là biểu tượng lưu ở mọi nơi, giống `/glossary` hiện tại.

## Dữ liệu (1 migration)

```sql
alter table terms add column ipa text;

create table user_terms (
  user_id    uuid not null references auth.users(id) on delete cascade,
  term_id    uuid not null references terms(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, term_id)
);
alter table user_terms enable row level security;
create policy "user_terms: own read" on user_terms for select using (auth.uid() = user_id);
```

Không có policy ghi: chỉ backend (service role) ghi.

## Backend (`routes/terms.ts`, cần đăng nhập)

- `POST /api/me/terms` `{ term_ids: string[] }` (1–200 UUID): chỉ lưu thuật ngữ đã xuất bản thuộc môn chưa ẩn; id khác bị bỏ qua lặng lẽ (từ cũ trong trình duyệt có thể đã bị gỡ). Đã có thì giữ nguyên. Trả `{ saved: string[] }` là các id hợp lệ.
- `DELETE /api/me/terms/:termId`: xóa dòng của chính người dùng; không có cũng trả 204.
- Tạo thuật ngữ (một và nhiều) nhận thêm `ipa` (tùy chọn, ≤ 80 ký tự, bỏ dấu `/` ở hai đầu).
- Đọc sổ: client đọc thẳng `user_terms` qua RLS.

## Giao diện

- **TermMark**: mở bằng chạm/click/Enter → lưu thuật ngữ (glossary) vào sổ. Chỉ hover không lưu. Ghi chú riêng của giáo viên không lưu.
- **TermCard** (popover và danh sách cuối bài): IPA cạnh từ tiếng Anh khi có (`/ˈæl.ɡə.rɪ.ðəm/`, `lang="en"`); nút dấu trang (`aria-pressed`) để thêm/bỏ.
- **`/glossary`**: thẻ hiện IPA; chip "Sổ từ của tôi" đếm số thuật ngữ đã lưu đang có trong danh sách; `/glossary?filter=saved` mở sẵn chip này.
- **Profile**: link "Sổ từ của tôi" tới `/glossary?filter=saved`.
- **Lỗi lưu/bỏ lưu**: dấu trang trở về trạng thái cũ, báo "Chưa lưu được. Thử lại nhé." / "Not saved. Try again."
- **Nhân viên**: `TermForm` có ô IPA; Excel có cột `IPA` (tùy chọn).

Chữ hiển thị song ngữ, theo giọng văn ở `02-domain-rules.md` §8; màu chỉ qua token.

## Ngoài phạm vi

Điền IPA cho các thuật ngữ đã có (cần route sửa hoặc migration dữ liệu riêng); liên kết từ sổ về bài đã gặp; sắp theo lần tra gần nhất; SRS; tra từ ngoài glossary; mobile app.

## Kiểm thử

- Backend: chưa đăng nhập 401; id chưa xuất bản / môn bị ẩn bị bỏ qua; lưu hai lần không lỗi; xóa chỉ dòng của mình; `ipa` được nhận khi tạo.
- SQL (PGlite): người dùng chỉ đọc được dòng của mình, không insert trực tiếp được.
- Frontend: kho sổ từ (khách / đăng nhập / chuyển từ trình duyệt lên); TermMark bấm thì lưu, hover thì không; TermCard hiện IPA và dấu trang; glossary đọc `?filter=saved`; `termSheet` đọc cột IPA.
- QA trình duyệt popover và `/glossary?filter=saved` ở 1280px và 375px, sáng/tối.

## Triển khai

Migration chỉ thêm (cột nullable + bảng mới). Áp migration **trước** khi deploy frontend (frontend mới đọc `terms.ipa`). Rollback: `drop table user_terms; alter table terms drop column ipa;`.
