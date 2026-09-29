# Giao bài cho lớp — thiết kế

Ngày: 29/09/2026. Phụ thuộc billing plan 5c (`docs/superpowers/plans/2026-09-28-account-pricing-billing.md`).
Chủ dự án chốt: bản 1 có trạng thái hoàn thành (phương án B).

## 1. Mục tiêu

Giáo viên giao một bài học hoặc một đề thi đã xuất bản cho lớp của mình; học sinh trong lớp thấy bài được giao, mở đúng trang bài/đề đang có, và thấy mình đã làm chưa; giáo viên thấy bao nhiêu em đã làm.

Thành công khi: giáo viên giao → học sinh (đã vào lớp bằng mã) thấy bài trong "Lớp của em" → bấm mở đúng bài/đề → làm xong → cả hai phía thấy "Đã làm".

## 2. Hiện trạng (khảo sát 29/09, base `c120110`)

- `assignments(id, class_id, lesson_id, blueprint_id, due_at, created_at)` có từ `0003_user_data`; RLS chỉ SELECT (giáo viên chủ lớp hoặc thành viên); client không ghi được.
- `routes/classes.ts`: tạo lớp, vào lớp (`POST /api/classes/join`), danh sách lớp của giáo viên, roster. `JoinClassModal` đã viết nhưng chưa gắn vào trang nào → học sinh chưa vào lớp được bằng giao diện.
- Trang bài học: `/{subjectSlug}/{lessonSlug}`, chỉ bài `lessons.status = 'published'`. Đề thi: `/exam/{blueprintId}`, chỉ `exam_blueprints.status = 'published'`.
- "Đã làm": bài học → `progress(user_id, lesson_id, completed_at)` do `routes/score.ts` ghi khi chấm quiz bài; đề → `exam_attempts(user_id, blueprint_id text, status = 'submitted')`.

## 3. Phạm vi

Làm:
1. Migration: ràng buộc mỗi dòng giao đúng một thứ (bài học hoặc đề), không giao trùng cùng bài/đề vào cùng lớp, thêm `created_by uuid` (người giao), index theo lớp.
2. API giáo viên (chủ lớp hoặc admin; người khác 404 như roster):
   - `GET /api/classes/:id/assignments` → danh sách bài đã giao, mỗi bài kèm `doneCount` / `memberCount`.
   - `POST /api/classes/:id/assignments` `{ lessonId | blueprintId, dueAt? }` → chỉ nội dung đã xuất bản; trùng → 409; hạn nộp phải ở tương lai.
   - `DELETE /api/classes/:id/assignments/:assignmentId`.
   - `GET /api/classes/:id/assignable?q=` → tìm bài học/đề đã xuất bản theo tên (tối đa 20), để chọn khi giao.
3. API học sinh: `GET /api/classes/mine` → các lớp mình là thành viên (tên lớp, tên giáo viên, môn) và bài được giao của từng lớp, mỗi bài có `href`, tiêu đề EN/VI, loại, hạn nộp, `done`.
4. UI giáo viên (`/teacher/classes/[id]`): mục "Bài đã giao" dưới roster — nút "Giao bài" mở hộp thoại (tab Bài học / Đề thi, ô tìm, hạn nộp tùy chọn), danh sách bài đã giao với "n/m em đã làm", hạn nộp, nút gỡ (có xác nhận).
5. UI học sinh: trang mới `/classes` "Lớp của em" (bảo vệ bằng middleware): nút "Vào lớp bằng mã" (dùng `JoinClassModal`), mỗi lớp một khối liệt kê bài được giao — tiêu đề, loại, hạn nộp ("Quá hạn" nếu đã qua và chưa làm), nhãn "Đã làm", bấm mở bài. Link "Lớp của em" trong menu học sinh (NavBar).

Không làm (bản 1): nộp bài riêng cho bài giao, chấm điểm theo lớp, báo cáo/điểm từng em, thông báo, bình luận, sửa bài đã giao (gỡ rồi giao lại), quota riêng (giao bài có ở cả hai gói giáo viên).

## 4. Quy tắc

- Server quyết định mọi thứ: quyền chủ lớp, trạng thái xuất bản, `done`. API trả tiêu đề + link, không gửi đáp án hay nội dung câu hỏi.
- "Đã làm" không phụ thuộc thời điểm giao: làm trước khi được giao cũng tính (đơn giản, đúng ý "em đã học bài này").
- Bài/đề bị gỡ xuất bản sau khi giao: vẫn hiện với giáo viên (ghi "Không còn xuất bản"), ẩn với học sinh.
- Học sinh rời lớp/bị xóa khỏi lớp: không thấy bài của lớp đó nữa (theo `class_members`).
- Lỗi: `{ code, error, error_en }`; 400 dữ liệu sai, 404 không phải lớp của mình / không tìm thấy, 409 giao trùng, 503 không đọc được dữ liệu.
- UI: EN/VI qua `t()`, tokens sẵn có, sáng/tối, 375px không cuộn ngang, bàn phím dùng được hộp thoại.

## 5. Kiểm thử

- SQL (`supabase/tests/billing.sql` hoặc file mới cùng CI): ràng buộc đúng một nội dung, không trùng.
- Backend (Vitest + mock Supabase): quyền chủ lớp/admin/người khác; chỉ nội dung đã xuất bản; trùng 409; `doneCount` đúng từ `progress` và `exam_attempts`; học sinh chỉ thấy lớp của mình, không thấy bài đã gỡ xuất bản; `done` đúng.
- Frontend (render tĩnh): danh sách giáo viên hiện n/m, học sinh hiện "Đã làm"/"Quá hạn", trống, lỗi; không màu thô.
- Chạy `npx turbo run typecheck test lint` rồi `npx turbo run build`; xem trình duyệt 375/1280, sáng/tối.
