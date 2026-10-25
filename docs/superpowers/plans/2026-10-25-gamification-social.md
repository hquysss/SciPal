# Plan: Gamification giai đoạn 4, cạnh tranh và xã hội

Spec: `docs/superpowers/specs/2026-10-25-gamification-social-design.md`.
Plan này giả định C và D theo đề xuất: bảng toàn hệ thống mặc định ẩn tên, và có badge thắng thử thách. **Nếu bạn chốt khác, chỉ cần đổi bước 1 và bước 6.**
Nhánh: tiếp tục trên PR #250. Làm theo TDD.

**Thứ tự áp migration** (cần bạn duyệt 🙋):
1. `20261025090000_study_days.sql`
2. `20261025100000_learning_badges.sql`
3. `20261025110000_social.sql`

Cả 3 phải áp trước khi deploy backend.

## Bước 1: Migration `20261025110000_social.sql`
- Thêm cột:
  - `profiles.leaderboard_public bool not null default false`.
  - `classes.leaderboard_enabled bool not null default true`.
  - Client không có quyền ghi hai cột này. Cột của `profiles` không nằm trong quyền ghi theo cột của client; với `classes`, kiểm tra lại các quyền đang có.
- Bảng `challenges`:
  - Cột: `id uuid pk`, `challenger`, `opponent` (references profiles, on delete cascade), `status text check (status in ('pending','active','declined','done'))`, `starts_on date`, `ends_on date`, `winner uuid null`, `created_at`.
  - `check (challenger <> opponent)`.
  - Unique index một phần trên cặp người (thứ tự a/b như `friendships`) khi `status in ('pending','active')`.
  - Bật RLS. Chỉ có policy `select` cho người tham gia. `revoke insert, update, delete` khỏi anon và authenticated.
- `create or replace function public.xp_leaderboard(p_weekly boolean)`: giữ nguyên chữ ký. Tên được hiện khi `p.leaderboard_public` bật hoặc khi đó là chính người xem; trường hợp còn lại trả `display_name` là null, và web hiện "Học sinh #hạng".
- Hai hàm `security definer`:
  - `friends_leaderboard(p_weekly)`: chính mình và bạn có `status = 'accepted'`.
  - `class_leaderboard(p_class uuid, p_weekly)`: trả rỗng nếu người gọi không phải thành viên hoặc giáo viên của lớp, hoặc lớp đã tắt bảng.
  - Cả hai trả về `(rank, display_name, xp, is_me)` và dùng cùng mốc tuần với `xp_leaderboard`. Cấp quyền `execute` cho authenticated.
- Badge `challenge_win_1` và `challenge_win_5` (category `community`, condition `challenge_wins`).
- Test hợp đồng `backend/src/__tests__/social-migration.test.ts`: có revoke, chỉ có policy select, có check, `xp_leaderboard` ẩn tên khi `leaderboard_public` tắt, hàm lớp có kiểm tra quyền thành viên.

## Bước 2: Cài đặt quyền riêng tư
- `GET/PATCH /api/me/privacy {leaderboard_public}`: chỉ nhận giá trị boolean, viết test.
- Trong `AccountSettings` thêm công tắc "Hiện tên trên bảng xếp hạng toàn hệ thống", kèm một dòng giải thích.
- Giáo viên: `PATCH /api/classes/:id {leaderboard_enabled}` (chỉ chủ lớp), và thêm công tắc ở trang lớp.

## Bước 3: Logic thử thách thuần (`backend/src/challenges/challenge.ts`)
- `challengeWindow(acceptedAt)`: trả về `{ starts_on: ngày hôm sau theo giờ Việt Nam, ends_on: starts_on + 6 }`.
- `challengeScore(days, window)`: tổng `xp` trong khoảng ngày, không tính dòng `freeze`.
- `settle(a, b)`: trả về người thắng, hoặc null nếu hoà.
- Unit test.

## Bước 4: API thử thách (`routes/challenges.ts`)
- `POST /api/challenges {opponent}`:
  - Trả 403 nếu hai người chưa là bạn đã chấp nhận.
  - Trả 409 nếu cặp này đã có thử thách đang chờ hoặc đang diễn ra (dựa vào unique index), hoặc người gửi đã có 3 thử thách đang diễn ra.
  - Gửi thông báo cho đối thủ qua `notifyUsers`.
- `POST /api/challenges/:id/accept` và `/decline`: chỉ đối thủ được gọi, và chỉ khi trạng thái là `pending`. Khi chấp nhận thì đặt `starts_on`/`ends_on` và báo cho người thách đấu.
- `GET /api/challenges`: danh sách thử thách của mình, kèm XP hiện tại của hai bên từ `study_days`. Thử thách đã qua `ends_on` thì được chốt ngay tại đây: `update ... where status = 'active'` để chỉ chốt một lần, ghi `winner`, gọi `awardBadges` cho cả hai bên (không hiện màn mở khoá), và báo kết quả cho hai bên.
- Đăng ký trong `index.ts`. Test với `fakeDb`: 403, 409, chốt đúng một lần, hoà.

## Bước 5: Bảng xếp hạng 3 tab (web)
- `progressQueries` lấy thêm bảng bạn bè và danh sách lớp đã tham gia. Bảng lớp được tải khi người dùng chọn lớp.
- `Leaderboard`:
  - Thêm tab Bạn bè / Lớp / Toàn hệ thống (`role="tablist"`, có phím mũi tên), giữ chế độ Tuần này / Mọi lúc.
  - Tab mặc định theo spec.
  - Hàng có `display_name` null thì hiện "Học sinh #hạng", không có avatar.
  - Thêm một dòng giải thích ẩn tên trên tab Toàn hệ thống.
- Viết test.

## Bước 6: Thử thách (web) và badge
- Tạo `frontend/features/challenges/challengesApi.ts` và `ChallengeCard` cho trang Tiến trình:
  - Thử thách đang chờ có nút Chấp nhận / Từ chối.
  - Thử thách đang diễn ra có hai thanh XP và số ngày còn lại.
  - Thử thách đã xong hiện người thắng hoặc hoà.
- Thêm nút "Thách đấu" cạnh từng bạn trong danh sách bạn bè (trang cộng đồng).
- `badges/evaluate.ts`: thêm `challenge_wins` vào `BadgeStats` và `COUNTED`. `award.ts` đếm số dòng `challenges` có `winner` là người dùng.
- Viết test.

## Bước 7: Kiểm tra
- Chạy `pnpm turbo typecheck` và `pnpm turbo test`.
- Build bằng `next build` sau khi tắt dev server và xoá `.next`.
- Xem trên trình duyệt `/dev/progress-showcase`, có thêm dữ liệu mẫu cho các tab và thẻ thử thách.
- Cập nhật `PROJECT_STATE.md`, ghi thứ tự 3 migration CHƯA áp.
