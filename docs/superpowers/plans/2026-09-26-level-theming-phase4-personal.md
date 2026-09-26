# Level Theming — Giai đoạn 4: Khu vực cá nhân (hồ sơ, tiến trình, thi thử, khảo sát)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (hoặc subagent-driven-development). Checkbox `- [ ]` để theo dõi.

**Goal:** 16 file khu vực cá nhân về 0 màu thô, song ngữ, vùng chạm 44px. Chỉ giao diện — không đổi API/logic.

**Spec:** `docs/superpowers/specs/2026-09-26-app-wide-level-theming-design.md` §7 giai đoạn 4. Bảng màu: `packages/ui/src/theme/palettes.ts`.

**Cách làm mỗi task:** đổi class theo **Bảng đổi màu** (dưới) + ghi chú riêng của file → cập nhật baseline → `pnpm --filter @scipal/web test` (ratchet phải báo file đó biến khỏi baseline) → `pnpm turbo typecheck` → kiểm trình duyệt → commit. Test mới chỉ viết cho logic có trạng thái (ghi trong task).

## Ràng buộc (giữ nguyên từ giai đoạn 0–3)

- Không gắn theme/level lên `:root`/`<html>`; không opacity modifier với token (`bg-action/50`) — dùng `bg-[color-mix(in_srgb,var(--x)_N%,transparent)]`; không cú pháp Tailwind v4.
- Accent môn chỉ là nhãn: chữ `text-accent-ink`, nền nhạt `bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface))]`; không nền accent đặc + chữ trắng.
- Song ngữ qua `useLanguage().t({ en, vi })`; không `font-mono`/IN HOA cho nhãn và số; không "→" trong nút; không emoji thay biểu tượng (dùng `lucide-react` + `aria-hidden`).
- Ưu tiên primitive có sẵn trong `frontend/components/ui/`: `Button`/`buttonVariants`, `Card`, `Badge`, `Progress`, `Input`, `Field`, `Alert`, `EmptyState`, `Table`.
- Màu không phải kênh duy nhất cho trạng thái: luôn kèm chữ hoặc biểu tượng.
- File được test import dùng import tương đối.
- Baseline: Bash `UPDATE_THEME_BASELINE=1 pnpm --filter @scipal/web test -- lib/theme/rawColors`; PowerShell `$env:UPDATE_THEME_BASELINE='1'; pnpm --filter @scipal/web test -- lib/theme/rawColors; Remove-Item Env:UPDATE_THEME_BASELINE`.

## Bảng đổi màu

| Class thô | Token |
|---|---|
| `text-gray-950/900/800` | `text-ink` |
| `text-gray-700…400` | `text-ink-muted` |
| `bg-white…` | `bg-surface` |
| `bg-gray-50/100`, `bg-emerald-50/100` | `bg-surface-sunken` |
| viền thẻ, vạch chia | `border-line` |
| viền ô nhập, nút viền | `border-edge` |
| `focus:border-* focus:ring-*` | `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus` |
| nút chính (`bg-emerald-*`, `style` accent) | `bg-action text-action-ink hover:bg-action-hover` |
| chữ nhấn (`text-emerald-600…800`) | `text-action` |
| `text-red-*`, `bg-red-50`, `border-red-*` | `text-danger`, `bg-danger-surface`, `border-[color-mix(in_srgb,var(--danger)_30%,transparent)]` |
| `text-green-*`/`bg-green-50` (kết quả đúng) | `text-success`, `bg-success-surface` |
| `text-amber-*`/`bg-amber-50` (cảnh báo) | `text-warning`, `bg-warning-surface` |
| nền mờ modal (`bg-black/50`, `bg-gray-950/60`) | `bg-[color-mix(in_srgb,var(--ink)_60%,transparent)]` |
| `bg-science-grid`, glow/gradient trang trí | xoá (nền trang đã có hoạ tiết) |
| mọi `dark:…`, `shadow-*` trang trí, `backdrop-blur-*` | xoá |

---

### Task 1: Hồ sơ

**Files:** `app/profile/page.tsx` (7), `features/profile/ProfileCard.tsx` (106), `features/profile/AccountSettings.tsx` (93), `features/profile/EducationLevelSetting.tsx` (52), `app/dev/profile-level-showcase/page.tsx` (3)

