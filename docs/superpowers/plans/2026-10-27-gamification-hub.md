# Plan: sảnh Gamification

Spec: `docs/superpowers/specs/2026-10-27-gamification-hub-design.md`. Đã chốt: kỷ lục cá nhân để sau, phong cách vui nhiều màu. Chỉ web, không backend.

1. **`features/games/PlayerHero.tsx`**: cấp + thanh XP (`useTotalXp`, `levelOfXp`), streak + `DailyGoalRing` + đóng băng (`useHabit`). Số đếm lên (tắt khi reduced-motion). Ẩn phần nào chưa có dữ liệu. Test: hiện đúng cấp/XP/streak, khách không thấy hero.
2. **`features/games/HubShortcuts.tsx`**: 3 ô dẫn tới `/progress#challenges`, `#leaderboard`, `#badges` (thêm `id` + `scroll-mt` cho 3 khối trong `ProgressView`). Số trên ô: thử thách đang chạy/chờ (`getChallenges`), huy hiệu đã mở/tổng (`getBadges('me')`). Lỗi thì chỉ hiện chữ, không số.
3. **`GamesList.tsx` làm lại**: `KIND_STYLE` (màu token + icon + hoạ tiết CSS cho từng loại), thẻ có nút "Chơi", hover nhấc nhẹ; chip lọc theo loại (chỉ hiện loại đang có); trạng thái trống có minh hoạ. Test: lọc đúng, chip chỉ có loại hiện có, trống hiện gợi ý.
4. **`app/games/page.tsx`**: tiêu đề mới + hero + lối tắt + danh sách.
5. Kiểm tra: typecheck, test `features/games`, `features/progress`, `next build`, xem trên trình duyệt ở 375px và desktop, sáng/tối.
