# Bồi dưỡng HSG trong Phòng thi thử: chia theo môn, Tin học có danh sách bài lập trình

Ngày 2026-10-19. Trạng thái: chờ duyệt. Dựa trên mục HSG (`2026-10-19-hsg-exam-category-design.md`) và chấm code Tự luyện (`2026-10-19-code-judge-design.md`, PR #221). Thay cho bản "OJ kiểu VNOI/Codeforces" trước đó (bỏ khu bài nộp, chấm bất đồng bộ, kỳ thi).

## Mục tiêu
- Nhóm "Bồi dưỡng HSG" ở `/exam` được chia theo môn.
- Riêng Tin học: một danh sách bài lập trình; bấm vào bài mở trang bài có phần làm code **giống hệt Tự luyện đang làm** (đề, ví dụ, editor Python/C++, tải file, Chạy thử, Nộp bài, kết quả từng test, chấm bằng Judge0).
- Tự luyện của bài học giữ nguyên.

## Giao diện
**`/exam`, nhóm "Bồi dưỡng HSG"** (vẫn đứng đầu):
- Trong nhóm có tiêu đề phụ theo môn (Tin học, Toán, …), chỉ hiện môn có nội dung.
- Tin học: thẻ đầu tiên "Luyện lập trình · n bài" dẫn tới `/exam/hsg/informatics`; đề HSG Tin khác (nếu có) nằm cạnh như thẻ đề thường.
- Môn khác: các đề HSG như thẻ đề hiện tại.
- Bộ lọc môn hiện có vẫn áp dụng.

**`/exam/hsg/informatics` — Danh sách bài:**
- Breadcrumb: Trang chủ / Phòng thi thử / Bồi dưỡng HSG Tin học.
- Danh sách: mã bài (`SPRIME`), tên, nhãn (`Sàng nguyên tố`), độ khó (Dễ/Vừa/Khó). Lọc theo nhãn và độ khó.
- ≥ 768px là bảng; dưới mức đó là danh sách thẻ, không cuộn ngang. Hàng cao ≥ 44px.

**`/exam/hsg/informatics/[id]` — Trang bài:**
- Breadcrumb tới danh sách, nút "Bài trước / Bài sau".
- Thân trang là component `CodeAnswer` của Tự luyện, **dùng lại nguyên** (import, không chép mã), cùng API `/api/practice/code/run|submit`. Nháp code giữ trong trình duyệt theo bài và ngôn ngữ để quay lại không mất.
- XP khi AC lần đầu theo độ khó, như Tự luyện code (server cấp, một lần).

Theo hệ thiết kế hiện có: token màu, `--accent` môn Tin từ `SubjectProvider`, song ngữ, không tràn ngang ở 375/768/1280px.

## Dữ liệu
- Bài HSG Tin là câu `code` (`usage = 'practice'`, `lesson_id` null, `status = 'published'`), `data` thêm `track: 'hsg'`, `problem_code`, `tags` (song ngữ, ≤ 8). Không cần migration bảng mới; thêm index trên `data->>'track'` nếu cần.
- `servableQuestion` (backend) chấp nhận thêm câu `code` đã công bố có `data.track = 'hsg'`, không cần nằm trong bài học. Mọi kiểm tra khác (đăng nhập, giới hạn tần suất, không rò test ẩn) giữ nguyên.
- API mới, công khai đọc:
  - `GET /api/hsg/problems?subject=informatics`: `[{ id, problem_code, title, tags, difficulty }]` (tên lấy dòng đầu của đề, như `problemTitle`).
  - `GET /api/hsg/problems/:id`: câu qua `toPublicPracticeQuestion` (đề, vào/ra, giới hạn, code mẫu, test mẫu; không test ẩn), kèm id bài trước/sau.

## Nội dung
- 16 bài Sàng nguyên tố thành câu `code`: đề song ngữ, đọc bàn phím/ghi màn hình (thay tệp `.INP/.OUT`, ghi rõ trong đề), giới hạn 1 giây / 256 MB.
- Ví dụ từ PDF, đã sửa 3 ví dụ sai (ISOPRIME, FREEPRIME, CPRIME); thêm 10–15 test ẩn mỗi bài sinh bằng lời giải đã kiểm, gồm test lớn theo ràng buộc PDF (N tới 10⁶, Aᵢ tới 10¹²).
- Lời giải mẫu chạy AC trên mọi test trước khi nạp.
- Môn Tin không dùng câu điền đáp án: đề trả lời ngắn "Luyện thi HSG Tin học: Sàng nguyên tố" đã bị xoá (19/10), 16 bài lập trình thay cho nó.

## Ngoài phạm vi
Danh sách bài nộp, bảng xếp hạng, kỳ thi có giờ, trạng thái "đã AC" trên danh sách (cần lưu kết quả, hiện Tự luyện không lưu), HSG môn khác ngoài thẻ đề.

## Kiểm thử
- Backend: `servableQuestion` nhận câu `track: 'hsg'` đã công bố, từ chối bản nháp; `/api/hsg/problems` không trả `tests`/`explanation` (tìm chuỗi đánh dấu trong JSON).
- Frontend: nhóm HSG chia môn và có thẻ "Luyện lập trình"; danh sách lọc được; trang bài render `CodeAnswer`; 375/768/1280px.
- Rủi ro: backend production phải có `JUDGE0_URL`/`JUDGE0_TOKEN` thì nút Chạy/Nộp mới chấm được (chưa kiểm được từ đây).
