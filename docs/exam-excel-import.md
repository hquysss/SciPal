# Nhập đề thi từ Excel

Vào **Phòng thi thử → Quản lý đề thi → Nhập đề từ Excel**. Chọn dạng mẫu (Đề thường, THPTQG hoặc ĐGNL ĐHQG-HCM), tải mẫu, điền dữ liệu rồi chọn tệp để xem trước. Tệp .xlsx tối đa 10 MB được đọc trong trình duyệt; chỉ nội dung đã xem lại được gửi khi lưu.

## Các sheet

- `Questions`: mỗi dòng một câu hỏi với mã `key`, môn, dạng, độ khó, câu hỏi song ngữ và đáp án phía máy chủ.
- `Question items`: các lựa chọn trắc nghiệm hoặc nhận định đúng/sai, nối bằng môn và `question_key`.
- `Exams`: mã đề, môn, lớp, tiêu đề song ngữ, thời gian và `format` (`generic`, `thptqg`, `dgnl_hcm`). Bỏ trống format được hiểu là đề thường.
- `Exam sections`: mỗi dòng một phần. Đề thường chọn câu theo dạng, độ khó và số lượng. THPTQG/ĐGNL dùng thêm `section_key`, `title_vi`, `title_en`, `max_points`; `count` phải bằng số câu trong các nhóm của phần.
- `Exam groups`: chỉ dành cho THPTQG/ĐGNL. Điền `exam_code`, `section_key`, `group_key`, `question_keys`; các mã câu phân cách bằng dấu phẩy hoặc chấm phẩy. Có thể thêm `passage_vi`, `passage_en` cho đoạn dẫn chung.

## Đề có cấu trúc phần

Thứ tự dòng trong Exam sections quyết định thứ tự phần; thứ tự dòng nhóm và mã câu trong question_keys quyết định thứ tự câu. Mỗi mã câu phải tồn tại đúng môn và dạng câu của phần; một câu không được lặp trong cùng đề. Các câu dùng cho bài học trong cùng bản nhập là câu luyện tập, không được dùng cho đề thi.

Tổng max_points phải bằng **10** cho THPTQG hoặc **1200** cho ĐGNL. Một đề tối đa 200 câu, 8 phần; đoạn dẫn tối đa 4000 ký tự mỗi ngôn ngữ. Điểm ĐGNL sử dụng cách chấm ước lượng hiện có của SciPal.

Các dòng xám có `_template_example = TRUE` chỉ minh họa và được bỏ qua. Xóa dòng ví dụ rồi thêm dữ liệu thật, hoặc đổi cột này thành FALSE nếu muốn dùng nội dung ví dụ. Ba câu mẫu chỉ minh họa cách nhập, không phải một đề thi chính thức đầy đủ.

## Xem trước và lưu

Xem lại câu hỏi, đáp án, thứ tự phần/nhóm, đoạn dẫn và tổng điểm. Điền các trường tiếng Anh còn thiếu (kể cả tên phần và đoạn dẫn); bỏ câu đang được tham chiếu sẽ khóa nút lưu. File có mã câu sai, lặp câu, sai dạng, sai số lượng hoặc tổng điểm bị từ chối.

Giáo viên lưu đề vào hàng chờ duyệt. Admin có thể chọn xuất bản. Cần đăng nhập bằng tài khoản có quyền; không có dữ liệu nào được lưu chỉ bằng việc chọn tệp. Các mẫu Excel cũ của đề thường vẫn được đọc.
