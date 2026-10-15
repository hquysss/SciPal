# Plan: bản đồ lịch sử 3D — thời gian liên tục, vùng lan ra

Spec: `docs/superpowers/specs/2026-10-15-history-map-continuous-design.md`. Đã duyệt 2026-10-15.

1. [x] Tách `useTimelineGlide(last, { reduced, durationOf })` từ `historyWorld.tsx`; `history-world` dùng lại hook (test lướt nằm trong test của hai bản đồ).
2. [x] `historyMapGeo.ts`: `timelineOf(config)` cho mỗi giai đoạn trả về `at` của từng mũi (đầu, cuối), từng vùng (bắt đầu lan, điểm lan từ) và từng địa danh; `yearsOf(period)`. Viết test trước.
3. [x] `historyMapScene.tsx`: `March` lấy độ dài vẽ từ `pos`; `paintGround` vẽ vùng của giai đoạn đang chạy theo bán kính nở từ `pos`; nhãn địa danh hiện theo `at`; `MapRig` đi theo đầu mũi tên tính từ `pos`.
4. [x] `FlatMap`: mũi vẽ dần bằng `stroke-dasharray`, vùng loang bằng `clipPath` tròn, địa danh theo `at`.
5. [x] `historyMap.tsx`: thanh trượt `step="any"` dùng hook; tiêu đề hiện năm chạy; giảm chuyển động thì nhảy nấc.
6. [x] Test view; typecheck; chạy cả bộ test `features/simulations`; xem Lam Sơn và Tây Sơn trên trình duyệt (3D và phẳng).
7. [x] `historyTimeline.tsx`: đoạn nối là thanh `scaleX` có transition, độ trễ theo thứ tự khi tiến, rút ngay khi lùi; chấm sáng sau độ trễ của đoạn tới nó; nút Chạy/Dừng (4 giây mỗi mốc); ô nội dung trượt lên. Test bằng đồng hồ giả.

## Hiệu ứng tiến quân (chờ duyệt)
8. [ ] `FlatMap`: cờ đầu mũi (`<g>` tại `head`, quầng sáng CSS), đường dòng chảy (`stroke-dasharray` + `@keyframes` dashoffset), trận đánh `data-burst` khi vừa được đi qua. CSS trong `historyMap.module.css`, tắt khi giảm chuyển động.
9. [ ] `historyMapScene`: nhãn HTML cờ theo `heads`; dải dòng chảy có texture vạch trượt; nhãn trận đánh bùng sáng khi `frac` vượt `at`.
10. [ ] Test FlatMap (cờ, dòng chảy, burst, giảm chuyển động); typecheck; xem trên trình duyệt.
