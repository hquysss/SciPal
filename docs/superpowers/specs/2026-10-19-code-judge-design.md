# Chấm code kiểu OJ trong Tự luyện Tin học

Ngày 2026-10-19. Trạng thái: chờ duyệt.

## Mục tiêu

Ở môn Tin học, tab Tự luyện có thêm câu hỏi lập trình. Học sinh viết code ngay trên web hoặc tải file code lên, nộp, và server chạy với bộ test ẩn rồi trả về kết quả từng test như các trang OJ.

Giữ nguyên các nguyên tắc dự án: nội dung là dữ liệu (giáo viên soạn đề qua Studio, không sửa UI khi thêm đề), chấm và XP do server quyết định, test ẩn và đáp án không bao giờ xuống client.

## Đã chốt

- Bộ chạy code: Judge0 CE tự host trên một máy Linux riêng (backend production chạy Vercel serverless nên không đặt Judge0 cạnh nó được). Backend gọi Judge0 qua HTTPS có token (`JUDGE0_URL`, `JUDGE0_TOKEN`).
- Ngôn ngữ: Python và C++.
- Vị trí: dạng câu hỏi mới `code` trong Tự luyện của bài học, cùng tab với trắc nghiệm. Không có trang OJ riêng.
- Bố cục: đề nằm trên, editor và kết quả nằm dưới, một cột ở mọi cỡ màn hình.

## Dữ liệu

Thêm `code` vào `QUESTION_TYPES`. Chỉ dùng với `usage = 'practice'` (giống `writing`: `validateQuestionInput` từ chối, DB có ràng buộc chặn `exam`).

`data` của câu `code`:

| Trường | Ý nghĩa |
|---|---|
| `stem` | Đề song ngữ `{ en, vi }` |
| `input_spec`, `output_spec` | Mô tả vào/ra, song ngữ |
| `time_limit_ms` | 500–5000, mặc định 2000 |
| `memory_limit_mb` | 16–256, mặc định 128 |
| `starter` | Code mẫu `{ python?, cpp? }` |
| `tests` | Mảng `{ input, expected, sample, points }`, 1–25 test, mỗi `input`/`expected` ≤ 64 KB |
| `explanation` | Giải thích sau khi nộp, song ngữ, tuỳ chọn |

Quy tắc:
- Có ít nhất một test `sample = true` để học sinh thấy ví dụ.
- Tổng `points` của các test dùng để tính điểm phần trăm; `correct` chỉ khi mọi test đạt.
- `packages/types/src/question.ts` và `backend/src/schemas/questions.ts` giữ y hệt; thêm fixture dùng chung.

Phần học sinh nhìn thấy (`toPublicPracticeQuestion`): chỉ `stem`, `input_spec`, `output_spec`, giới hạn, `starter`, và test mẫu (`input`, `expected`). Test ẩn và `explanation` không xuống client cho tới khi nộp. Hàm vẫn dựng từng trường, không spread.

## Backend

Mới: `backend/src/judge/` gồm client Judge0, so sánh output, gộp kết quả. Cấu hình bằng biến môi trường `JUDGE0_URL` (và token nếu bật); thiếu biến thì hai route trả 503 "chưa bật chấm code".

- Hai route riêng (route `/api/practice/check` hiện có chỉ nhận body 8 KB và vẫn từ chối câu `code`):
  - `POST /api/practice/code/run` `{ question_id, language, source, stdin }`: chạy một lần với input tự nhập, trả stdout/stderr/trạng thái/thời gian. Không chấm.
  - `POST /api/practice/code/submit` `{ question_id, language, source }`: chạy toàn bộ test, trả `PracticeCheckResult` có thêm `code`:
    - `status` tổng: `AC | WA | TLE | MLE | RE | CE`.
    - Mỗi test: `{ verdict, time_ms, memory_kb }`. Test mẫu thêm output của học sinh và `expected`; test ẩn chỉ có verdict và thời gian. Lỗi biên dịch trả thông báo của trình biên dịch (cắt 2 KB).
    - `correct = true` khi mọi test `AC`.
  - Tự luyện hiện không cấp XP và không lưu kết quả; câu `code` giữ nguyên như vậy.
- So output: bỏ khoảng trắng cuối mỗi dòng và dòng trống cuối, còn lại so khớp chính xác.
- Giới hạn: bắt buộc đăng nhập để chạy và nộp; tối đa 64 KB code, 64 KB output; giới hạn tần suất theo người dùng (chạy thử 10 lần/phút, nộp 5 lần/phút) đếm bằng bảng `code_runs` trong database (bộ nhớ trong không dùng được trên serverless). Hàng đợi tải do Judge0 tự lo.
- Lỗi Judge0 (không với tới, quá hạn): trả lỗi tạm thời, không tính là sai.

## Giao diện

Trong `PracticeSection`, câu `code` hiển thị một cột:

