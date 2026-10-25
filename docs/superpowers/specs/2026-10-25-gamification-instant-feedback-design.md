# Gamification giai đoạn 1: phản hồi tức thì

Ngày: 25/10/2026 · Trạng thái: đã duyệt 25/10 · Phạm vi: chỉ giao diện web, không migration, không đổi API

## Vấn đề

Khi học sinh trả lời một câu Tự luyện, phản hồi hiện chỉ là chữ đúng/sai và một dòng `+N XP` (`frontend/features/lessons/PracticeSection.tsx:571`). Không có nhịp thưởng, không có cảm giác tiến lên, chưa có khái niệm cấp độ.

## Mục tiêu

Mỗi câu trả lời cho phản hồi rõ ràng trong khoảng 1 giây, dùng đúng các số server đã trả về. Không thêm cách mới để kiếm XP.

## Giải pháp

1. **Hiệu ứng đúng/sai trên thẻ câu hỏi.** Đúng: viền `--success` sáng lên rồi tắt, có dấu tích. Sai: thẻ rung nhẹ 1 lần, viền `--danger`. Thời lượng 300–400ms.
2. **XP bay lên.** Khi `xp_earned > 0`, chip `+N XP` bay từ nút "Kiểm tra" lên rồi mờ dần. Bộ đếm XP của phiên ở đầu phần Tự luyện tăng dần lên tổng mới. Chỉ hiện số server trả về.
3. **Combo.** Đúng ngay lần đầu liên tiếp từ 3 câu trở lên trong phiên thì hiện nhãn "Chuỗi đúng ×N". Sai thì về 0. Combo chỉ để hiển thị, không cộng XP, không lưu, không gửi lên server.
4. **Lên cấp.** Cấp là hàm thuần của tổng XP, đặt ở `@scipal/types` (`levelOfXp`, `xpForLevel`) để web và mobile dùng chung. Đề xuất công thức: lên cấp N cần `50 × N × (N − 1)` XP cộng dồn (cấp 2 cần 100, cấp 3 cần 300, cấp 5 cần 1000). Web đọc tổng XP một lần khi mở bài (bảng `xp_log` qua RLS, giống trang Tiến trình), rồi cộng thêm `xp_earned` của từng câu. Khi vượt mốc thì hiện màn lên cấp (overlay, tự đóng sau 2,5 giây hoặc khi bấm/nhấn Esc). Trang Profile hiển thị cấp và thanh tiến tới cấp sau.
5. **Hoàn thành bài.** Khi `lesson_completed` là true, thay dòng chữ hiện tại bằng thẻ tổng kết: số câu đúng, XP kiếm được trong phiên, combo dài nhất.
6. **Âm thanh.** Có tiếng ngắn cho đúng, sai và lên cấp, **mặc định tắt**. Bật/tắt trong Profile, lưu `localStorage`.

## Ràng buộc

- Server quyết định XP (bất biến #4): mọi số XP và cấp đều suy ra từ số server trả về. Khi offline, kết quả tạm đã có nhãn "Kết quả tạm · chờ đồng bộ"; khi đó không bay XP và không mở màn lên cấp.
- Màu chỉ dùng token (`--success`, `--danger`, `--accent`), không viết cứng màu.
- Chữ song ngữ `{ en, vi }`.
- `prefers-reduced-motion`: bỏ rung và bay, chỉ đổi màu và chữ.
- Có `aria-live` cho kết quả, combo và lên cấp. Overlay bắt focus và đóng được bằng Esc.
- Không thêm thư viện: dùng CSS animation và Web Audio hoặc `<audio>` với file nhỏ trong `public/`.
- Mobile (Expo) để sau. Chỉ dùng chung hàm cấp độ.

## Ngoài phạm vi

Streak và mục tiêu ngày (giai đoạn 2), badge (giai đoạn 3), bảng xếp hạng (giai đoạn 4). Thi thử (`ExamRunner`) và Ôn từ (`ReviewSession`) chỉ dùng lại chip XP nếu không tốn công thêm, không làm combo.

## Tiêu chí nghiệm thu

- [ ] Trả lời đúng: thẻ sáng `--success`, chip `+N XP` bay lên, bộ đếm phiên tăng đúng `xp_earned`.
- [ ] Trả lời sai: thẻ rung một lần, không có chip XP.
- [ ] Đúng lần đầu 3 câu liên tiếp thì hiện "Chuỗi đúng ×3". Sai một câu thì combo biến mất.
- [ ] `levelOfXp` có test cho các mốc 0, 99, 100, 299, 300 và XP rất lớn.
- [ ] Vượt mốc cấp thì hiện overlay một lần. Esc đóng được. Có `aria-live`.
- [ ] Kết quả tạm khi offline không bay XP và không mở màn lên cấp.
- [ ] Bật reduced-motion thì không có animation di chuyển.
- [ ] Âm thanh tắt mặc định. Bật trong Profile và còn nhớ sau khi tải lại trang.
- [ ] `pnpm turbo typecheck`, `test`, `build` đạt. Đã thử bằng trình duyệt ở chế độ sáng/tối và màn 375px.

## Rủi ro

- Tổng XP đọc lúc mở bài có thể lệch nếu học sinh học song song ở tab khác. Chấp nhận được, vì chỉ ảnh hưởng thời điểm hiện màn lên cấp.
- Công thức cấp độ khó đổi sau khi học sinh đã quen. Cần chốt trước khi làm.
