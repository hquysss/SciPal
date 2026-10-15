# Plan: bản đồ thế giới động (`history-world`)

Spec: `docs/superpowers/specs/2026-10-15-history-world-map-design.md`. Các bước 1–6 đã làm (trước khi duyệt); bước 7–8 chờ duyệt.

1. [x] Tạo ranh giới: `scripts/assets/build_history_world.py` → `frontend/public/models/history/world/countries.json`.
2. [x] Schema `historyWorld.ts` (types + backend), đăng ký kind, thông báo lỗi, fixture, test mirror backend.
3. [x] Dữ liệu `historyWorldData.ts`: hai bản đồ, `territoryState`.
4. [x] View `historyWorld.tsx` + `historyWorld.module.css`, Editor chọn bản đồ, đăng ký registry, trang `/dev/history-world`.
5. [x] Test `historyWorld.test.tsx`; typecheck; xem trên trình duyệt.
6. [x] Bài 2: thêm hai khối, sinh lại file, cập nhật `verify_lesson_2_su.test.ts`.
7. [x] Commit, push vào PR đang mở.
8. [ ] Sau khi deploy: người dùng import lại Bài 2 qua Studio (hoặc chạy SQL chèn 2 khối).

## Thay đổi 1 — lan ra (đã làm)
9. [x] `historyWorldData.ts`: hàm `spreadDelays(map, step)` trả về độ trễ (ms) của từng vùng mới: theo năm (nếu có), rồi theo khoảng cách tới vùng gần nhất đã thuộc cùng nước (hoặc chính quốc). Viết test trước.
10. [x] `historyWorld.tsx`: vùng mới vẽ thêm một lớp màu có `clipPath` hình tròn nở ra từ điểm giáp phần đất cũ, bắt đầu sau độ trễ. Kéo lùi, nhảy nhiều bước hoặc bật giảm chuyển động thì không lan.
11. [x] Test view: vùng ở xa nhận độ trễ lớn hơn; khi bật giảm chuyển động thì độ trễ bằng 0. Typecheck, xem trên trình duyệt.

## Thay đổi 2 — thanh thời gian chạy từ từ (đã làm)
12. [x] `historyWorldData.ts`: mỗi bản đồ có trục năm (`years` theo từng mốc); hàm `stateAt(territory, t)` với `t` là vị trí liên tục (năm thật cho Hình 4, giai đoạn cho Hình 6). Test trước.
13. [x] `historyWorld.tsx`: giá trị thanh trượt là số thực; "sau" và "chạy" lướt bằng `requestAnimationFrame` khớp thời gian lan; thêm nhãn năm chạy theo; thả tay thì bám mốc; giảm chuyển động thì nhảy nấc.
14. [x] Test view, typecheck, xem trên trình duyệt.
