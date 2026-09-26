# Level Theming — Giai đoạn 5: Giáo viên/admin, bật dark mode

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (hoặc subagent-driven-development). Checkbox `- [ ]` để theo dõi.

**Goal:** 17 file khu vực giáo viên/admin (và 2 trang dev còn lại) về 0 màu thô → baseline rỗng; bật `DARK_MODE_ENABLED` sau khi kiểm sáng/tối toàn app. Chỉ giao diện.

**Spec:** `docs/superpowers/specs/2026-09-26-app-wide-level-theming-design.md` §4.4, §7 giai đoạn 5.

**Phụ thuộc:** giai đoạn 4 đã merge (baseline chỉ còn các file dưới đây).

**Cách làm, ràng buộc, bảng đổi màu:** giống hệt `docs/superpowers/plans/2026-09-26-level-theming-phase4-personal.md` (mục "Cách làm mỗi task", "Ràng buộc", "Bảng đổi màu"). Bổ sung cho giai đoạn này:

| Trạng thái bài (`lessons.status`) | Hiển thị |
|---|---|
| `draft` | `<Badge variant="secondary">Bản nháp / Draft</Badge>` |
| `pending_review` (hoặc tên trạng thái chờ duyệt đang dùng trong code) | `<Badge variant="warning">Chờ duyệt / In review</Badge>` |
| `published` | `<Badge variant="success">Đã xuất bản / Published</Badge>` |
| `rejected` | `<Badge variant="destructive">Bị từ chối / Rejected</Badge>` |

Đặt ánh xạ này một chỗ: `features/authoring/lessonStatusBadge.tsx` export `LessonStatusBadge({ status })`, **có test** (`lessonStatusBadge.test.tsx`: mỗi trạng thái đúng variant + nhãn song ngữ; trạng thái lạ → `secondary` với chính giá trị status làm nhãn). Đọc tên trạng thái thật từ `packages/types` / migration `lessons.status` trước khi viết.

`font-mono` được phép cho **mã mời lớp** (giá trị giống mã) và nội dung khối code; không cho nhãn/số khác.

---

### Task 1: Admin — cổng quyền và quản lý tài khoản

**Files:** `features/admin/RequireAdmin.tsx` (22), `features/admin/AdminAccountsPage.tsx` (238)

- [ ] `RequireAdmin`: trạng thái đang xác minh → chữ `text-ink-muted` trong `role="status"`; không có quyền → `Alert tone="danger"` + link về trang chủ (`buttonVariants({ variant: 'outline' })`). Test hiện có `RequireAdmin.test.tsx` phải vẫn qua.
- [ ] `AdminAccountsPage`: form tạo tài khoản dùng `Field` + `Input` (select giữ `<select>` native với class của `Input`); danh sách tài khoản dùng `Table` (`label` song ngữ); vai trò bằng `Badge` (học sinh `secondary`, giáo viên `outline`, admin `default`); nút đổi vai trò `outline`; nút xoá `destructive` (giữ bước xác nhận hiện có); thông báo lưu/lỗi bằng `Alert`.
- [ ] Kiểm `/admin/accounts` (tài khoản admin nếu có Supabase; nếu không, kiểm trạng thái "không có quyền"): 375px bảng cuộn trong khung. Baseline sạch 2 file. Commit `feat(web): admin accounts on theme tokens and table primitive`.

### Task 2: Studio soạn bài

**Files:** `app/teacher/lessons/page.tsx` (81), `app/teacher/lessons/new-lesson/page.tsx` (19), `app/teacher/lessons/[id]/page.tsx` (16), `features/authoring/LessonCreateForm.tsx` (49), `features/authoring/BlockPalette.tsx` (72), `features/authoring/LessonEditor.tsx` (200); tạo `features/authoring/lessonStatusBadge.tsx` (+ test)

- [ ] Viết `LessonStatusBadge` + test trước (xem bảng trên), rồi dùng ở danh sách bài.
- [ ] Danh sách bài (`app/teacher/lessons/page.tsx`): `Table` hoặc danh sách `Card` (giữ bố cục hiện có); nút "Tạo bài" `Button`; rỗng → `EmptyState` có nút tạo bài.
- [ ] `LessonCreateForm`: mọi trường dùng `Field` + `Input`/select; lỗi validate hiện qua `error` của `Field` (đã có `aria-describedby`).
- [ ] `BlockPalette`: 7 nút thêm khối `Button variant="outline"` với icon `lucide-react` + nhãn song ngữ, `min-h-11`; bỏ màu riêng từng loại khối (loại khối phân biệt bằng icon + chữ).
- [ ] `LessonEditor`: cột soạn dùng `Card`, textarea theo class `Input` (`min-h-[7rem]`); nút di chuyển/xoá khối `Button size="icon" variant="ghost"` với `aria-label` song ngữ. **Cột xem trước** bọc `<LevelScope level={levelOfGrade(grade)}>` + `<SubjectProvider slug=… accentColor=…>` và dùng `styles.sheet` từ `components/blocks/notebook.module.css`, để xem trước giống hệt trang bài học sinh (giai đoạn 3). Khoá khi chờ duyệt: `Alert tone="warning"` giải thích lý do.
- [ ] Hai trang `new-lesson` và `[id]`: bỏ nền lưới/glow, breadcrumb song ngữ.
- [ ] Kiểm: tạo bài, thêm đủ 7 loại khối, xem trước đổi tông khi đổi lớp (5 → 10); 375px không tràn. Baseline sạch 6 file. Commit `feat(web): lesson studio on theme tokens with a notebook preview`.

