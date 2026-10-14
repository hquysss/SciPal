# Số hoá động môn Lịch sử

Ngày: 14/10/2026. Nguồn: đề xuất "làm sống dậy" SGK Lịch sử 11 (Kết nối tri thức) của người dùng; SGK đầy đủ `SÁCH GIÁO KHOA LỊCH SỬ 11 KẾT NỐI TRI THỨC.pdf` (98 trang, bản scan không có lớp chữ; trang PDF = trang in + 1).

## Mục tiêu
Biến lược đồ, sơ đồ, tranh ảnh tĩnh trong SGK thành trực quan động để học sinh hiểu và nhớ sâu hơn. Tiếng Việt trước; trường tiếng Anh vẫn có (song ngữ chuẩn hoá) và điền sau.

## Nguyên tắc
- Nội dung là dữ liệu: mỗi dạng là **một** loại mô phỏng dùng chung (block `interactive`, `kind` mới trong `SIMULATION_CONFIGS`); từng lược đồ/sơ đồ chỉ là `config`. Schema ở `packages/types`, bản sao y hệt ở `backend/src/schemas` (test so byte + fixture chung).
- Màu theo token và `--accent` của môn: đường tiến của ta `--danger` (đỏ như SGK), vùng kiểm soát `--success`, bên địch `--ink`; mọi đường có viền `--surface` để đọc được trên nền địa hình ở cả chế độ sáng/tối. Không thêm thư viện: 3D dùng `three` + `@react-three/fiber` đã có, phần còn lại React + CSS + SVG.
- `prefers-reduced-motion`: tắt bay camera, mũi tên chạy, hiện dần; vẫn xem được từng giai đoạn.
- Ảnh phải ở kho lesson-media (`isLessonMediaUrl`), có mô tả tiếng Việt.
- Bản đồ có vùng biển Việt Nam luôn ghi "Biển Đông" và thể hiện quần đảo Hoàng Sa, Trường Sa thuộc Việt Nam (như Hình 6 tr.15).
- Giáo viên soạn bằng ô JSON có kiểm tra (zod), báo lỗi song ngữ đúng trường. Vẽ bằng chuột: để sau.

## 5 loại block

### 1. `history-map` — bản đồ động 3D có địa hình (làm đầu tiên)
- `config`: `region` (vùng dựng sẵn trong `HISTORY_MAP_REGIONS`; hiện có `viet-nam`: kinh độ 102–118, vĩ độ 7–24, gồm Hoàng Sa, Trường Sa), `places[]` (`name`, `lon`, `lat`, `type`: city/battle/base/area, `from`: bước bắt đầu hiện, `note?`: chú thích khi chạm), `steps[]` (`period`, `title`, `text`, `areas[]` đa giác lon/lat + `side`, `routes[]` đường lon/lat + `side` + `dashed` cho rút lui). Toạ độ WGS84 thật, phải nằm trong vùng. Đã làm: `packages/types/src/historyMap.ts` (+ bản sao backend).
- Hiển thị: mặt địa hình nổi từ ảnh độ cao; vùng kiểm soát phủ màu lên địa hình và giữ ở các bước sau; mũi tên tiến quân bám mặt đất, chạy theo thứ tự hành quân; thanh trượt giai đoạn + nút trước/sau/chạy; camera bay tới khung của bước; chạm địa danh → chú thích. Xoay/zoom có giới hạn.
- Không có WebGL, tải địa hình lỗi, hoặc học sinh bấm "Bản đồ phẳng" → bản 2D SVG cùng dữ liệu (phép chiếu equirectangular, khung 4:3). Bản phẳng cũng là lần vẽ đầu từ server.
- Tài nguyên địa hình dựng một lần bằng `py scripts/assets/build_history_terrain.py` (numpy + PIL; tải về cache ở `scratch/history-terrain/`) → `frontend/public/models/history/<region>/`: `relief.jpg` (màu địa hình kiểu atlas + bóng đổi + sông, làm texture 3D và nền bản phẳng), `land.png` (mặt nạ đất liền để vùng kiểm soát không tràn ra biển), `heights.bin` (uint16, mét), `meta.json`. Bờ biển lấy từ độ cao > 0, không cần tải bờ biển riêng. Nguồn: AWS Terrain Tiles zoom 7 (42 ô) và sông Natural Earth 1:10m. Ghi nguồn dưới bản đồ. Không vẽ biên giới hành chính hiện nay lên bản đồ trung đại.
- Lược đồ dự kiến: Lam Sơn (tr.53), Tây Sơn (tr.57), Mỹ La-tinh (Hình 4 tr.14), các đế quốc (Hình 6 tr.15), các cuộc kháng chiến thắng lợi tiêu biểu 938–1789 (Bảng 1, Bài 7).

