# Trả lời ngắn bằng tiếng Anh, viết hoặc nói, có Giáo sư AI nhận xét (giai đoạn 3)

Ngày: 13/10/2026. Người dùng chọn phương án B (có AI nhận xét ngay).

## Dạng câu hỏi `writing` (chỉ dùng cho Tự luyện)
- `data`: `stem` (song ngữ), `sample_answer` (tiếng Anh, 1–1000 ký tự), `key_terms` (0–8 cụm, mỗi cụm ≤ 60 ký tự), `explanation`/`image`/`source` như các dạng khác.
- Lưu với `usage = 'exam'` → từ chối ("Dạng này chỉ dùng cho Tự luyện."). Ràng buộc `questions.type` thêm `'writing'` (migration).
- Schema dùng chung `packages/types/src/question.ts` và bản sao `backend/src/schemas/questions.ts` giữ y hệt nhau.
- Học sinh không bao giờ thấy `sample_answer`/`key_terms` trước khi nộp (`toPublicPracticeQuestion` chỉ trả `stem` và phần phụ).

## Chấm (server)
- `POST /api/practice/check` nhận `{ writing_answer }` (≤ 1000 ký tự, không rỗng) cho câu `writing`.
- Kết quả: `correct` = đã dùng đủ mọi `key_terms` (không có key term thì `true`), kèm `writing: { used, missing, sample_answer }`. Khớp thuật ngữ: không phân biệt hoa thường, theo ranh giới từ, chấp nhận đuôi `s/es/ed/ing`.
- Không lưu, không XP (như Tự luyện hiện nay).

## Giáo sư AI nhận xét
- `POST /api/practice/writing-feedback { question_id, answer, language }`: cần đăng nhập. Cùng kiểm tra quyền xem câu như route chấm (đã xuất bản và nằm trong bài đã xuất bản, hoặc tác giả/admin xem trước).
- Giữ 1.500 token của quota `tutor_tokens` (ít hơn nếu chỉ còn ít hơn), gọi `app.aiProvider.chat` một lượt, chốt theo số token thật (`tokensUsed`); lỗi hoặc trả lời rỗng → trả lại, không trừ. Admin không bị tính. Hết quota → 429 với thông báo của Giáo sư.
- Prompt: Giáo sư AI xưng thầy ↔ em; dựa vào đề, câu mẫu, thuật ngữ cần dùng và câu của em; nói (1) đã đúng ý chưa, (2) lỗi ngữ pháp/dùng từ, (3) một câu viết lại tốt hơn; tối đa khoảng 120 từ, chữ thường không Markdown; nhận xét bằng ngôn ngữ giao diện, câu viết lại bằng tiếng Anh.
- Trả `{ feedback, remaining }`. Không tính vào trần ngày của Giáo sư (trần ngày cộng token từ `tutor_messages`); quota gói vẫn áp dụng.

## Giao diện Tự luyện
- Ô viết (textarea, tối đa 1000 ký tự, đếm từ), nhãn rõ "Viết câu trả lời bằng tiếng Anh".
- Nút micro (Web Speech API `SpeechRecognition`, `en-US`) chỉ hiện khi trình duyệt hỗ trợ; bấm để nói, chữ nhận được nối vào ô; đang nghe thì nút đổi nhãn "Dừng" và có chữ "Đang nghe…" (không hiệu ứng nhấp nháy). Lỗi micro (bị chặn quyền) → báo bằng chữ.
- Sau khi kiểm tra: danh sách thuật ngữ đã dùng (icon dấu tích + chữ) và còn thiếu (icon + chữ), câu mẫu đặt dưới câu của em.
- Nút "Nhờ Giáo sư nhận xét": đã đăng nhập mới bấm được (khách thấy "Đăng nhập để Giáo sư nhận xét"); đang chờ hiện "Giáo sư đang đọc bài…"; kết quả trong khung riêng; lỗi/hết lượt hiện thông báo của server.

## Soạn câu hỏi
- `QuestionEditor`: dạng "Viết tiếng Anh" chỉ có khi soạn câu Tự luyện; ô câu mẫu và ô thuật ngữ cần dùng (phân cách bằng dấu phẩy).

## Ngoài phạm vi
Nhập dạng `writing` từ Excel; lưu lịch sử bài viết; giáo viên xem bài viết; chấm phát âm; dùng trong đề thi.

## Kiểm thử
Schema (lưu được/từ chối exam/không lộ câu mẫu); khớp thuật ngữ; route chấm; route nhận xét (401, quyền xem câu, giữ/chốt/trả token, hết quota, lỗi AI); UI (đếm từ, micro có/không, kết quả, nút nhận xét khách/đăng nhập, lỗi); editor (trường writing, chỉ ở Tự luyện).
