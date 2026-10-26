# Ôn từ và Sổ từ: nổi bật và song ngữ

Trạng thái: chờ duyệt. Chỉ giao diện, không đổi backend, không migration.

## Hiện tại
- `/review` (Ôn từ) và `/glossary?filter=saved` (Sổ từ) chỉ vào được qua menu hồ sơ và một chip trong trang Thuật ngữ. Trang Gamification không nhắc tới, dù mỗi từ nhớ được +2 XP.
- Thẻ ôn chỉ hiện nghĩa theo ngôn ngữ giao diện: mặt sau có `term_vi` + **một** định nghĩa + **một** ví dụ (EN hoặc VI).
- Sổ từ là bộ lọc trong danh sách thuật ngữ chung, không có đầu trang riêng, không biết bao nhiêu từ đến hạn.

## Làm gì
1. **Dải "Ôn từ hôm nay" trên `/games`**, ngay dưới thẻ người chơi, to hơn các ô lối tắt:
   - Số thẻ đến hạn (đếm `user_terms` có `due_at <= now`, RLS chỉ thấy của mình), tổng số từ trong sổ.
   - Nút chính "Ôn ngay · +2 XP/từ" → `/review`; nút phụ "Mở sổ từ" → `/glossary?filter=saved`.
   - Xem trước tối đa 3 từ đến hạn, **chỉ mặt tiếng Anh** (không lộ nghĩa).
   - Không có thẻ đến hạn: "Xong phần ôn hôm nay" + giờ ôn kế tiếp. Sổ trống: gợi ý chạm thuật ngữ trong bài để lưu.
2. **Thẻ ôn song ngữ** (`ReviewSession`): mặt trước giữ EN + IPA + nghe. Mặt sau hiện `term_vi` to, rồi hai cột "English" / "Tiếng Việt" cho định nghĩa và ví dụ (xếp chồng ở màn hẹp), có nút nghe cho cả hai.
3. **Sổ từ có đầu trang riêng** khi lọc "Đã lưu": tiêu đề "Sổ từ của tôi · My words", số từ, nút "Ôn N từ đến hạn". Mỗi dòng hiện cặp EN ↔ VI ngang hàng thay vì một ngôn ngữ chính.

Tuân thủ: màu qua token, song ngữ `{ en, vi }`, chạm 44px, ổn ở 375px, chế độ tối, XP vẫn do server quyết.

## Câu hỏi
- **A.** Thêm "Ôn từ" vào menu "Học tập" trên thanh điều hướng? Đề xuất **có**, kèm chấm số thẻ đến hạn.

## Ngoài phạm vi
Ôn chiều VI → EN, đổi thuật toán lặp lại ngắt quãng, thêm loại game từ vựng mới.