- [ ] `app/profile/page.tsx`: bỏ `bg-science-grid`; breadcrumb song ngữ (tách component client nhỏ nếu cần, giống `GlossaryHeader` ở giai đoạn 3).
- [ ] `ProfileCard`: số liệu (XP, bài đã học, chuỗi) dùng `text-ink` cỡ lớn + nhãn `text-ink-muted`; bỏ `font-mono`; avatar dự phòng nền `bg-surface-sunken text-ink`. Vai trò hiển thị bằng `Badge` (`secondary` học sinh, `outline` giáo viên, `default` admin).
- [ ] `AccountSettings`: bỏ nhãn `PROFILE` mono/IN HOA ở header; khung `Card`; nút đăng xuất `buttonVariants({ variant: 'destructive' })`; các ô nhãn IN HOA (`uppercase tracking-wider`) đổi thành `text-sm font-semibold text-ink-muted`.
- [ ] `EducationLevelSetting`: lựa chọn cấp là nhóm radio/nút `aria-pressed` với `min-h-11`; đang chọn `bg-action text-action-ink`; trạng thái lưu: `saved` → `Alert tone="success"`, `error` → `Alert tone="danger"`; mỗi lựa chọn có chấm/nhãn tên cấp, không chỉ màu.
- [ ] Trang dev showcase: đổi 3 chỗ theo bảng.
- [ ] Kiểm trình duyệt `/profile` (tài khoản thử nếu có Supabase, nếu không thì `/dev/profile-level-showcase`): EN/VI, 375px, đổi cấp → navbar đổi màu. Baseline không còn 5 file trên. Commit `feat(web): profile on theme tokens`.

### Task 2: Tiến trình

**Files:** `app/progress/page.tsx` (27), `features/progress/BadgeWall.tsx` (17), `features/progress/StreakCalendar.tsx` (16)

- [ ] `app/progress/page.tsx`: bỏ nền lưới/glow; tiêu đề, breadcrumb song ngữ; thẻ thống kê dùng `Card`; thanh tiến độ theo môn dùng `Progress` bọc trong `SubjectProvider` của môn đó, indicator `className="bg-accent"` (thanh tiến độ là chỗ accent được phép).
- [ ] `StreakCalendar` (heatmap): tách hàm thuần `streakCellClass(count: number): string` vào cùng file và **viết test** `features/progress/StreakCalendar.test.ts`:
  - `0` → `bg-surface-sunken`
  - `1` → `bg-[color-mix(in_srgb,var(--action)_30%,var(--surface))]`
  - `2–3` → `bg-[color-mix(in_srgb,var(--action)_60%,var(--surface))]`
  - `≥4` → `bg-action`
  - số âm/NaN → như `0`.
  Mỗi ô có `title` và `aria-label` song ngữ nêu ngày + số bài (màu không là kênh duy nhất); thêm chú giải "Ít → Nhiều" bằng chữ.
- [ ] `BadgeWall`: huy hiệu đã mở `bg-surface border-line text-ink`, chưa mở `bg-surface-sunken text-ink-muted` + chữ "Chưa mở khoá / Locked" (không chỉ làm mờ).
- [ ] Kiểm `/progress` (hoặc trạng thái lỗi/rỗng khi không có Supabase): EN/VI, 375px. Baseline sạch 3 file. Commit `feat(web): progress, streak calendar and badges on theme tokens`.

### Task 3: Thi thử

**Files:** `app/exam/page.tsx` (49), `features/exam/ExamListNotices.tsx` (8), `app/exam/[blueprintId]/page.tsx` (34), `features/exam/ExamRunner.tsx` (140), `features/exam/AnswerPalette.tsx` (44)

