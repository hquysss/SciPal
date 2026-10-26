# Trang Gamification: từ danh sách thành "sảnh chơi"

Trạng thái: chờ duyệt. Chỉ giao diện, không đổi backend, không migration.

## Hiện tại
`/games` chỉ là tiêu đề + hai lưới thẻ giống hệt nhau (icon tay cầm, tên, nhãn loại). Không thấy cấp, XP, streak, thử thách hay huy hiệu dù đã có đủ dữ liệu từ 4 giai đoạn trước.

## Làm gì
1. **Hero "hồ sơ người chơi"** ở đầu trang: cấp + thanh XP tới cấp sau (`levelOfXp`, `useTotalXp`), chuỗi ngày + vòng mục tiêu hôm nay (`useHabit`, `DailyGoalRing`), số đóng băng. Nền màu ấm, số to, có hiệu ứng đếm khi vào trang (tôn trọng reduced-motion).
2. **Hàng lối tắt** 3 ô: Thử thách tuần (số đang chạy/chờ trả lời), Bảng xếp hạng, Huy hiệu (đã mở/tổng). Mỗi ô dẫn tới chỗ có sẵn (`/progress#...`, `/community`).
3. **Thẻ game có cá tính theo loại**: mỗi loại (quiz, ghép cặp, ô chữ, wordwall) có màu token, hình minh hoạ nhỏ bằng icon lớn + hoạ tiết nền (ô lưới cho ô chữ, chấm nối cho ghép cặp...), nhãn thời gian, nút "Chơi" rõ. Hover nhấc nhẹ.
4. **Lọc theo loại** (chip: Tất cả / Đố vui / Ghép cặp / Ô chữ / Wordwall), giữ hai nhóm "Game của lớp em" và "Chơi một mình".
5. **Trạng thái trống đẹp hơn**: minh hoạ + gợi ý "tạo ô chữ từ một bài học" cho giáo viên/admin.

Tuân thủ: màu qua token (`--sun`, `--coral`, `--sky`, `--action`...), song ngữ, chạm 44px, ổn ở 375px, chế độ tối.

## Câu hỏi
- **A.** Hero lấy từ dữ liệu có sẵn (cấp, XP, streak, mục tiêu). Có muốn thêm "kỷ lục cá nhân" mỗi game trên thẻ không? Cái đó cần backend trả điểm cao nhất, nên đề xuất **để sau**.
- **B.** Phong cách: **vui, nhiều màu kiểu sảnh game** (đề xuất, hợp học sinh) hay **gọn, tối giản** như trang Tiến trình?

## Ngoài phạm vi
Đổi màn chơi từng game, kỷ lục/bảng điểm theo game, game mới.
