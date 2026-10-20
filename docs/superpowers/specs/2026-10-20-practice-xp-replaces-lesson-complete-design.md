# XP theo câu Tự luyện, bỏ nút "Đánh dấu hoàn thành", Tự luyện và Thi thử dùng được offline

Ngày 20/10/2026 (bản 3: thêm Thi thử offline). Trạng thái: **đã duyệt 20/10/2026** (kèm mục 10b). Thay `2026-10-20-offline-completion-queue-design.md`.

## Vấn đề
1. `LessonCompletionBar` gọi `POST /api/score/lesson`, cộng 100 XP cho bất kỳ ai bấm, không kiểm tra đã học.
2. Tự luyện chấm ở server nhưng không lưu gì nên không có bằng chứng học.
3. Offline là tính năng cốt lõi: học sinh phải làm Tự luyện **và Thi thử** khi mất mạng, thấy kết quả ngay.

## Quyết định
1. **Bỏ nút và route** `POST /api/score/lesson`. Bỏ `LESSON_COMPLETE_XP`. XP của bài học chỉ đến từ câu Tự luyện.
2. **Chỉ câu trả lời đầu tiên của mỗi câu được tính XP.** Bảng `practice_attempts (user_id, question_id, correct, created_at)`, khoá chính `(user_id, question_id)`. Server chèn dòng với `on conflict do nothing`; chỉ khi chèn được **và** `correct` thì cộng XP. Lần sau không đổi gì.
3. **XP theo độ khó:** `PRACTICE_XP = {1: 10, 2: 15, 3: 25}`; `xp_log.reason = 'practice_ok:<question_id>'` với unique index `xp_log_practice_once_idx`; sau đó `touchStreak`.
4. **Câu hợp lệ:** đã xuất bản, `usage = 'practice'`, nằm trong quiz của một bài đã xuất bản, không phải `code` (đã có `code_ac`). Người xem trước (tác giả) không nhận XP. Khách không còn (đăng nhập là bắt buộc).
5. **Hoàn thành bài suy ra từ dữ liệu:** đúng-lần-đầu ≥ 80% số câu hợp lệ của bài → server ghi `progress` (`completed_at`, `score`). Bài không có câu nào: không XP, hiện "Chưa có bài tập".
6. **Phản hồi `/api/practice/check`** thêm `xp_earned` và `lesson_completed`.

## Offline (chủ dự án chốt: phản hồi ngay bằng đáp án trên máy)
7. **Gói offline.** `GET /api/practice/lessons/:lessonId/offline` (cần đăng nhập, `Cache-Control: no-store`) trả các câu của bài kèm thứ cần để chấm: `answer`, `items[].correct`, `answer_key`, `key_terms`, `sample_answer`, `explanation`, `difficulty`. Chỉ loại `mc`, `truefalse`, `short`, `writing`; không có `code` và câu HSG. Nút "Tải để học offline" tải gói này cùng các trang bài; lưu trong `localStorage` theo từng bài, người dùng đăng xuất thì xoá (ceiling: hạn mức localStorage ~5 MB, nếu đầy thì chuyển IndexedDB).
8. **Một nguồn chấm.** `checkPracticeAnswer`, `responseProblem`, `keyTermsUsed`, `normalize`, `normalizeShort` chuyển vào `packages/types/src/practiceGrading.ts` và bản sao y hệt `backend/src/schemas/practiceGrading.ts` (test so byte như `simulations.ts`). Server và máy dùng cùng hàm, nên kết quả offline khớp kết quả server.
9. **Làm offline.** Khi mất mạng (hoặc gọi API lỗi mạng) mà đã có gói của bài: chấm tại chỗ, hiện đúng/sai và lời giải ngay, gắn nhãn "kết quả tạm · chờ đồng bộ". Khoá **câu trả lời đầu tiên** của mỗi câu vào hàng đợi `{user_id, question_id, response, answered_at}`; làm lại tại chỗ vẫn thấy kết quả nhưng **không** thay câu đã khoá. Chưa có gói thì báo "Tải bài này khi có mạng để làm offline".
10. **Đồng bộ.** `POST /api/practice/sync {attempts: [≤ 100]}` (cần đăng nhập): với mỗi mục server tải câu, kiểm `responseProblem`, chấm, chèn `practice_attempts` (người đến trước thắng, kể cả khi đã làm online ở máy khác), cộng XP như mục 3, trả `[{question_id, correct, xp_earned, counted}]` và `lesson_completed`. Client thay kết quả tạm bằng kết quả server rồi xoá mục khỏi hàng đợi. Lỗi mạng/5xx/401 thì giữ; 404 (câu đã gỡ) thì bỏ. Chạy khi mở trang và khi có sự kiện `online`.
10b. **Làm offline tính như làm online tại lúc làm (chủ dự án chốt).** Server dùng thời điểm học sinh làm (`answered_at`, với bài thi là `finished_at`) chứ không dùng lúc đồng bộ: `practice_attempts.created_at`, `xp_log.created_at`, ngày streak (`touchStreak(..., now = answered_at)`), `exam_attempts.submitted_at`. Hàng đợi gửi theo thứ tự thời gian. Chặn giờ giả: thời điểm trong tương lai (quá 5 phút lệch đồng hồ) thì dùng giờ server; bài thi kẹp trong `[started_at, giờ server]`; câu Tự luyện không được sớm hơn lúc tải gói (server ghi lúc tải vào bảng `offline_downloads (user_id, lesson_id, downloaded_at)`), sớm hơn thì dùng lúc tải. Streak: ngày làm cũ hơn `last_active` thì không lùi streak; nếu đã online ngày sau trước khi đồng bộ ngày trước (hiếm, vì mở trang là đồng bộ trước) thì streak không được nối lại, chấp nhận.
11. **XP/streak tạm tính chỉ để hiển thị:** `PRACTICE_XP` theo độ khó của câu có trong gói; streak ước tính theo quy tắc ngày UTC của `touchStreak` (dùng lại `recordStreak`/`estimateStreak`). Không ghi dữ liệu XP cục bộ, không gửi lên server; server thay thế hoàn toàn.
12. **Không làm offline:** câu `code` (Judge0) và các bài HSG lập trình, nhận xét AI cho câu `writing` (nút bị vô hiệu), Giáo sư AI.
13. **Bất biến #4 sửa lần 2:** "Đáp án không xuống client, ngoại lệ duy nhất: gói offline do học sinh đã đăng nhập tải chủ động, dùng để chấm hiển thị tạm; XP, streak, badge, tiến độ chính thức luôn do server quyết định theo câu trả lời đầu tiên nhận được." Cập nhật `AGENTS.md` và `.agents/rules/02-domain-rules.md`.

