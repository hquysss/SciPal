# Plan: gửi hình ảnh cho Giáo sư AI

Spec: `docs/superpowers/specs/2026-10-23-tutor-chat-images-design.md`. Mỗi bước kết thúc bằng test xanh.

1. **Migration** `20261023090000_tutor_images.sql`: bucket riêng `tutor-images` (không công khai, 1,5 MB, PNG/JPEG/WEBP, không policy) và `tutor_messages.image_path text`.
2. **Backend, kiểm tra và lưu** (`backend/src/tutor/images.ts` mới): `parseTutorImage` (base64, kích thước, `sniffImageType`, kiểu khai báo), khóa tệp, câu mặc định song ngữ, `removeUserImages`. Test riêng.
3. **Backend, đường chat** (`routes/tutor.ts`): `bodyLimit` 2,3 MB, nhận `image`, chữ trống thì dùng câu mặc định, tải ảnh lên trước rồi thêm tin kèm `image_path` (lỗi thì xóa tệp), rút câu hỏi thì xóa tệp, "thử lại" dùng ảnh gửi kèm mà không tải lại.
4. **Backend, model, prompt, token**: `ChatMessage.image` tùy chọn và `completionRequest` đổi sang phần `image_url` (Gemini và OpenAI dùng chung); lượt cũ chỉ còn ghi chú chữ; `buildSystemPrompt({ images })`; `tokensUsed` cộng ước tính 1.000 token khi thiếu usage.
5. **Backend, đọc và xóa**: `GET conversations/:id` trả `image_url` ký 1 giờ; `DELETE conversations/:id` xóa tệp trước; xóa tài khoản xóa thư mục `<user_id>/`.
6. **Web**: `tutorImage.ts` (thu nhỏ canvas, JPEG, giới hạn), `useTutorChat.send(text, image?)` và `retry` giữ ảnh, `streamTutor` gửi `image`, `TutorChatView` có nút ảnh, ô xem trước, lỗi tệp; `TutorMessage` hiện hình thu nhỏ hoặc nhãn khi ảnh không còn.
7. **Kiểm**: test backend và web theo mục Kiểm thử của spec, `tsc`, chạy thử trên dev server.
