# Plan: Gamification giai đoạn 2, streak và thói quen

Spec: `docs/superpowers/specs/2026-10-25-gamification-streak-habit-design.md` (đã duyệt 25/10, đồng ý cả A và B).
Nhánh: tiếp tục trên PR #250. Làm theo TDD.

**Áp migration lên database thật là bước cần bạn duyệt 🙋.** Backend mới đọc bảng và cột mới, nên phải áp migration trước khi deploy backend.

## Bước 1: Migration `20261025090000_study_days.sql`
- Tạo bảng `study_days(user_id uuid references profiles on delete cascade, day date, xp int not null default 0, freeze bool not null default false, primary key (user_id, day))`.
- Bật RLS. Policy chỉ cho học sinh `select` dòng của mình (`user_id = auth.uid()`). `revoke insert, update, delete ... from anon, authenticated`.
- Thêm cột `profiles.daily_goal_xp int not null default 20 check (daily_goal_xp in (20, 50, 100))` và `profiles.streak_freezes int not null default 0 check (streak_freezes between 0 and 2)`. Client không có quyền `update` hai cột này.
- Hàm `public.bump_study_day(p_user uuid, p_day date, p_xp int)` (security definer, chỉ cấp quyền cho `service_role`). Hàm upsert dòng của ngày, `xp = study_days.xp + p_xp`, và để `freeze = false` khi đó là ngày học thật. Dùng một câu lệnh nên không bị mất XP khi hai yêu cầu chạy song song.
- Điền dữ liệu cũ (điểm B): `insert into study_days select user_id, (created_at at time zone 'Asia/Ho_Chi_Minh')::date, sum(delta) from xp_log group by 1, 2 on conflict do nothing`.
- Test hợp đồng trong `backend/src/__tests__/study-days-migration.test.ts` (cùng kiểu `rls-migration.test.ts`): có revoke, có policy chỉ select, có check, có grant cho `service_role`.

## Bước 2: Ngày theo giờ Việt Nam
- Tạo `backend/src/streaks/vnDay.ts` với `vnDay(date)` trả về `YYYY-MM-DD` theo `Asia/Ho_Chi_Minh` (dùng `Intl.DateTimeFormat`), và `addDays(day, n)`.
- `touchStreak` dùng `vnDay` thay cho `toISOString().slice(0, 10)`.
- Test các mốc 23:59 / 00:01 giờ Việt Nam và 6:30 / 23:00 cùng một ngày.

## Bước 3: Logic thói quen thuần (`backend/src/streaks/habit.ts`)
- `currentStreak(days, today)`: đếm ngày liên tiếp (dòng `freeze` cũng tính), kết thúc ở hôm nay hoặc hôm qua.
- `longestStreak(days)`.
- `freezePlan(lastDay, today, freezes)`: trả về danh sách ngày cần lấp. Nếu khoảng nghỉ lớn hơn số lần đóng băng còn lại thì trả về rỗng.
- `freezesEarned(before, after)`: tính số lần đóng băng nhận được khi streak vượt qua bội số của 7, tối đa đến 2.
- Unit test cho mọi tiêu chí nghiệm thu về đóng băng.

## Bước 4: `touchStreak` ghi `study_days`
- Thêm tham số `xp` (mặc định 0). Truyền `delta` từ 4 chỗ đang ghi XP: `practice/record.ts`, `routes/exam.ts`, `routes/practiceCode.ts`, `routes/terms.ts`.
- Nếu ngày hôm nay chưa có dòng trong `study_days`:
  - Đọc ngày học gần nhất và `streak_freezes`.
  - Theo `freezePlan`, chèn các dòng `freeze` (`on conflict do nothing`) và trừ `streak_freezes`.
- Sau đó gọi `bump_study_day`, rồi cộng `freezesEarned` (tối đa 2).
- Một ngày cũ hơn ngày học gần nhất (đồng bộ offline muộn) chỉ cộng XP cho ngày đó, không tiêu lần đóng băng.
- Nếu một bước thất bại thì chỉ `log.warn`, giống cách xử lý streak hiện nay.
- Mở rộng test trong `__tests__/streaks.test.ts`.

## Bước 5: API `routes/habit.ts`
- `GET /api/me/habit` (`requireUser`): đọc `study_days` của người dùng (giới hạn 400 ngày gần nhất) và `profiles`. Trả về `{ streak, longest, today_xp, goal_xp, freezes, days }`, trong đó `days` là 35 ngày gần nhất.
- `PATCH /api/me/habit {goal_xp}`: chỉ nhận 20, 50 hoặc 100, giá trị khác trả về 400.
- Đăng ký trong `index.ts`. Thêm schema Zod `HabitSchema` vào `@scipal/types`.
- Viết test route.

## Bước 6: Badge theo streak chung (điểm A)
- Trong `routes/badges.ts`, `bestStreak` lấy từ `longestStreak(study_days)` thay cho `streaks.longest_streak`.
- Cập nhật test.

## Bước 7: Web
- Tạo `frontend/features/habit/habitApi.ts` và `useHabit()`.
- Tạo `DailyGoalRing`: vòng "Hôm nay X/Y XP", có `role="progressbar"`. Gắn vào đầu phần Tự luyện (cộng thêm XP của phiên từ giai đoạn 1) và vào trang Tiến trình. Hiệu ứng đạt mục tiêu hiện một lần mỗi ngày, ghi nhớ bằng `localStorage` `scipal:goal-done:<day>`.
- Tạo `StreakRiskBanner` cho trang chủ và trang Tiến trình. Banner hiện khi `today_xp === 0`, ngày học gần nhất là hôm qua và `streak ≥ 2`.
- `StreakCalendar` đọc `days`: màu ô theo XP, ngày đóng băng có ❄ và chữ. Bỏ `activeSubjectsOn`.
- Thêm phần chọn mục tiêu ngày (20/50/100) vào `AccountSettings`.
- Viết test cho các component.

## Bước 8: Kiểm tra
- Chạy `pnpm turbo typecheck`, `pnpm turbo test` và `pnpm turbo build`. Tắt mọi dev server trước khi build.
- Thử trên trình duyệt trang Tiến trình và Tự luyện. Nếu thiếu tài khoản thì dùng trang dựng tạm `/dev/progress-showcase`.
- Cập nhật `PROJECT_STATE.md` và ghi rõ migration CHƯA áp.
