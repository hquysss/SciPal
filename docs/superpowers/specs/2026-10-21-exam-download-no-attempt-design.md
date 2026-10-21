# Tải đề thi như tải môn học (không trừ lượt)

Ngày 21/10/2026. Trạng thái: **đã duyệt 21/10/2026** (đã quyết thêm: hết lượt trả 409; `started_at` kẹp trong 7 ngày trước, không sau lúc nộp). Nối tiếp `2026-10-21-offline-mock-exams` (đề tải offline hiện bắt đầu và trừ một lượt ngay).

## Vấn đề
Nút "Tải đề để thi offline" mỗi lần tải là mở một lượt thi tính điểm (giữ chỗ 3 giờ). Không thể có nút "Lưu các đề" như "Lưu môn học": tải N đề sẽ trừ N lượt và hết hạn giữ chỗ trước khi thi.

## Quyết định (chủ dự án chọn: tải đề không trừ lượt)
1. **Tải = chỉ lấy đề + đáp án về máy**, không tạo lượt, không đụng quota.
   - Backend mới: `GET /api/exam/:blueprintId/offline` (đăng nhập, cùng quyền xem đề như `/questions`) trả `{ blueprint, questions, keys }`, giống gói hiện có nhưng không có `attempt_id`.
2. **Lượt thi bắt đầu khi bấm "Bắt đầu"**, kể cả offline: thiết bị tự tạo `attempt_id` (UUID) và ghi `started_at`. Đồng hồ chạy từ đó.
3. **Nộp bài** (`POST /api/score/exam`) với `attempt_id` chưa có trên server: server tạo lượt (`exam_attempts`) và giữ quota theo `attempt_id` rồi chấm như thường, một bước, idempotent theo `attempt_id` (gửi lại không trừ hai lần).
   - Hết lượt khi nộp: server trả 409 `QUOTA_EXCEEDED`; bài không tính điểm/XP; app báo rõ "bài này chưa được tính vì đã hết lượt", giữ điểm tạm tính trên máy.
   - `finished_at` vẫn kẹp (≤5 phút ở tương lai); thêm `started_at` do thiết bị gửi, kẹp không sau `finished_at` và không trước lúc tải gói.
4. **Làm online giữ nguyên** (bắt đầu lượt khi bấm "Bắt đầu" như cũ). Đường cũ `GET /api/exam/attempts/:id/offline` bỏ đi (không còn dùng).
5. **Giao diện:** trang `/exam` có nút "Lưu các đề" (tiến trình x/N, như "Lưu môn học") và mỗi đề có "Tải đề"; thông báo "Tải đề không trừ lượt; lượt tính khi bạn bắt đầu thi." Gói đề vẫn xóa khi đăng xuất; trang `/exam` được giữ cho offline.

## XP (EXP)
Quy tắc XP của đề thi giữ nguyên, chỉ đổi lúc xảy ra:
- Khi **nộp** (đồng bộ), server tính `15 XP × số câu đúng`, một lần cho mỗi đề của mỗi người (`xp_log_exam_once_idx`), chỉ với đề một môn, ghi vào ngày `finished_at` đã kẹp (làm đêm hôm trước thì tính ngày hôm trước).
- Lượt bị từ chối vì hết quota (409): **không** cộng XP.
- Nộp lại cùng `attempt_id`: trả kết quả đã lưu, không cộng thêm.
- Offline: màn kết quả hiện "≈ X XP (tạm tính)" như hiện nay; số của server thay thế khi đồng bộ (luôn do server quyết định, invariant #4).
- **Streak (chủ dự án chọn: đề thi cộng streak):** nộp một đề được chấm thì gọi `touchStreak(môn, ngày finished_at đã kẹp)` như Tự luyện. Streak tính theo môn nên chỉ áp dụng cho đề một môn (như XP); đề nhiều môn không đổi streak. Gọi **mỗi lần một lượt được chấm lần đầu** (không cần có XP, kể cả làm lại đề đã nhận XP), không gọi khi bị 409 hết lượt và không gọi khi nộp lại cùng `attempt_id`. Ngày trước ngày hoạt động gần nhất (nộp trễ) không làm streak lùi (hành vi sẵn có của `touchStreak`). Kết quả trả thêm `new_streak`.
- Huy hiệu: dùng đường cấp huy hiệu sẵn có theo streak/XP của server; không thêm huy hiệu mới.

## Rủi ro cần chủ dự án chấp nhận
- **Đáp án đề thi về máy không cần quota.** Người dùng đã đăng nhập (kể cả gói miễn phí hết lượt) tải được đáp án mọi đề. Giống đã chấp nhận với gói Tự luyện (invariant #4), nhưng đề thi trước đây bị chặn bởi quota.
- Có thể làm bài offline rồi bị báo hết lượt khi nộp (không có điểm chính thức). Giảm nhẹ: hiển thị số lượt còn lại trên nút "Bắt đầu" khi có mạng.

## Thay đổi
Backend `routes/exam.ts` (+ route mới, `/api/score/exam` tạo lượt khi chưa có), frontend `examAttempt.ts`, `offlineExam.ts`, `examPacks.ts`, `ExamRunner.tsx`, `ExamStart.tsx`, `SaveExamOffline.tsx`, trang `/exam`, `public/sw.js` (giữ `/exam`), AGENTS.md invariant #4 (nêu thêm đề thi). Không migration.

## Kiểm thử
Nộp đề một môn gọi `touchStreak` một lần (đề nhiều môn, 409 và nộp lại thì không); tải không tạo `exam_attempts` và không đổi quota; nộp `attempt_id` mới tạo lượt một lần; nộp lại không trừ thêm; hết lượt trả 409 và không cộng XP; `started_at/finished_at` kẹp; nút tải hàng loạt; test mô phỏng offline đầy đủ.