### Task 3: Hàng chờ duyệt

**Files:** `app/admin/lessons/review/page.tsx` (56)

- [ ] Mỗi bài chờ duyệt: `Card` + `LessonStatusBadge`; nút Duyệt `Button`, Từ chối `Button variant="destructive"`; ô lý do từ chối `Field` + textarea; kết quả `Alert`; rỗng `EmptyState` "Không có bài chờ duyệt".
- [ ] Kiểm với admin hoặc trạng thái rỗng. Baseline sạch. Commit `feat(web): review queue on theme tokens`.

### Task 4: Lớp học

**Files:** `app/teacher/classes/page.tsx` (18), `app/teacher/classes/[id]/page.tsx` (13), `features/classes/ClassList.tsx` (55), `StudentRoster.tsx` (68), `CreateClassModal.tsx` (59), `JoinClassModal.tsx` (40)

- [ ] `ClassList`: mỗi lớp `Card`; mã mời `font-mono text-lg text-ink` + nút sao chép `Button variant="outline"` với phản hồi "Đã sao chép / Copied" trong `aria-live="polite"`.
- [ ] `StudentRoster`: `Table` (tên, XP, bài đã học), số canh phải `tabular-nums`; nút giao bài `Button`; rỗng `EmptyState` "Chưa có học sinh — chia sẻ mã mời".
- [ ] `CreateClassModal`, `JoinClassModal`: nền mờ theo bảng; hộp `bg-surface border-line rounded-xl`; `role="dialog" aria-modal="true" aria-labelledby`; Escape đóng; ô mã mời `Input` với `inputMode="text" autoCapitalize="characters" maxLength={6}`; lỗi qua `Field error`.
- [ ] Hai trang `classes` và `classes/[id]`: bỏ nền lưới/glow, breadcrumb song ngữ.
- [ ] Kiểm: tạo lớp, sao chép mã, mở modal tham gia bằng bàn phím. Baseline sạch 6 file. Commit `feat(web): class management on theme tokens`.

### Task 5: Dọn phần còn lại → baseline rỗng

- [ ] `app/dev/landing-showcase/page.tsx` (3) và mọi file còn trong baseline: đổi theo bảng.
- [ ] Cập nhật baseline → `frontend/theme-baseline.json` là `{}`.
- [ ] Trong `frontend/lib/theme/rawColors.test.ts`, thêm case: `expect(Object.keys(baseline)).toEqual([])` với thông báo "Baseline must stay empty after phase 5" — từ đây mọi màu thô mới đều fail.
- [ ] Grep `bg-science-grid|bg-science-dots|glass-panel|glow-accent` trong `frontend/app frontend/features frontend/components`; nếu 0 kết quả thì xoá các class đó khỏi `frontend/app/globals.css`.
- [ ] Commit `chore(web): empty raw colour baseline and drop legacy texture classes`.

### Task 6: Bật dark mode

- [ ] Grep mã hex/`rgba(` trong `frontend/**/*.module.css` và `frontend/app/login/login.css`. Mỗi màu **hiển thị** (không phải `#000` trong `mask-image`) đổi sang token hoặc `color-mix` của token; màu nằm trong khối `[data-app-shell][data-theme='dark'] …` của login đã có thì giữ nếu đọc tốt khi kiểm.
- [ ] Đổi `frontend/lib/theme/shellTheme.ts`: `export const DARK_MODE_ENABLED = true;`. Không cần sửa chỗ khác: `renderThemeCss` sinh khối `prefers-color-scheme`, script boot đọc `scipal-theme`, `ThemeToggle` hiện ở navbar, Profile, login.
- [ ] Monaco (`components/blocks/CodeRenderer.tsx`): theme `vs-dark` khi thẻ bao đang tối — đọc `getShell()?.dataset.theme` và `matchMedia('(prefers-color-scheme: dark)')` trong effect, không gắn gì lên `<html>`.
- [ ] Kiểm trình duyệt ở **Tối** cho từng tuyến, ở cấp trung tính + một cấp bất kỳ, 375px và desktop: `/`, cổng chọn cấp, `/login`, `/informatics`, một bài học, `/glossary`, `/profile`, `/progress`, `/exam`, phòng thi, `/teacher/lessons`, soạn bài, `/teacher/classes`, `/admin/accounts`, `/admin/lessons/review`, `/khong-ton-tai`, `/dev/theme`. Tìm: chữ tối trên nền tối, ô trắng sót lại, viền mất, focus không thấy, SVG minh hoạ/hoạ tiết. Sửa từng chỗ bằng token.
- [ ] Chuyển Theo hệ thống ↔ Sáng ↔ Tối, tải lại: không nháy; `document.documentElement` không có `data-theme`/`.dark`.
- [ ] `pnpm turbo typecheck`, `pnpm turbo test`, `pnpm turbo build` — xanh.
- [ ] Commit `feat(web): enable dark mode across the app`.

### Task 7: Tài liệu

- [ ] Spec §4.4: ghi "Cờ đã bật ngày …"; `DESIGN.md`: mục sáng/tối và quy tắc trạng thái bài; `PROJECT_STATE.md`: một dòng Recent Decisions "giao diện theo cấp học hoàn tất, dark mode bật", gỡ các mục giao diện khỏi Next Steps. Commit `docs: level theming complete, dark mode on`.
