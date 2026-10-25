# Gamification giai đoạn 4: cạnh tranh và xã hội

Ngày: 25/10/2026 · Trạng thái: chờ duyệt · Phạm vi: backend, 1 migration bổ sung, web

## Hiện trạng

- Trang Tiến trình có bảng xếp hạng **toàn hệ thống** (`xp_leaderboard`, top 10, theo tuần hoặc mọi lúc, tuần tính theo giờ Việt Nam) và danh hiệu "Thủ khoa tuần".
- Bảng này hiện **tên thật (`display_name`) của mọi học sinh** cho bất kỳ ai đã đăng nhập, và học sinh không có cách nào ẩn tên. Người dùng của SciPal là học sinh từ lớp 1 đến lớp 12, phần lớn chưa thành niên, nên đây là vấn đề quyền riêng tư cần sửa trước khi làm thêm tính năng cạnh tranh.
- Đã có sẵn: bạn bè (`friendships`, chấp nhận hoặc từ chối), lớp học (giáo viên tạo, học sinh tham gia, giáo viên xem `total_xp` trong danh sách lớp), thông báo trong app và email (`backend/src/notify.ts`).
- Chưa có: bảng xếp hạng giữa bạn bè, bảng xếp hạng lớp cho học sinh xem, thử thách giữa hai người.

## Mục tiêu

Cạnh tranh trong nhóm nhỏ, nơi học sinh biết nhau (bạn bè, lớp), thay vì chỉ có một bảng toàn hệ thống. Đồng thời không lộ tên trẻ em cho người lạ.

## Giải pháp

1. **Quyền riêng tư trên bảng toàn hệ thống.** Thêm cột `profiles.leaderboard_public`, nhận true hoặc false, mặc định theo điểm C bên dưới. `xp_leaderboard` hiện tên thật chỉ khi cột này bật hoặc khi đó là chính người xem. Những người còn lại hiện "Học sinh #<hạng>" và không có avatar. Học sinh đổi cột này trong Cài đặt qua backend, vì cột này không nằm trong quyền ghi của client trên `profiles`.
2. **Bảng xếp hạng có 3 tab: Bạn bè, Lớp, Toàn hệ thống**, mỗi tab có chế độ Tuần này và Mọi lúc. Tab mặc định là Bạn bè; nếu chưa có bạn thì mở tab Lớp, chưa có lớp thì mở tab Toàn hệ thống.
   - **Bạn bè:** gồm chính mình và các bạn đã chấp nhận. Hiện tên thật, vì hai bên đã đồng ý làm bạn.
   - **Lớp:** chọn một lớp đã tham gia. Chỉ thành viên của lớp và giáo viên xem được. Giáo viên tắt được bảng này cho lớp bằng cột `classes.leaderboard_enabled`, mặc định bật.
   - Hai bảng mới tính XP từ `xp_log` theo cùng mốc tuần với bảng hiện có. Dữ liệu lấy qua hàm SQL `security definer` (giống `xp_leaderboard`), trong hàm kiểm tra quyền.
3. **Thử thách tuần giữa hai bạn.** Học sinh gửi lời thách đấu tới một bạn đã chấp nhận: ai kiếm nhiều XP hơn trong 7 ngày (theo giờ Việt Nam), tính từ ngày hôm sau ngày bạn kia chấp nhận.
   - Bảng `challenges`: `id`, `challenger`, `opponent`, `status` (pending / active / declined / done), `starts_on`, `ends_on`, `created_at`.
   - Học sinh chỉ đọc được thử thách mình tham gia, và chỉ backend ghi bảng này.
   - Mỗi cặp chỉ có tối đa 1 thử thách đang chờ hoặc đang diễn ra. Mỗi người có tối đa 3 thử thách đang diễn ra cùng lúc.
   - XP của mỗi bên là tổng `study_days.xp` trong khoảng ngày của thử thách, nên phụ thuộc migration giai đoạn 2.
   - Kết quả được chốt khi có người mở thử thách sau ngày `ends_on`. Không cần cron.
   - Hai bên nhận thông báo trong app khi được thách đấu, khi bạn kia chấp nhận và khi có kết quả.
   - Web có thẻ "Thử thách" ở trang Tiến trình: hai thanh XP, số ngày còn lại, nút Chấp nhận / Từ chối, và nút "Thách đấu" cạnh từng bạn trong danh sách bạn bè.
