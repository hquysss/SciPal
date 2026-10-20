# Công tắc "Mở miễn phí" (trừ AI) — spec

Trạng thái: **đã duyệt 20/10** (ba câu vùng xám theo đề xuất). Thay đổi liên quan tiền: PR cần người duyệt merge.

## Mục tiêu
Admin bật một công tắc ở `/admin/site`. Khi bật, mọi tài khoản **đã đăng nhập** (học sinh, giáo viên) dùng các tính năng trả phí **không gọi AI** mà không cần gói. Mọi lời gọi AI vẫn theo gói và hạn mức hiện tại. Tắt là trở lại như cũ ngay, không mất dữ liệu đếm.

## Hiện trạng (đã khảo sát)
- Mọi hạn mức theo gói đi qua một hàm SQL: `billing_get_effective_quotas` (bản mới nhất ở `20260929000000_tutor_daily_quota.sql`). Hai nơi dùng nó để từ chối:
  - `billing_reserve_quota` (lượt đếm theo ngày/tháng: thi, nhập tệp, chấm code, Giáo sư…).
  - `billing_capacity_limit` → trigger `billing_enforce_capacity` (lớp, học sinh/lớp, đề tự soạn).
- Video bài học khóa riêng bằng `site_settings.lesson_videos_access` (`plus`|`free`) trong `backend/src/routes/lessonVideos.ts`.
- `site_settings` đã có cột cờ (`signup_enabled`, `maintenance`, `lesson_videos_access`); admin sửa qua `PATCH /api/admin/site-settings` (`backend/src/routes/siteSettings.ts`), giao diện `frontend/features/admin-site/SiteSwitches.tsx`.

## Phân loại tính năng đang khóa theo gói

| Tính năng | Chỗ khóa | Gọi AI? | Khi bật công tắc |
|---|---|---|---|
| Giáo sư AI (chat) | `tutor_tokens` | Có | Giữ hạn mức |
| Giáo sư giọng nói | `voice_minutes` | Có | Giữ hạn mức |
| AI soạn nháp bài học | `author_ai_requests` | Có | Giữ hạn mức |
| Nhận xét bài viết, tra từ/dịch bằng AI, khách hỏi thử | quota Giáo sư / giới hạn riêng | Có | Giữ nguyên |
| Lượt thi chấm điểm | `graded_exam_attempts` | Không (chấm ở server) | **Mở** |
| Lớp đang hoạt động, học sinh/lớp, đề tự soạn | `active_classes`, `students_per_class`, `active_authored_exams` (trigger) | Không | **Mở** |
| Nhập tệp nội dung/đề | `import_files` | Không (parse JSON) | **Mở** |
| Video bài học | `lesson_videos_access` + gói Plus | Không | **Mở** |
| Nộp bài / chạy thử code (Judge0) | `code_submits`, `code_runs` | Không, nhưng tốn máy Judge0 | **Vùng xám** (xem câu hỏi 1) |

Không đổi: vai trò (học sinh không thành giáo viên), trần hằng ngày toàn site do admin đặt cho Judge0 (`judge_settings`) và giới hạn mỗi phút, hạn mức riêng admin đặt cho từng tài khoản đối với AI.

## Thiết kế
1. **Cột mới** `site_settings.free_access boolean not null default false` (migration chỉ thêm).
2. **Một chỗ quyết định:** migration thay `billing_get_effective_quotas` (chép thân hiện tại, thêm một nhánh): khi `free_access` bật và metric thuộc danh sách mở, `quota_limit = 2147483647`. Danh sách mở ghi rõ từng metric; metric mới thêm sau này mặc định **không** mở (an toàn về chi phí). Lượt dùng vẫn được đếm như thường, nên `billing_reserve_quota`, trigger sức chứa và trang "Gói của tôi" tự theo mà không sửa từng route.
3. **Video:** `lessonVideos.ts` mở video khi `free_access` bật **và người xem đã đăng nhập** (`admin || mode === 'free' || (user && (freeAccess || hasPlus))`). Không tái dùng chế độ `lesson_videos_access = 'free'` vì chế độ đó mở cho cả khách.
   - Khách chưa đăng nhập không được gì thêm: các lượt đếm (thi, nhập tệp, chấm code) và sức chứa vốn đã yêu cầu đăng nhập vì hạn mức gắn với tài khoản.
4. **Backend cài đặt:** `siteSettings.ts` đọc/ghi `free_access`; `SiteSettings` thêm `freeAccess`. Chỉ admin ghi (đã có `requireAdmin`).
5. **Client không tự mở khóa:** `/admin/site` thêm công tắc "Mở miễn phí (trừ AI)". "Gói của tôi" hiện "Không giới hạn" cho hạn mức đã mở và một dòng "SciPal đang mở miễn phí…", suy ra từ hạn mức server trả về (không cần đọc thêm cờ). Bảng giá giữ nguyên, vẫn cho mua gói.

## Câu hỏi cần chốt
1. **Chấm code / chạy thử** (Judge0, không AI nhưng tốn máy): đề xuất **mở** hạn mức theo gói, vẫn giữ trần hằng ngày toàn site của admin. Đồng ý?
2. **Công cụ giáo viên** (lớp, học sinh/lớp, đề tự soạn, nhập tệp): đề xuất **mở**. Lớp/đề tạo ra lúc miễn phí vẫn giữ khi tắt công tắc (chỉ chặn thêm mới, như quy tắc sức chứa hiện nay). Đồng ý?
3. **Thanh toán khi đang miễn phí:** đề xuất vẫn cho mua gói (không ẩn Bảng giá), chỉ thêm dòng thông báo. Đồng ý?

## Kiểm thử
- Backend vitest: `siteSettings` đọc/ghi `free_access` (admin được, người khác 403); `lessonVideos` trả video cho tài khoản đăng nhập không có Plus khi bật, vẫn khóa với khách khi bật, khóa khi tắt; kiểm văn bản migration (chỉ mở đúng các metric không AI, AI không có trong danh sách).
- SQL qua PGlite (`supabase/tests/check-sql.mjs`, thêm ca): khi tắt, học sinh free bị từ chối lượt thi thứ N+1; khi bật, được; `tutor_tokens` vẫn bị từ chối ở cả hai trạng thái; trigger lớp cho thêm lớp khi bật.
- `pnpm turbo typecheck` và `pnpm turbo test` qua.

## Triển khai và quay lại
- Thứ tự: người duyệt áp migration **trước** (cột mặc định `false`, hàm cư xử y như cũ khi tắt, nên backend cũ vẫn chạy), rồi mới deploy backend + frontend (backend mới chọn cột `free_access`, thiếu cột sẽ lỗi). Agent **không** áp lên DB thật.
- Quay lại: tắt công tắc. Gỡ hẳn: áp lại thân hàm cũ và `drop column free_access`.
