# Mục "Bồi dưỡng HSG" trong Phòng thi thử

## Vấn đề
Phòng thi thử (`/exam`) chỉ chia nhóm theo `format`: THPTQG, ĐGNL, "Đề luyện tập khác". Đề bồi dưỡng học sinh giỏi (như "Luyện thi HSG Tin học: Sàng nguyên tố", đã nạp 19/10) bị lẫn vào "Đề luyện tập khác" và không có chỗ riêng.

## Thiết kế
- Thêm cột `exam_blueprints.category text not null default 'standard' check (category in ('standard','hsg'))`. Tách khỏi `format` vì `format` quyết định cách chia phần và chấm điểm, còn HSG chỉ là nhóm hiển thị; đề HSG vẫn dùng `format = 'generic'`.
- Backend: `GET /api/exam/blueprints` và `/api/exam/:id/questions` trả thêm `category` (mặc định `standard` khi thiếu).
- Frontend (`ExamBlueprintList`): thêm nhóm "Bồi dưỡng HSG" (EN: "Gifted-student training") **đứng đầu** danh sách khi có đề `hsg`; đề `hsg` không lặp lại ở các nhóm format. Bộ lọc môn vẫn áp dụng cho nhóm này. Không đổi runner, chấm điểm hay trang vào thi.
- Dữ liệu: đặt `category = 'hsg'` cho đề `c72df034-0012-4ac5-ac1b-58c371d90550` (Sàng nguyên tố).

## Ngoài phạm vi
- Cột `category` trong Excel nhập đề và ô chọn ở trang soạn đề: chưa làm. Đề HSG mới đặt bằng SQL cho tới khi có nhu cầu.
- Không có đề HSG môn khác; không thêm tab hay trang mới.

## Kiểm chứng
- Test `ExamBlueprintList`: đề `hsg` hiện ở nhóm HSG (đầu danh sách), không hiện ở nhóm khác; không có đề `hsg` thì không có nhóm.
- Test backend: `category` có trong payload và mặc định `standard`.
- `pnpm turbo typecheck` và test frontend/backend.
- Migration thêm cột (additive, không phá dữ liệu); áp lên Supabase sau khi duyệt.
