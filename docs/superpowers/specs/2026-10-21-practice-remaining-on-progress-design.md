# Tiến độ hiện còn mấy câu Tự luyện chưa làm, ở bài nào

Ngày 21/10/2026. Trạng thái: **đã duyệt 21/10/2026**. Nối với `2026-10-21-dont-lose-unsubmitted-work-design.md` (giữ nháp trên máy). Yêu cầu: "tự luyện sẽ lưu lại và ghi lên tiến trình còn mấy câu tự luyện của bài nào chưa làm".

## Vấn đề
Trang Tiến độ chỉ cho biết bài đã hoàn thành (≥ 80% đúng lần đầu). Người học không thấy bài nào mình làm dở và còn bao nhiêu câu Tự luyện chưa làm.

## Quyết định
1. **Lưu lại:** câu đã "Kiểm tra" đã được server lưu (`practice_attempts`, câu trả lời đầu tiên). Không thêm bảng. Nháp chưa kiểm tra vẫn chỉ ở máy (spec kia) và **không** tính là đã làm.
2. **Một câu "chưa làm"** = câu Tự luyện (đã đăng, không phải câu lập trình) của bài mà người học chưa có dòng trong `practice_attempts`. Câu lập trình không tính (như XP và hoàn thành bài).
3. **Bài hiện trong danh sách** = bài người học đã làm ít nhất một câu và còn ít nhất một câu chưa làm, kèm "đã làm X/Y, còn Z câu", xếp bài làm gần nhất lên đầu, nút "Làm tiếp" mở thẳng tab Tự luyện của bài. Bài chưa làm câu nào không liệt kê (lộ trình đã có "Học tiếp"). Bài làm xong hết thì không hiện.
4. **Backend:** `GET /api/practice/remaining` (đăng nhập): lấy `practice_attempts` của người dùng, tìm các bài chứa các câu đó (qua `questions.lesson_id` để thu hẹp, rồi đọc `blocks` của đúng các bài ấy bằng `quizQuestionIds`, cùng bộ lọc câu hợp lệ như `recordPractice`), trả `{ lessons: [{ lesson_id, slug, subject_slug, title, total, done, remaining, last_at }] }`, tối đa 20 bài. Không ghi gì.
5. **Web:** khối "Bài đang làm dở" trong trang Tiến độ (`ProgressView`), tải ở server cùng `getUserProgress`; lỗi tải thì ẩn khối, không làm hỏng trang. Song ngữ, dùng `--accent` của môn.
6. Admin và tác giả câu hỏi không được ghi `practice_attempts` nên khối luôn trống với họ (đúng thiết kế).

## Thay đổi
Backend `routes/practice.ts` (+ hàm tính trong `practice/`), frontend `progressQueries.ts`, `ProgressView.tsx`, `app/progress/page.tsx`. Không migration (RLS đã cho đọc `practice_attempts` của chính mình, nhưng route dùng service role như các route khác).

## Kiểm thử
Backend: bài làm 3/5 → còn 2; làm đủ → không hiện; chưa làm câu nào → không hiện; câu lập trình và câu chưa đăng không tính; tối đa 20 bài, mới nhất trước; chỉ dữ liệu của người gọi; 401 khi khách. Web: khối hiện đúng số câu, ẩn khi rỗng hoặc lỗi.

## Rủi ro
Câu hỏi thêm vào bài sau này làm bài đã xong hiện lại "còn 1 câu" (đúng ý). Bài có quá nhiều câu: giữ giới hạn `MAX_LESSON_QUESTIONS` sẵn có.