## Thi thử offline (chủ dự án chốt: mọi đề, kể cả đề giáo viên giao cho lớp)
14. **Tải đề = bắt đầu một phiên thi.** Nút "Tải đề để thi offline" gọi `POST /api/exam/:blueprintId/attempts` (có sẵn: giữ một lượt trong hạn mức gói, trả `attempt_id`), rồi `GET /api/exam/attempts/:attemptId/offline` (mới, cần đăng nhập, `no-store`). Route này chỉ trả đề khi phiên **thuộc người gọi và còn `started`**, kèm đủ thứ để chấm (`answer`, `items[].correct`, `answer_key`, `key_terms`…) cùng `format`, `layout`, `summary`. Như vậy không tải được đáp án đề nào mà không tiêu một lượt thi, và hạn mức được giữ lúc còn mạng chứ không phải lúc đồng bộ.
15. **Chấm dùng chung.** `scoreExam`, `isCorrectAnswer` và các hàm phụ thuộc chuyển vào `packages/types/src/examScoring.ts` kèm bản sao y hệt ở backend (test so byte). `ExamRunner` chạy từ gói offline: đồng hồ giờ làm bài ở máy như hiện nay, chấm tại chỗ, hiện điểm và đúng/sai từng câu ngay, gắn nhãn "kết quả tạm · chờ đồng bộ"; XP tạm tính `correct_count × 15` chỉ để xem.
16. **Hàng đợi bài thi** `{user_id, attempt_id, blueprint_id, answers, finished_at}` cùng kho với hàng đợi câu Tự luyện. Đồng bộ bằng **route sẵn có `POST /api/score/exam`** (đã bất biến theo `attempt_id`: nộp lại trả kết quả đã lưu, không cộng XP hay lượt thi thêm): server chấm lại và là nguồn duy nhất của điểm, lượt thi và XP (một lần mỗi đề). Kết quả server thay kết quả tạm. Lỗi mạng/5xx/401 giữ; 404 (đề bị gỡ) thì bỏ và báo cho học sinh.
17. **Phiên dở dang:** bài đang làm offline lưu vào `localStorage` mỗi khi đổi đáp án (theo `attempt_id`) để mở lại không mất; một phiên chỉ có một lần nộp.
18. **Service worker:** `/exam` đang nằm trong `NOT_KEPT` của `public/sw.js`. Chuyển trang đề thi (không chứa dữ liệu cá nhân, đề lấy từ gói) thành trang được giữ lại để mở được khi mất mạng; kiểm tra khi làm rằng HTML của `/exam/<id>` không nhúng dữ liệu riêng của người dùng, nếu có thì tách ra.
19. **Đề giao lớp:** tải và thi offline như mọi đề. Giáo viên không thấy dấu hiệu "làm offline" (chủ dự án đã chọn không đánh dấu).

