# Hàng đợi hoàn thành bài khi mất mạng (E4, web)

Ngày 20/10/2026. Trạng thái: **đã duyệt, đã làm (chưa kiểm tra bằng trình duyệt)**. Nối tiếp §11 và E4 của `2026-09-22-scipal-foundation-design.md`.

## Hiện trạng
- Đã có: service worker `public/sw.js`, nút "Tải để học offline", trang `/offline`, `OfflineBanner`. Bài đã tải đọc được khi mất mạng.
- Thiếu: bấm "Đánh dấu hoàn thành" khi mất mạng chỉ báo lỗi, tiến độ mất.
- Việc ghi duy nhất cần mạng mà học sinh làm được từ bài đã tải là **hoàn thành bài** (`POST /api/score/lesson`). Tự luyện, ôn từ, thi đều do server chấm nên vẫn cần mạng, không nằm trong phạm vi.

## Quyết định
1. **Không đổi backend.** `/api/score/lesson` đã bất biến theo (user, lesson): lần gửi thứ hai trả `xp_earned: 0`, không cộng lại. Gửi lại khi retry hoặc từ hai thiết bị không gây cộng XP đôi, nên **không thêm `idempotency_key`** (spec gốc dự kiến, nhưng không cần).
2. **Hàng đợi ở trình duyệt**, mỗi mục chỉ gồm `{ user_id, lesson_id, queued_at }`. Không lưu token: khi phát lại dùng phiên hiện tại.
3. **Chỉ xếp hàng khi lỗi mạng** (`navigator.onLine === false` hoặc `fetch` ném `TypeError`). Lỗi HTTP (4xx/5xx) vẫn hiện lỗi như cũ, không xếp hàng.
4. **Phát lại** khi trang mở và khi sự kiện `online`, tuần tự, chỉ mục của người đang đăng nhập. Thành công hoặc `404` (bài đã gỡ) → xoá mục. Lỗi mạng/5xx → giữ, thử lại lần sau. `401` → giữ (chờ đăng nhập lại).
5. **XP và streak tạm tính, chỉ để hiển thị** (yêu cầu 20/10; badge thì không). §11 spec gốc cho phép "tiến độ cục bộ đang chờ đồng bộ", nhưng bất biến #4 cấm client tự tính XP/streak, nên giới hạn như sau:
   - Chỉ hiện, gắn nhãn "tạm tính · chờ đồng bộ" (dấu `~`, màu `--warning`); không ghi vào dữ liệu XP/profile cục bộ, không gửi lên server.
   - XP: hằng `LESSON_COMPLETE_XP = 100` đặt trong `@scipal/types`, `backend/src/routes/score.ts` dùng chính hằng này (hết số 100 nằm rời hai nơi).
   - Streak: lưu `{streak, last_day}` từ lần phản hồi server gần nhất; hiển thị `streak` (cùng ngày), `streak + 1` (hôm qua), `1` (cách ≥ 2 ngày) theo quy tắc ngày của `touchStreak` (plan phải đối chiếu múi giờ với bản server). Chưa từng có phản hồi thì chỉ hiện XP.
   - Khi đồng bộ xong, số của server **thay hoàn toàn** số tạm; nếu khác (ví dụ bài đã hoàn thành ở máy khác → 0 XP) thì thông báo theo server.
   - **Cần bạn xác nhận:** nới bất biến #4 thành "client không bao giờ *ghi/cấp* XP, streak; chỉ được *hiển thị ước tính có nhãn*", và cập nhật `AGENTS.md` + `.agents/rules/02-domain-rules.md` khi làm.
6. **Lưu bằng `localStorage`**, không phải IndexedDB như E4 ghi. Lý do: vài mục nhỏ, đồng bộ, không cần thư viện. Trần: khoảng 5 MB, đủ cho hàng nghìn mục; nếu sau này thêm loại sự kiện lớn hơn thì chuyển IndexedDB.
7. Đang offline mà `getSession()` không trả phiên (token hết hạn, chưa làm mới được) → không biết `user_id`, không xếp hàng, hiện "Cần mạng một lần để xác nhận đăng nhập". Hiện code chuyển sang `/login` — sửa để không đẩy người dùng đang offline sang trang cần mạng.

## Thay đổi
- `frontend/lib/pwa/pendingCompletions.ts`: `queueCompletion`, `pendingFor(userId)`, `flushCompletions(post)` (hàm thuần, nhận `post` để test).
- `frontend/features/lessons/LessonCompletionBar.tsx`: nhánh xếp hàng + thông báo trạng thái chờ.
- `frontend/components/pwa/`: hook phát lại gắn cạnh `OfflineBanner` (banner hiện số bài đang chờ).
- Thêm chuỗi EN/VI; dùng token sẵn có.

## Kiểm thử
- Unit: xếp hàng/loại trùng, phát lại thành công, 404 xoá mục, mạng lỗi giữ mục, chỉ phát cho đúng `user_id`.
- Component: offline → báo "đã lưu trên máy"; HTTP 500 → vẫn báo lỗi, không xếp hàng.
- `pnpm turbo typecheck`; kiểm tay bằng Browser: tắt mạng, bấm hoàn thành, bật mạng, thấy XP.

## Ngoài phạm vi
Mobile (MMKV), Tự luyện/thi offline, tải tự động bài kế tiếp, background sync API (Safari không hỗ trợ), giải quyết xung đột (server luôn thắng).
