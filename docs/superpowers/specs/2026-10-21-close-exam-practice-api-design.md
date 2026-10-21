# Đóng API đề thi và Tự luyện cho người chưa đăng nhập

Ngày 21/10/2026. Trạng thái: **đã duyệt 21/10/2026**. Nối tiếp `2026-10-20-require-login-design.md` (cổng đó chỉ là middleware web).

## Vấn đề
Backend vẫn cho khách gọi thẳng `/api/exam/*` (danh sách đề, câu hỏi từng đề, bài HSG) và `/api/practice/*` (câu hỏi Tự luyện, `check` cho biết đúng sai nên dò được đáp án). Web đã bắt đăng nhập, nhưng ai gọi API trực tiếp vẫn lấy được nội dung và dò được đáp án.

## Quyết định (chủ dự án chọn cách 3: chỉ đóng hai nhóm này)
1. Bỏ `/api/exam/` và `/api/practice/` khỏi `isPublicPath` (`backend/src/plugins/auth.ts`): khách nhận 401 `Missing authorization header`.
2. **Giữ mở như cũ:** `/api/dictionary/lookup`, `/api/lessons/:id/video`, survey, newsletter, báo lỗi, `billing/plans`, webhook thanh toán, `/health`.
3. Các chỗ web gọi hai nhóm này phải gửi token của người dùng:
   - `getExamBlueprints`, `getHsgProblems` (trang `/exam`, `/exam/hsg/[subject]`, chạy ở server): nhận `token` như `getExamBlueprint` đã nhận; trang lấy token từ `createServerClient(cookies())`.
   - `fetchLessonPractice` (trang bài học chạy ở server và nút "Thử lại" ở client): nhận `token`; nút thử lại dùng `getAccessToken()`.
   - `checkPractice` đã gửi token; `startExamAttempt`, `fetchExamPack`, `fetchPracticePack`, `postPracticeSync`, `postExamSubmit` đã gửi token.
4. Khi token thiếu hoặc hết hạn (401), các hàm tải trả lỗi hiện có (`kind: 'error'` / `ok: false`), không đổi giao diện lỗi.
5. Chữ trong `isPublicPath` và các chú thích "Lesson practice works for visitors too" được sửa cho đúng.

## Thay đổi
- Backend: `plugins/auth.ts` (hai dòng và chú thích).
- Frontend: `examQueries.ts`, `hsgQueries.ts`, `practiceApi.ts` (`fetchLessonPractice`), `LessonPartsView.tsx`, các trang `app/exam/page.tsx`, `app/exam/hsg/[subject]/page.tsx`, `app/[subject]/[lesson]/page.tsx`.
- Không có migration.

## Kiểm thử
- Backend: khách gọi từng đường (`GET /api/exam/blueprints`, `GET /api/exam/:id/questions`, `GET /api/exam/hsg/problems`, `GET /api/practice/lessons/:id/questions`, `POST /api/practice/check`) nhận 401; có token thì đi tiếp như cũ; các đường vẫn mở (`/api/dictionary/lookup`, `/api/lessons/:id/video`, `/api/billing/plans`, `/health`) vẫn 200 không cần token.
- Frontend: `getExamBlueprints`, `getHsgProblems`, `fetchLessonPractice` gửi header `Authorization` khi có token.
- Kiểm tay bằng Browser ở bản production: đăng nhập, mở `/exam`, một đề, một bài HSG, một bài học có Tự luyện, bấm "Thử lại"; rồi `curl` không token vào các đường trên thấy 401.

## Rủi ro
- Chỗ gọi nào sót thì trang đó báo lỗi tải với người đã đăng nhập (không lộ dữ liệu). Test và kiểm tay ở trên để bắt.
- Bản frontend cũ đang mở sẽ lỗi tải đề và Tự luyện cho tới khi tải lại trang.
- Triển khai: frontend trước (gửi token là vô hại với backend cũ), rồi backend.

## Ngoài phạm vi
`/api/dictionary/lookup` và video bài học (vẫn mở); giới hạn tốc độ; ẩn danh các câu lỗi 401 khỏi log.