- [ ] Danh sách đề (`app/exam/page.tsx`, `ExamListNotices`): mỗi đề là `Card` có link cả thẻ (`min-h-11`, focus nhìn thấy); thông tin (số câu, thời gian) chữ `text-ink-muted`, không mono; trạng thái rỗng dùng `EmptyState`; lỗi dùng `LoadErrorNotice`.
- [ ] Phòng thi (`app/exam/[blueprintId]/page.tsx`): giữ `data-pattern="off"`; bỏ `bg-science-grid`.
- [ ] `ExamRunner` — đồng hồ: tách hàm thuần `timerTone(secondsLeft: number): 'normal' | 'warning' | 'danger'` và **viết test** `features/exam/ExamRunner.test.ts`: `> 300` → `normal`, `61–300` → `warning`, `≤ 60` → `danger`. Class: `normal` `bg-surface text-ink border-line`; `warning` `bg-warning-surface text-warning`; `danger` `bg-danger-surface text-danger`. Khi chuyển sang `warning` hiện thêm chữ "Còn dưới 5 phút / Under 5 minutes left" trong vùng `aria-live="polite"` (không chỉ đổi màu). Không đổi logic tự nộp.
- [ ] `ExamRunner` — câu hỏi: lựa chọn là radio thật trong `fieldset`/`legend`, `min-h-11`, chọn → `border-action bg-[color-mix(in_srgb,var(--action)_10%,var(--surface))]`. Kết quả sau nộp: điểm lớn `text-ink`; câu đúng `text-success` + `CircleCheck`, câu sai `text-danger` + `CircleX` (theo dữ liệu server trả về như hiện tại).
- [ ] `AnswerPalette`: ô đã trả lời `bg-action text-action-ink`; ô đang xem `outline outline-2 outline-offset-2 outline-focus`; ô chưa trả lời `border border-edge bg-surface text-ink`; ô `min-h-11 min-w-11`; `aria-label` song ngữ "Câu 3, đã trả lời"; chú giải ba trạng thái bằng chữ.
- [ ] Kiểm: `/exam`, vào một đề (nếu có dữ liệu), rút đồng hồ bằng cách tạm đặt `durationMinutes` nhỏ (không commit) để xem `warning`/`danger`; 375px bảng câu hỏi không tràn. Baseline sạch 5 file. Commit `feat(web): exam list, room, timer and answer palette on theme tokens`.

### Task 4: Khảo sát

**Files:** `features/survey/DemandPollBanner.tsx` (29), `FeatureRequestBoard.tsx` (78), `PostLessonSurvey.tsx` (64), `SubjectDemandModal.tsx` (102)

- [ ] `PostLessonSurvey`: đánh giá sao là nhóm radio (`role="radiogroup"`, mỗi sao `role="radio"` + `aria-checked` + `aria-label` "3 trên 5 sao"), sao đã chọn `text-action` (fill `currentColor`), chưa chọn `text-edge`; chip độ khó `aria-pressed`, `min-h-11`; nút gửi `Button`; kết quả `Alert` success/danger.
- [ ] `SubjectDemandModal`: nền mờ theo bảng; hộp `bg-surface border-line rounded-xl`; `role="dialog" aria-modal="true" aria-labelledby`; Escape đóng (giữ nếu đã có); lựa chọn môn: ô icon theo quy tắc nhãn accent (bọc `data-subject-scope` + `style={{ '--accent': … }}` như `SubjectSwitcher`), chọn → `border-action`.
- [ ] `DemandPollBanner`: `Card` với nút `Button`; bỏ gradient/emoji.
- [ ] `FeatureRequestBoard`: ô nhập `Input`/`Field`; nút bình chọn `aria-pressed` + số phiếu bằng chữ; đã bình chọn `bg-action text-action-ink`; danh sách rỗng `EmptyState`.
- [ ] Kiểm: hoàn thành một bài để thấy khảo sát; mở modal từ banner trang chủ; Tab qua toàn bộ, Escape đóng modal. Baseline sạch 4 file. Commit `feat(web): surveys on theme tokens with accessible rating and dialog`.

### Task 5: Nghiệm thu

- [ ] `pnpm turbo typecheck` (7/7), `pnpm turbo test`, `pnpm turbo build` — xanh.
- [ ] `frontend/theme-baseline.json` không còn file nào dưới `app/profile`, `app/progress`, `app/exam`, `features/profile`, `features/progress`, `features/exam`, `features/survey`, `app/dev/profile-level-showcase`.
- [ ] `PROJECT_STATE.md`: một dòng "Recent Decisions" cho giai đoạn 4; `DESIGN.md`: thêm quy tắc heatmap (4 mức `action`), đồng hồ thi (3 mức + chữ), bảng câu hỏi (3 trạng thái + chú giải). Commit `docs: record level theming phase 4 completion`.