## Rủi ro đã chấp nhận
Đáp án nằm trên thiết bị của học sinh đã tải bài hoặc đề: ai mở DevTools đọc được rồi nộp câu đúng. Với Thi thử, kể cả đề giáo viên giao cho lớp, điểm nộp lên có thể là điểm "biết trước đáp án" và giáo viên không phân biệt được. Trắc nghiệm 4 lựa chọn không che được. Giảm thiểu hiện có: chỉ người đã đăng nhập tải, đề chỉ tải được khi tiêu một lượt thi (gắn với phiên thi), chỉ bài đã chọn tải, gói không gồm câu lập trình/HSG, XP một lần mỗi câu. Chưa làm (làm khi thấy lạm dụng): trần XP Tự luyện mỗi ngày, đánh dấu bài thi làm offline cho giáo viên, thời lượng tối thiểu của phiên thi, hoặc đánh dấu tài khoản có tốc độ làm bài bất thường.

## Thay đổi so với phần offline đã commit (`80f589b`)
- Hàng đợi hoàn thành bài (`pendingCompletions`) thành hàng đợi câu trả lời: mục là câu trả lời chứ không phải bài; giữ `recordStreak`, `estimateStreak`, logic phát lại. `PendingSync` gửi `/api/practice/sync`.
- Xoá `LessonCompletionBar`, `LESSON_COMPLETE_XP` (types + bản sao backend + test so byte), `postScoreLesson`, route `score.ts` và test của nó.

## Thay đổi
- Migration: bảng `practice_attempts` (RLS bật, chỉ backend ghi), unique index `xp_log_practice_once_idx`, bảng `offline_downloads` (RLS bật, chỉ backend ghi).
- Backend: `practiceGrading.ts` và `examScoring.ts` (bản sao), `routes/practice.ts` (check ghi attempt + XP + progress, route `offline`, route `sync`), `routes/exam.ts` (route `attempts/:id/offline`, dùng `examScoring` chung), xoá `routes/score.ts` (chỉ route `/api/score/lesson`; `/api/score/exam` giữ).
- Frontend: `packages/types/src/practiceGrading.ts` và `examScoring.ts`; `ExamRunner`/`ExamStart` (tải đề, chạy offline, nhãn tạm, lưu dở dang); `public/sw.js` bỏ `/exam` khỏi `NOT_KEPT`; `PracticeSection` (chế độ offline, nhãn kết quả tạm, XP, hoàn thành); `SaveOfflineButton`/`saveOffline.ts` tải gói; xoá `LessonCompletionBar` và chỗ gắn ở trang bài.
- Chuỗi EN/VI, token màu sẵn có.

## Kiểm thử
- `practiceGrading`: các test chấm hiện có chuyển sang nguồn chung; bản sao backend khớp byte.
- Backend: lần đầu đúng → XP + streak; lần đầu sai rồi đúng → 0 XP; gọi lặp/song song không cộng đôi; tác giả xem trước không XP; câu `code` không vào gói/sync; sync nhiều mục, mục trùng người-đến-trước, mục lỗi định dạng bị từ chối từng mục; đạt 80% → `progress` ghi một lần; sync ghi XP/streak theo `answered_at` (làm hôm qua, đồng bộ hôm nay → streak tính hôm qua), giờ tương lai hoặc sớm hơn lúc tải gói bị kẹp; gói không có câu code/HSG và không lộ khi chưa đăng nhập.
- Frontend: offline có gói → kết quả ngay + nhãn tạm, câu đầu bị khoá, làm lại không đổi hàng đợi; offline không gói → thông báo; online lại → đồng bộ, kết quả server thay kết quả tạm, XP hiện theo server; `writing` AI bị vô hiệu offline.
- Thi thử: route `offline` từ chối phiên của người khác, phiên đã nộp và người chưa đăng nhập; không trả đáp án khi chưa có phiên; chấm chung `examScoring` khớp bản backend; offline chấm tại chỗ + hàng đợi; `POST /api/score/exam` phát lại không cộng đôi XP/lượt thi; 404 bỏ mục; phiên dở dang mở lại còn đáp án.
- Kiểm tay bằng Browser ở bản production build: tải bài và đề, tắt mạng, làm Tự luyện và thi, bật mạng, thấy XP và điểm theo server.

## Thứ tự triển khai
Áp migration, rồi deploy backend, rồi frontend; tăng `VERSION` của `sw.js` lên `v3` (cả `cacheNames.ts`). Frontend cũ gọi `/api/score/lesson` sẽ nhận 404 tới khi tải lại.

## Ngoài phạm vi
Bảng xếp hạng, thu hồi XP đã cấp, XP cho `writing`/`code` trong bài, mobile (MMKV), tải tự động bài/đề kế tiếp, background sync API, bài HSG lập trình offline, phòng thi có giám sát.