### 2. `history-timeline` — trục thời gian tương tác
- `config`: `events[]` (1–16 mốc: `when`, `title`, `text`, `image?`), `figure?` (hình gốc trong SGK, bấm "Xem hình gốc trong sách" mới hiện). Ảnh có `image_url` (kho lesson-media), `alt.vi` bắt buộc, `caption`. Các mốc hiện dần (tắt khi giảm chuyển động), đoạn trục đã qua tô màu môn; chạm mốc → mở chi tiết và ảnh. Bàn phím: mũi tên, Home/End. Màn hẹp chỉ hiện thời gian trên trục, tiêu đề nằm ở khung chi tiết. Đã làm (schema nằm trong `simulations.ts`); xem thử `/dev/history-timeline`.
- Dùng cho: Hình 2 tr.12 (gắn vào Bài 2 đã xuất bản, thay ảnh tĩnh), giai đoạn đấu tranh Đông Nam Á (Hình 3 tr.39), diễn biến Lam Sơn (Hình 4 tr.54), bảo vệ chủ quyền biển đảo (Hình 9 tr.87), mốc Bài 1 và Bài 3.

### 3. Ảnh có chú thích bật lên — dùng lại `labeled-diagram` (đã có)
- Chỉ là việc nội dung: tranh biếm hoạ nông dân Pháp (tr.8), công ti độc quyền (tr.16).

### 4. `before-after` — so sánh xưa ↔ nay
- `config`: `before`, `after` (mỗi bên `image_url`, `label` ngắn như "Năm 1288"/"Ngày nay", `alt`, `caption`, `source`). Có ảnh thì bắt buộc `alt.vi` và `source.vi`; ảnh phải ở kho lesson-media. Thanh kéo là `<input type="range">` phủ lên ảnh (kéo, chạm, phím mũi tên), thêm nút "Chỉ ảnh xưa / Mỗi bên một nửa / Chỉ ảnh nay". Ảnh "nay" quyết định khung, ảnh "xưa" phủ lên và bị cắt theo vạch chia. Đã làm; xem thử `/dev/before-after` (ảnh tạm của app, chỉ để thử thanh kéo).
- Cần ảnh có nguồn rõ (ảnh SGK hoặc giấy phép mở). Ví dụ: cọc Bạch Đằng (Hình 3 Bài 7) ↔ bãi cọc ngày nay; tượng đài Lê Lợi, thành Tây Đô.

### 5. `org-chart` — sơ đồ tổ chức bấm mở từng cấp
- `config`: `root` là cây ô (`label` cần `vi`, `text` hiện khi mở ô, `children` tối đa 12). Tối đa **6 cấp** (Lê Thánh Tông cần vua → địa phương → đạo → phủ → huyện, châu → xã) và 40 ô. Schema dựng sẵn 6 tầng thay vì đệ quy, nên độ sâu bị chặn ngay trong schema. Mở/đóng bằng `<details>`/`<summary>`, ban đầu chỉ mở ô gốc, có nút Mở hết / Thu gọn, số bộ phận con trên mỗi ô. Mẫu mặc định: bộ máy nhà nước sau cải cách Lê Thánh Tông (SGK tr.65). Đã làm; xem thử `/dev/org-chart`.
- Dùng cho: bộ máy nhà nước Lê Thánh Tông (Bài 10), Minh Mạng (Bài 11).

