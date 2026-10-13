# Tra từ tại chỗ (Anh ↔ Việt)

Duyệt 13/10 (hướng A, hai chiều).

## Người học thấy gì

- Trong bài học (phần Bài học và Tự luyện), **bôi đen một từ hoặc cụm** để tra: nhấp đúp trên máy tính, nhấn giữ trên điện thoại, hoặc kéo chọn. Thuật ngữ đã gắn trong bài vẫn chạm một lần như cũ.
- Một thẻ hiện ngay dưới chỗ chọn, cùng kiểu với thẻ thuật ngữ: từ tiếng Anh, nghĩa tiếng Việt, IPA, loại từ, định nghĩa ngắn, ví dụ, **nút nghe** (giọng Anh) và **nút lưu vào sổ từ**. Esc hoặc bấm ra ngoài thì đóng.
- **Chiều tra** tự nhận: chữ có dấu tiếng Việt thì tra Việt → Anh, còn lại tra Anh → Việt.
- **Chọn một phần của thuật ngữ** (ví dụ "vòng" trong "vòng lặp", "loop" trong "for loop"): thẻ tra cả thuật ngữ dài nhất của bài có chứa chỗ chọn.
- Nút nghe ở mọi thẻ: có file âm thanh thì phát file, không có thì đọc bằng giọng trình duyệt (`speakTerm`).

## Nguồn nghĩa (server quyết định)

`POST /api/dictionary/lookup { text, lesson_id }`, khách cũng gọi được:

1. Chuẩn hoá: cắt dấu câu ở hai đầu, gộp khoảng trắng, chữ thường. Hợp lệ: 1–5 từ, ≤ 60 ký tự, chỉ chữ cái, khoảng trắng, `'` và `-`.
2. Bài phải đã xuất bản, môn chưa lưu trữ. Môn của bài là phạm vi tra.
3. Thuật ngữ đã xuất bản cùng môn (khớp `term_en` hoặc `term_vi`) → trả thuật ngữ.
4. Bảng `dictionary_entries` (môn, chiều, từ đã chuẩn hoá) → trả mục đã lưu.
5. Chưa có: khách nhận 401 "Đăng nhập để tra từ mới". Người đã đăng nhập: giữ 600 token Giáo sư, hỏi AI một lần (JSON), kiểm tra, lưu, rồi trừ đúng số token đã dùng. AI lỗi hoặc trả sai dạng thì không trừ (trả 502). AI nói không phải từ thì trả 404 và không lưu.

Mục từ điển gắn với môn, nên "function" ở Toán và ở Tin học là hai mục riêng, mỗi mục đúng nghĩa của môn mình. Admin không bị trừ token.

## Dữ liệu

- `dictionary_entries(id, subject_id, source_lang 'en'|'vi', query, term_en, term_vi, ipa, part_of_speech, definition_en, definition_vi, example_en, example_vi, created_by, created_at)`, unique `(subject_id, source_lang, query)`. Ai cũng đọc được, chỉ backend ghi.
- `user_terms` giữ được cả mục từ điển: thêm `id` làm khoá chính, `entry_id` trỏ tới `dictionary_entries`; `term_id` thành nullable; mỗi dòng có đúng một trong hai; giữ unique `(user_id, term_id)` và thêm unique `(user_id, entry_id)`.
- Các route sổ từ (`POST /api/me/terms`, `DELETE /api/me/terms/:id`, `POST /api/me/terms/:id/review`) nhận id của thuật ngữ hoặc của mục từ điển. XP và streak tính theo môn của mục. Trang `/review` ôn cả hai loại.

## Ngoài phạm vi

- Mục từ điển chưa hiện trong `/glossary?filter=saved`; chúng có trong `/review`.
- Nhân viên chưa sửa được mục từ điển do AI viết.
- Không tra trong trang soạn bài (xem trước không có `lesson_id`).
