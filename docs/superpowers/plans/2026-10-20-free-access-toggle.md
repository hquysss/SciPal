# Plan: công tắc "Mở miễn phí" (trừ AI)

Spec: `docs/superpowers/specs/2026-10-20-free-access-toggle-design.md`. Nhánh mới từ `origin/staging`: `feat/free-access-toggle`. Mỗi bước: test trước, rồi code.

1. **Migration** `supabase/migrations/20261020180000_free_access.sql`
   - `alter table site_settings add column if not exists free_access boolean not null default false`.
   - `create or replace function billing_get_effective_quotas` = thân hiện tại + `v_free` đọc từ `site_settings`, `quota_limit` = `2147483647` khi `v_free and l.metric in ('graded_exam_attempts','active_classes','students_per_class','import_files','active_authored_exams','code_submits','code_runs')`.
   - Đầu file ghi thứ tự áp và cách quay lại.
   - Test: `backend/src/__tests__/free-access-migration.test.ts` (kiểm văn bản: danh sách mở đúng, không chứa metric AI); ca PGlite trong `supabase/tests/` cho hai trạng thái.
2. **Backend cài đặt** `backend/src/site/features.ts`, `backend/src/routes/siteSettings.ts`: thêm `free_access` vào cột đọc, `parsePatch`, `freeAccess` trong `SiteSettings`. Test trong `siteSettings` test hiện có.
3. **Video** `backend/src/routes/lessonVideos.ts`: `allowed` thêm `(user?.id && freeAccess)`; khách vẫn bị khóa. Test: bật + đăng nhập thì xem được, bật + khách thì khóa, tắt + tài khoản free thì khóa.
4. **Frontend**: `frontend/lib/siteSettings.ts` thêm `freeAccess`; `SiteSwitches.tsx` thêm công tắc; `MyPlan.tsx` hiện dòng thông báo và "Không giới hạn" khi hạn mức ≥ 2147483647 (Bảng giá giữ nguyên). Chỉ dùng class màu token.
5. **Kiểm tra**: `pnpm turbo typecheck`, `pnpm turbo test`, chạy ca PGlite. Cập nhật `PROJECT_STATE.md`.
6. **PR** vào `staging`, gắn nhãn cần người duyệt (tiền), không tự merge, không áp migration lên DB thật.

Ngoài phạm vi: mobile (chưa có màn hình gói), đổi giá/gói.