### Dữ liệu lược đồ Lam Sơn (theo Hình 3 tr.53, Hình 4 tr.54)
4 bước theo Hình 4, vùng màu và mũi tên theo chú giải Hình 3:
1. **1418–1423, những năm đầu**: dựng cờ ở Lam Sơn; quân Minh bao vây; ba lần rút lên núi Chí Linh; thắng ở Đa Căng. Vùng hoạt động quanh Lam Sơn – Thanh Hoá (màu cam).
2. **1423–1424, tạm hoà hoãn**: không có trận; giữ vùng cũ, củng cố lực lượng.
3. **1424–1425, mở rộng hoạt động**: theo kế của Nguyễn Chích, tiến vào Nghệ An (Trà Lân, Khả Lưu); sở chỉ huy ở Lục Niên; vây thành Nghệ An, Diễn Châu, Tây Đô; quân Minh rút từ Nghệ An về Đông Quan; tiến vào Tân Bình, Thuận Hoá. Vùng giải phóng từ Thanh Hoá đến đèo Hải Vân (xanh lá đậm).
4. **1426–1427 (Hình 4 ghi 1426–1428), tiến quân ra Bắc**: từ tháng 9/1426 ba đạo tiến ra Bắc; thắng ở Tốt Động – Chúc Động (11/1426); vây Đông Quan, Tam Giang, Cổ Lộng, Chí Linh, Xương Giang; viện binh Minh sang từ tháng 1/1427, bị chặn ở Chi Lăng (tháng 10/1427 theo Hình 4); hội thề Đông Quan 10/12/1427; quân Minh rút hết tháng 1/1428. Vùng giải phóng ở Bắc Bộ (xanh nhạt).

Toạ độ lon/lat của các địa danh sẽ do đội nội dung đối chiếu khi soạn config. Vị trí Đa Căng, Trà Lân, Khả Lưu, Lục Niên, Tân Bình là ước lượng, cần giáo viên duyệt.

## Thứ tự
1. ✅ `history-map` + tài nguyên địa hình Việt Nam + lược đồ Lam Sơn (mẫu chuẩn, là cấu hình mặc định). Xem thử: `/dev/history-map` (chỉ môi trường dev).
2. ✅ `history-timeline` + Hình 2 vào Bài 2: khối đã có trong `generate_lesson_2_su.py` và file xuất; ghi vào database bằng `export-lesson/chen-truc-thoi-gian-bai-2-su.sql` **sau khi** deploy code (trang bài đọc khối bằng `z.array(BlockSchema)`, kind lạ làm cả bài trống).
3. ✅ Chú thích tranh biếm hoạ Bài 1, Bài 2 (`labeled-diagram`): bản gốc phạm vi công cộng từ Wikimedia Commons (Carnavalet 1789; Keppler "Next!" 1904), đã ghi vào DB.
4. ✅ `before-after` (khối xong; chưa có cặp ảnh thật có nguồn để gắn vào bài).
5. ✅ `org-chart` (khối xong; gắn vào Bài 10, 11 khi hai bài này được số hoá).
6. Nhân bản đồ: Tây Sơn, Mỹ La-tinh, đế quốc (cần tài nguyên `world`), kháng chiến Bài 7.

## Kiểm thử
Mỗi kind: hàng fixture hợp lệ/không hợp lệ (cả hai bộ test), test renderer (bản 2D/không WebGL dựng được), test phép chiếu lon/lat. Xem trên Browser ở 375/768/1280px, sáng/tối, giảm chuyển động.

## Phụ thuộc còn thiếu
- Giáo án Bài 8–13 (đã có SGK đầy đủ; lược đồ Lam Sơn đối chiếu theo Hình 3 tr.53 và Hình 4 tr.54).
- Ảnh di tích có nguồn cho `before-after`.

## Ngoài phạm vi
Vẽ bản đồ bằng chuột, 3D cho trục thời gian, liên kết trục thời gian ↔ bản đồ, chế độ đố/kiểm tra trên bản đồ, trau chuốt tiếng Anh.