4. **Badge thắng thử thách** (theo điểm D): thêm loại điều kiện `challenge_wins` và hai badge `challenge_win_1`, `challenge_win_5`. Badge được trao qua `awardBadges` khi kết quả được chốt.

## Ràng buộc

- Server quyết định thứ hạng, kết quả thử thách và badge (bất biến #4). Client không ghi các bảng mới.
- Không hiện tên thật của học sinh cho người lạ khi học sinh chưa bật hiện tên. Avatar cũng theo cùng quy tắc.
- Chữ song ngữ, màu chỉ dùng token, vùng chạm 44px, tab có hỗ trợ bàn phím.
- Migration chỉ bổ sung: bảng `challenges`, hai cột mới, hàm SQL mới, và sửa `xp_leaderboard` bằng `create or replace` (giữ nguyên chữ ký hàm).

## Ngoài phạm vi

Giải đấu theo hạng (Đồng, Bạc, Vàng… thăng hạng và xuống hạng mỗi tuần), thử thách nhóm hoặc giữa các lớp, chat, phần thưởng ngoài badge.

## Cần chốt

- **C.** Bảng toàn hệ thống **mặc định ẩn tên** (`leaderboard_public = false`, học sinh tự bật nếu muốn hiện tên)? Đề xuất: **có**, vì phần lớn người dùng chưa thành niên. Hệ quả: bảng toàn hệ thống hiện tại sẽ thành gần như ẩn danh hết.
- **D.** Có badge cho thử thách (`challenge_win_1`, `challenge_win_5`) không? Đề xuất: **có**. Phần này nhỏ và dùng lại `awardBadges`.

## Tiêu chí nghiệm thu

- [ ] Học sinh A chưa bật hiện tên: B (không phải bạn của A) thấy A trên bảng toàn hệ thống là "Học sinh #3". A vẫn thấy tên mình. Bạn của A thấy tên A ở tab Bạn bè.
- [ ] Tab Bạn bè chỉ gồm mình và bạn đã chấp nhận. Lời mời đang chờ không được tính.
- [ ] Gọi bảng xếp hạng của một lớp mình không tham gia thì không trả về dữ liệu. Giáo viên tắt bảng của lớp thì học sinh không thấy tab Lớp cho lớp đó.
- [ ] Thách đấu người chưa là bạn thì bị trả về 403. Tạo thử thách thứ 2 cho cùng một cặp thì bị trả về 409. Người thứ 4 vượt giới hạn 3 thử thách thì bị trả về 409.
- [ ] Thử thách 7 ngày: XP mỗi bên khớp tổng `study_days` trong khoảng ngày. Sau `ends_on`, lần mở đầu tiên chốt kết quả đúng một lần, tính cả trường hợp hoà. Badge được trao cho người thắng.
- [ ] Thông báo trong app được gửi ở 3 thời điểm: được thách đấu, bạn kia chấp nhận, có kết quả.
- [ ] Client không ghi được `challenges`, `leaderboard_public` hay `leaderboard_enabled` (có test hợp đồng migration).
- [ ] `pnpm turbo typecheck`, `test`, `build` đạt. Đã thử bằng trình duyệt trang Tiến trình (dùng trang dựng tạm nếu thiếu tài khoản).

## Rủi ro

- Hàm xếp hạng cộng dồn `xp_log` mỗi lần gọi; bây giờ có thêm bảng bạn bè và bảng lớp. Nếu chậm thì cần một bảng tổng XP theo tuần, nhưng không làm sẵn.
- Điểm C làm thay đổi bảng toàn hệ thống mà người dùng đang thấy. Cần một dòng giải thích ngắn ngay trên bảng.
