# Bắt buộc đăng nhập, trừ trang công khai

Ngày 20/10/2026. Trạng thái: **chờ duyệt**. Thay cơ chế khách dùng thử 30 phút (spec `2026-09-30` về guest trials).

## Mục tiêu
Người chưa đăng nhập chỉ xem được trang giới thiệu và bảng giá; muốn dùng tính năng nào cũng phải có tài khoản. Hết tình trạng khách dùng thử, hỏi Giáo sư một câu rồi bỏ đi.

## Quyết định
1. **Trang công khai** (`routeAccess` → `public`): `/`, `/login`, `/reset-password`, `/auth`, `/pricing`, `/help`, `/privacy`, `/terms`, `/newsletter`, `/offline`, `/feature-off`. `/maintenance` vẫn nằm ngoài luồng này (middleware rewrite khi bảo trì). `/dev` giữ như cũ (chỉ khi `NODE_ENV=development`).
2. **Mọi đường khác** (`/subjects`, môn học, bài học, `/glossary`, `/exam`, `/lab`, `/feedback`, `/tutor`, `/review`, các trang vốn đã `account`) cần đăng nhập. Khách bị chuyển tới `/login?redirect=<đường vừa mở>` (đã có sẵn); đăng nhập xong quay lại đúng trang.
3. **Bỏ loại `trial`** khỏi `RouteAccess` và `TrialFeature`. `routeAccess` chỉ trả `public` hoặc `account`.
4. **Xoá cơ chế dùng thử** (không còn đường chạy tới):
   - `middleware.ts`: hàm `guestTrial`, `rememberTrials`, `visitorIp`, `subjectExists` và bộ nhớ đệm tên môn (chỉ phục vụ trial), cờ `reason=trial`, đọc công tắc site chỉ để xét trial. Giữ: bảo trì, công tắc tính năng admin (`featureVisible`), kiểm tra vai trò teacher/admin.
   - `lib/guestTrial.ts` rút còn `routeAccess` (đổi tên file thành `lib/routeAccess.ts`); xoá chữ ký HMAC, cookie, `FEATURE_NAME`, `trialRenewable`, `TRIAL_*` và test tương ứng. Cập nhật import ở `routeAccess.test.ts`.
   - Giao diện: xoá `GuestTrialBanner`, `TrialEndedNote` (và chỗ gắn ở `app/layout.tsx`, `app/login/page.tsx`, bỏ `reason=trial` mở sẵn tab đăng ký), `GuestTutor`, `useGuestTutor`, `features/guest/guest.test.tsx`.
   - `/tutor`: chỉ còn Giáo sư dành cho tài khoản (trang vì thế nằm sau đăng nhập). `AiTutorPanel` bỏ prop `guest`; không đăng nhập thì hiện lời mời đăng nhập như nhánh sẵn có. `TutorSession` bỏ `useGuestTutor`.
   - Landing (`LandingTutor`): nút Giáo sư nổi vẫn hiện cho khách, mở panel mời đăng nhập thay vì hỏi 1 câu.
   - Backend: xoá `routes/guest.ts` (+ đăng ký trong `index.ts`, `guest-trials.test.ts`), nhánh khách của `/api/tutor` (`GUEST_TUTOR_DAILY_CAP`), và khoá `guest_trial` trong `backend/src/site/features.ts`, `lib/siteSettings.ts`, `SiteSwitches.tsx`, `siteSettings.test.ts`. Migration cũ và bảng dữ liệu khách giữ nguyên (không xoá dữ liệu); thêm migration bỏ khoá `guest_trial` khỏi `site_settings` nếu lưu dưới dạng dòng dữ liệu (kiểm tra khi làm).
5. **Giữ nguyên:** landing mở cho mọi người, cổng chọn cấp học của khách bằng `sessionStorage`, bảng giá, `/help`, trang pháp lý. Nhánh lưu thuật ngữ trong trình duyệt của khách ở `savedTerms.ts` giữ phần chuyển lên server khi đăng nhập (người đã có dữ liệu cũ), bỏ chỗ chỉ phục vụ khách nếu không còn chạy tới.
6. **Đánh đổi:** bài học và từ điển không còn lập chỉ mục công khai hay xem qua link chia sẻ khi chưa đăng nhập; link vẫn dẫn qua đăng nhập rồi quay lại đúng trang.

## Kiểm thử
- `routeAccess`: các đường công khai ở mục 1 là `public`; `/subjects`, `/informatics`, `/informatics/bai-1`, `/glossary`, `/exam`, `/lab`, `/feedback`, `/tutor`, `/helpful`, `/feedback-extra` là `account`.
- `middleware.test.ts`: khách mở `/glossary` hay một bài → redirect `/login?redirect=…`; khách mở `/`, `/pricing`, `/help` → qua; người đã đăng nhập → qua; bảo trì và công tắc tính năng vẫn hoạt động.
- Backend: test `/api/tutor` không còn nhánh khách (khách → 401).
- `pnpm turbo typecheck`, test frontend và backend liên quan; kiểm tay bằng trình duyệt ở trạng thái chưa đăng nhập.

## Thứ tự triển khai
Deploy backend và frontend cùng nhịp; frontend cũ còn gọi `/api/guest/trial` hay tutor khách sẽ nhận lỗi, nhưng middleware mới chặn các trang đó trước. Tăng `VERSION` của `sw.js` lên `v2` để thiết bị đã cache bài học cho khách không còn mở được trang cũ khi offline.

## Ngoài phạm vi
Đổi nội dung landing, giá, hay cho phép xem thử có điều kiện trở lại; xoá dữ liệu khách cũ trong DB.
