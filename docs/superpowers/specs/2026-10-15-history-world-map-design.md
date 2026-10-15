# Bản đồ thế giới động (`history-world`) — thiết kế

> Trạng thái: code đã viết trước khi có spec này (sai quy trình). Spec ghi lại đúng những gì đã làm, để duyệt trước khi commit.

## Mục tiêu
Hai lược đồ tĩnh trong SGK Lịch sử 11 (KNTT), Bài 2, chuyển thành bản đồ động:
- **Hình 4 tr.14, Mỹ La-tinh giành độc lập.** Kéo thanh thời gian thì các nước lần lượt "sáng lên" theo năm độc lập (Ha-i-ti 1804 … Đô-mi-ni-ca-na 1844).
- **Hình 6 tr.15, Các đế quốc và thuộc địa đầu thế kỉ XX.** Vùng thuộc địa của Anh, Pháp, Đức, Mỹ, Nga được tô màu dần qua 4 giai đoạn (trước 1870 → 1914).

## Quyết định
- **Mô phỏng cố định.** Giáo viên không sửa được nội dung, chỉ chọn bản đồ. Config là `{ map: 'empires-1914' | 'latin-america' }`, schema nằm ở `packages/types/src/historyWorld.ts` và được sao y sang `backend/src/schemas/historyWorld.ts`.
- **Dữ liệu nằm trong code** (`frontend/features/simulations/historyWorldData.ts`):
  - mỗi vùng là một nước ngày nay, ghi bằng mã ISO alpha-3, kèm nước cai trị, bước bắt đầu tô màu, và nếu có thì bước và năm độc lập;
  - mốc từng thuộc địa ở Hình 6 là ước lượng (SGK chỉ vẽ kết quả), ghi rõ dưới bản đồ.
- **Ranh giới** lấy từ Natural Earth 110m, biên giới ngày nay giống chú giải SGK, phép chiếu Natural Earth. Script `scripts/assets/build_history_world.py` tạo `frontend/public/models/history/world/countries.json` (~117 KB). File gồm path SVG, điểm đặt nhãn của từng nước, và khung nhìn `world` / `latin-america`.
- **Bản đồ SVG phẳng**, không dùng 3D: nhẹ và chạy được trên điện thoại.
- **Giao diện** dùng lại khung một màn hình của `history-map` (`historyMap.module.css`):
  - thẻ tiêu đề, nút toàn màn hình;
  - dock gồm chú giải đếm số vùng theo nước, thanh trượt, trước/sau/chạy, các mốc, phần nội dung thu gọn được;
  - nút "Xem thêm" mở danh sách các nước thay đổi ở giai đoạn này.
- **Hiển thị trạng thái:**
  - vùng mới đổi ở giai đoạn hiện tại loé sáng một lần, và không loé khi người dùng chọn giảm chuyển động;
  - ở bản đồ độc lập, thuộc địa mờ đi, nước đã độc lập dùng màu `--accent` và có nhãn năm. Trung Mỹ chỉ hiện một nhãn 1821.
- **Màu** chỉ dùng token theme. Màu tím của Mỹ pha bằng `color-mix(--sky, --danger)` vì theme không có sẵn tông tím.
- **Bài 2** (`generate_lesson_2_su.py`) thêm hai khối sau mục 2: Mỹ La-tinh, rồi Các đế quốc.

## Kiểm thử
- `historyWorld.test.tsx` kiểm tra các điểm sau:
  - mọi mã nước có trong file ranh giới, không trùng, và bước nằm trong phạm vi;
  - trạng thái chuyển đúng: thuộc địa → độc lập, chưa chiếm → thuộc địa;
  - kéo thanh trượt thì Mê-hi-cô sáng lên kèm nhãn 1821, chạm vào thì hiện chú thích;
  - số thuộc địa của Anh tăng qua các giai đoạn.
- Fixture schema có 3 ca dùng chung cho frontend và backend.
- `verify_lesson_2_su.test.ts` kiểm tra vị trí hai khối mới trong Bài 2.
- Đã xem trên trình duyệt ở 1280px và 375px (theme tối).

