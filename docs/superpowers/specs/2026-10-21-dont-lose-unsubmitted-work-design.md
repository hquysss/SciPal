# Không mất bài khi quên bấm nút; thi thử theo dõi chuyển tab

Ngày 21/10/2026. Trạng thái: **đã duyệt 21/10/2026**. Nguồn: phản hồi người dùng thử (và yêu cầu "thi thử chặn chuyển tab") ("quên bấm nút nộp bài là đi, chưa kịp hoàn thành bài luyện tập"). Chủ dự án chọn sửa **cả Tự luyện lẫn Thi thử**.

## Vấn đề
- **Tự luyện:** đáp án chọn xong nằm trong state của React; chưa bấm "Kiểm tra" mà rời trang hay tải lại là mất, và chỉ câu đã "Kiểm tra" mới được tính XP.
- **Thi thử:** bài làm dở có bản nháp trên máy, nhưng (a) rời trang không có cảnh báo, (b) mã lượt thi chỉ lưu theo tab (`sessionStorage`) nên đóng tab là mất đường về bản nháp, (c) hết giờ chỉ tự nộp khi trang còn mở: đóng trang thì không ai nộp.

## Quyết định
Không tự "kiểm tra" thay người học (câu trả lời đầu tiên được tính XP, nên không được chốt hộ khi họ chưa bấm). Thay vào đó giữ bài lại, nhắc và cho nộp nhanh.

**Tự luyện (`PracticeSection`)**
1. Đáp án đã chọn nhưng chưa kiểm tra được lưu nháp trên máy theo bài học (`localStorage`, khoá `scipal-practice-draft:<lessonId>`), khôi phục khi mở lại bài. Xoá nháp của câu khi câu đó đã được kiểm tra; xoá hết khi đăng xuất (cùng chỗ `clearPacks`).
2. Có câu đã làm mà chưa kiểm tra thì: hiện dải nhắc "Còn N câu đã làm chưa nộp" kèm nút **"Nộp N câu ngay"** (dùng lại đường "Nộp bài" sẵn có của trang: chấm cùng lúc mọi câu đã làm, offline vẫn chấm tạm); và trình duyệt hỏi xác nhận khi đóng/tải lại tab (`beforeunload`).

**Thi thử (`ExamRunner`)**
3. Khi đang làm (đã bắt đầu, chưa nộp): `beforeunload` hỏi xác nhận khi đóng/tải lại.
4. Mã lượt thi và `started_at` được giữ trong `localStorage` (không chỉ theo tab) cùng với bản nháp: mở lại đề trên cùng máy thì làm tiếp đúng lượt đó, đồng hồ tính từ lúc bắt đầu.
5. Mở lại một lượt đã quá giờ (còn bản nháp, `started_at` + thời lượng đã qua): tự nộp ngay bản nháp, hiện kết quả như nộp hết giờ (offline thì vào hàng đợi như thường). Không nháp thì để lượt bị bỏ như hiện nay.

6. **Chuyển tab (chủ dự án chọn: cảnh báo + đếm, quá 3 lần tự nộp, mọi đề thi thử, cả online lẫn offline):** trình duyệt không chặn hẳn được việc rời tab, nên chỉ phát hiện. Trong lúc đang làm (đã bắt đầu, chưa có kết quả), mỗi lần trang chuyển `hidden` rồi `visible` trở lại tính **một lần rời trang** (chỉ dùng `visibilitychange`, không dùng `blur` vì bấm thanh địa chỉ hay mở DevTools cũng kích `blur`). Mỗi lần quay lại hiện cảnh báo song ngữ "Bạn đã rời trang N/3 lần. Rời lần thứ 3 bài sẽ tự nộp." Lần thứ 3 tự nộp bài như hết giờ. Số lần lưu cùng bản nháp trên máy (tải lại trang không đặt lại về 0) và hiện ở màn kết quả. Số lần này chỉ nằm trên máy, **không gửi lên server và không ảnh hưởng điểm** (không migration); muốn server biết thì làm sau.

## Ngoài phạm vi
- Server tự đóng lượt quá hạn khi không ai quay lại (cần tác vụ định kỳ); lượt đó vẫn bị bỏ và quota giữ 3 giờ rồi trả.
- Đồng bộ bản nháp giữa các thiết bị.

## Kiểm thử
Nháp Tự luyện lưu/khôi phục/xoá sau khi kiểm tra và khi đăng xuất; dải nhắc và "Kiểm tra N câu"; `beforeunload` bật đúng lúc (có việc dở) và tắt khi hết; thi: mã lượt và `started_at` sống sau khi đóng tab, quá giờ thì tự nộp bản nháp, chưa quá giờ thì làm tiếp với đồng hồ đúng, không nháp thì không nộp; chuyển tab: ẩn rồi hiện đếm đúng một lần, `blur` không đếm, lần 3 tự nộp, số lần sống sau khi tải lại, không đếm khi chưa bắt đầu hay đã có kết quả.

## Rủi ro
Cuộc gọi đến hay thông báo hệ thống trên điện thoại cũng làm trang bị ẩn và bị tính một lần (chấp nhận; 3 lần mới nộp). Người học có thể tắt cảnh báo bằng cách mở đề ở hai cửa sổ cạnh nhau: không chặn được, chỉ răn đe.
Nháp nằm trên máy dùng chung: xoá khi đăng xuất, và chỉ lưu đáp án đã chọn (không lưu đáp án đúng).