1. **Đề**: đề, mô tả vào/ra, giới hạn thời gian/bộ nhớ, các ví dụ mẫu (input/output) ngay dưới đề. Chiều rộng đọc ≤ 75 ký tự mỗi dòng.
2. **Editor**: chọn Python/C++ (tab ngôn ngữ như `CodePanel`), vùng gõ code có số dòng, tô màu bằng `highlight.ts`, Tab thụt lề; nút "Tải file" nhận `.py`, `.cpp`, `.txt` (đọc phía trình duyệt bằng `FileReader`, đổ vào editor, giới hạn 64 KB); nút "Đặt lại code mẫu".
3. **Chạy thử**: ô input, nút "Chạy thử" (có thể điền sẵn input của test mẫu).
4. **Nộp bài** và **bảng kết quả**: tổng kết một dòng (ví dụ "7/10 test đạt"), rồi danh sách từng test, mỗi dòng có biểu tượng và chữ (không chỉ màu), thời gian, bộ nhớ. Test mẫu sai mở ra so sánh output.

Hành vi chung:
- Nháp code được giữ theo câu và ngôn ngữ khi chuyển câu hoặc tab, như trạng thái trả lời hiện có.
- Bảng trạng thái câu và nút "Nộp bài (n câu)" coi câu `code` là đã làm khi có code; nút nộp chung bỏ qua câu `code` (chấm code luôn bằng nút riêng, vì chậm và có giới hạn tần suất).
- Nút khoá và hiện tiến trình khi đang chấm; có thể bấm huỷ chờ, kết quả đến muộn cho bản code đã sửa bị bỏ (cùng cách với nhận xét AI).
- Chỉ dùng token màu sẵn có, `--accent` từ `SubjectProvider`. Vùng chạm ≥ 44px, focus rõ, `prefers-reduced-motion` tắt hiệu ứng. Song ngữ EN/VI cho mọi chữ.
- Khách chưa đăng nhập xem được đề và ví dụ, bấm chạy/nộp thì được mời đăng nhập.

## Soạn đề (Studio)

`QuestionEditor` thêm dạng "Lập trình" (chỉ Tự luyện): nhập đề song ngữ, mô tả vào/ra, giới hạn, code mẫu theo ngôn ngữ, bảng test (thêm/xoá dòng, đánh dấu test mẫu, điểm). Nút "Kiểm tra bộ test": giáo viên dán lời giải mẫu, server (`POST /api/practice/code/verify`, chỉ giáo viên/admin, nhận giới hạn và bộ test của bản nháp nên dùng được trước khi lưu) chạy toàn bộ test và báo test nào sai. Chỉ là công cụ cho giáo viên, không chặn việc lưu hay gửi duyệt.

## Triển khai và rủi ro

- Judge0 CE chạy bằng Docker compose (kèm Postgres, Redis) trên một VM Linux riêng, cgroup v1 (Judge0 1.13 chưa chạy trên cgroup v2, ghi trong hướng dẫn). Container `server` và `workers` cần `privileged`. Compose mẫu và hướng dẫn nằm ở `docs/ops/judge0/`.
- Judge0 phải với tới được từ Vercel nên đặt sau reverse proxy HTTPS; bắt buộc bật `AUTHN_TOKEN`, backend gửi header `X-Auth-Token`. Chỉ cổng 443 mở ra ngoài; sandbox tắt mạng cho code học sinh (`enable_network=false`, mặc định của Judge0).
- Vì mỗi lần nộp chờ Judge0 trong một request, route nộp đặt trần 25 test và tổng thời gian chờ 20 giây (giới hạn function Vercel của backend phải ≥ mức này, kiểm tra khi triển khai).
- Thứ tự: dựng Judge0 và kiểm tra, áp migration (thêm loại `code`, bảng `code_runs`), rồi deploy backend, rồi frontend.
- Rollback: tắt biến `JUDGE0_URL` thì câu `code` hiện "chưa bật chấm code", các loại câu khác không ảnh hưởng.

## Kiểm thử

- Thuần: so sánh output, gộp verdict, `toPublicPracticeQuestion` không rò test ẩn (kiểm tra bằng cách tìm chuỗi `expected` của test ẩn trong JSON trả về), schema và fixture hai bản giống nhau.
- Backend với Judge0 giả: AC/WA/TLE/RE/CE, lỗi tạm thời, giới hạn tần suất, đăng nhập bắt buộc, không cộng XP lần hai.
- Frontend: render câu `code`, tải file, giữ nháp, trạng thái chấm/huỷ, bố cục một cột không tràn ngang ở 375/768/1280px.
- Một test tích hợp chạy Judge0 thật, tự bỏ qua khi không có `JUDGE0_URL`.

## Ngoài phạm vi (làm sau nếu cần)

Bảng xếp hạng, nộp theo hạn/lớp, checker tuỳ biến (nhiều đáp án đúng), Java, trang danh sách OJ riêng, lịch sử nhiều lần nộp, nhập test hàng loạt từ `.zip`, nhập câu `code` từ Excel.