## Ngoài phạm vi
- Thu phóng và kéo bản đồ: trên điện thoại bản đồ thế giới khá nhỏ, tạm dùng chế độ toàn màn hình.
- Các nước nhỏ không có ở tỉ lệ 110m (Xin-ga-po, nhiều đảo Ca-ri-bê).
- Thuộc địa của Bỉ, Bồ Đào Nha, Hà Lan, Ý, Nhật ở Hình 6 (SGK cũng không tô).

## Thay đổi 1 — lãnh thổ lan ra, không hiện cùng lúc (đã làm)
Phản hồi: "các lãnh thổ phải lan ra chứ không phải hiện lên 1 lượt".

**Cách làm:** khi sang một giai đoạn, các vùng mới không đổi màu cùng lúc mà loang ra từ phần đất nước đó đã có.
1. **Thứ tự lan.** Với mỗi vùng mới, tìm vùng gần nhất mà cùng nước cai trị đã nắm, hoặc chính quốc nếu chưa có vùng nào. Vùng gần thì đổi màu trước, vùng xa đổi sau; độ trễ tỉ lệ với khoảng cách. Ví dụ ở giai đoạn 1885–1899, Pháp lan từ Xê-nê-gan và An-giê-ri vào sâu Tây Phi, rồi mới tới Ma-đa-ga-xca. Cả giai đoạn lan xong trong khoảng 3 giây.
2. **Loang trong từng nước.** Mỗi vùng tô bằng một vòng tròn màu nở dần từ phía giáp phần đất cũ (SVG `clipPath`), trông như mực loang chứ không bật màu cả nước một lần.
3. **Mỹ La-tinh** dùng cùng cơ chế: các nước độc lập cùng giai đoạn sáng lên nối tiếp nhau theo năm, ví dụ 1816 rồi 1818 rồi 1819. Các nước cùng năm thì xếp theo khoảng cách.
4. **Kéo lùi, kéo nhanh, hoặc bật giảm chuyển động:** đổi màu ngay, không lan.

**Dữ liệu:** chỉ cần điểm đặt nhãn sẵn có (`c`) để đo khoảng cách. Mỗi vùng ở Hình 4 thêm năm độc lập (đã có); Hình 6 không thêm năm.

**Kiểm thử:**
- Test hàm tính độ trễ: thứ tự gần trước xa sau, và nước cùng năm không lan trước nước năm sớm hơn.
- Test giảm chuyển động: độ trễ bằng 0.
- Xem trên trình duyệt.

## Thay đổi 2 — thanh thời gian chạy từ từ (đã làm; thả tay không bám mốc để giữ đúng năm đang kéo)
Phản hồi: "cái timeline phải di chuyển từ từ".

**Cách làm:** thanh trượt không nhảy từng nấc nữa mà trượt liên tục, đồng bộ với lãnh thổ đang lan.
1. **Bấm "Giai đoạn sau" hoặc "Chạy":** nút trượt lướt đều từ mốc này sang mốc kế trong đúng thời gian lãnh thổ lan (~2,2 giây). Phía trên thanh có một nhãn năm chạy theo, ví dụ 1885 → 1899. Khi "Chạy", các giai đoạn nối tiếp liền mạch, không dừng giật giữa các mốc (nghỉ 1 giây để đọc).
2. **Kéo tay:** thanh đi theo ngón tay. Kéo tới đâu, các vùng có mốc trước điểm đó đổi màu tới đó. Hình 4 có năm độc lập thật nên kéo được theo năm. Hình 6 chỉ có mốc giai đoạn nên đổi màu theo giai đoạn. Thả tay thì nút bám về mốc gần nhất.
3. **Giảm chuyển động:** giữ cách cũ, nhảy từng nấc.

**Kiểm thử:**
- Test hàm đổi vị trí thanh ↔ năm/giai đoạn.
- Test kéo tới giữa 1816 và 1818: Ác-hen-ti-na đã sáng, Chi-lê chưa.
- Xem trên trình duyệt.
