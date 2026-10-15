# Bản đồ lịch sử 3D (`history-map`): thanh thời gian liên tục và vùng lan ra

> Trạng thái: đã duyệt (2026-10-15), kèm phần trục thời gian ở cuối. Áp dụng cho mọi khối `history-map` (Lam Sơn, Tây Sơn, các trận Bài 7), cả bản 3D lẫn bản phẳng.

## Phản hồi
"mô phỏng 3D map của mấy cái khác cũng vậy, timeline cũng vậy, lan ra cũng vậy" — làm giống bản đồ thế giới (`history-world`):
1. thanh thời gian di chuyển dần, không nhảy theo giai đoạn;
2. vùng kiểm soát lan ra, không hiện cùng lúc.

## Hiện trạng
- Thanh trượt nhảy từng bước (`step` nguyên).
- Mũi tiến quân của bước đang xem tự vẽ theo đồng hồ riêng (`progress`, 1,6 giây mỗi mũi), không gắn với thanh trượt.
- Vùng kiểm soát của bước được tô lên mặt đất cùng lúc (`paintGround`).
- Địa danh mới hiện cùng lúc khi sang bước.

## Thiết kế
**Vị trí liên tục.** Thanh trượt giữ một số thực `pos` từ 0 đến số bước − 1. Giai đoạn đang hiển thị (tiêu đề, nội dung, khung camera) là `ceil(pos)`, tức giai đoạn mà thanh đang tiến vào. Đoạn từ `s − 1` đến `s` là thời gian diễn ra giai đoạn `s`:
- **Mũi tiến quân** của giai đoạn `s` được vẽ dần khi `pos` đi qua đoạn đó, các mũi nối nhau theo thứ tự. Đầu mũi tên chính là vị trí trên thanh trượt. Kéo lùi thì mũi rút lại.
- **Vùng kiểm soát** của giai đoạn `s` lan ra như mực loang trên mặt đất: một vòng tròn nở dần từ điểm cuối của mũi tiến quân gần nhất (hoặc từ tâm vùng nếu giai đoạn không có mũi nào). Vùng bắt đầu lan khi mũi tiến quân tới gần nó, chậm nhất là ở nửa sau của đoạn. Bản 3D vẽ lại lớp vùng trên canvas mặt đất theo bán kính đang nở; bản phẳng dùng `clipPath` hình tròn như bản đồ thế giới.
- **Địa danh mới** (trận đánh, thành) hiện ra khi đầu mũi tên đi qua gần nó; nếu không có mũi nào đi qua thì hiện ở giữa đoạn.
- **Camera đi theo** đầu mũi tên như hiện nay. Mốc tính theo `pos` thay vì đồng hồ riêng.

**Điều khiển** (giống bản đồ thế giới):
- "Giai đoạn sau" và "Chạy": thanh lướt đều, khoảng 1,6 giây mỗi mũi tiến quân và tối thiểu 2,5 giây mỗi giai đoạn. Khi chạy, nghỉ 1 giây giữa các giai đoạn để đọc.
- Kéo tay: bản đồ đổi theo ngón tay.
- Nút giai đoạn trước, các mốc giai đoạn, hoặc kéo lùi: đổi ngay, không có hiệu ứng.
- Giảm chuyển động: nhảy nấc, vẽ đủ ngay.
- Thẻ tiêu đề hiện năm đang chạy nếu `period` của giai đoạn là năm hoặc khoảng năm (ví dụ 1426–1427 → 1426, 1427). Không đọc được năm thì chỉ hiện `period`.

**Dùng chung với `history-world`.** Phần lướt thanh trượt (`glide`, `play`, `move`) tách ra hook `useTimelineGlide` để cả hai bản đồ dùng. Phần tính vị trí xảy ra (`at`) của từng mũi, vùng và địa danh nằm trong `historyMapGeo.ts`.

## Kiểm thử
- `historyMapGeo`:
  - hàm tính `at` của mũi, vùng và địa danh: thứ tự đúng, và nằm trong đoạn `(s − 1, s]`;
  - hàm đọc năm từ `period`.
- `useTimelineGlide`: lướt từ 0 tới 1 qua các giá trị giữa; kéo lùi thì đổi ngay. Chuyển test lướt hiện có của `history-world` sang đây.
- `historyMap.test.tsx`:
  - kéo thanh tới giữa giai đoạn thì có mũi đang vẽ dở và có vùng lan một phần;
  - bản phẳng có `clipPath`.
- Xem trên trình duyệt với Lam Sơn và Tây Sơn.

## Ngoài phạm vi
- Không đổi dữ liệu bài học, schema hay cách giáo viên nhập.

## Trục thời gian (`history-timeline`) chạy dần
Phản hồi: "trục thời gian chạy dần".
- **Đường nối tô dần.** Khi chuyển mốc, đường nối giữa các mốc tô màu từ trái sang phải, khoảng 0,7 giây mỗi đoạn. Nhảy qua nhiều mốc thì các đoạn tô lần lượt, chấm của mỗi mốc sáng lên khi đường tới nơi. Lùi lại thì đường rút về ngay.
- **Nút "Chạy".** Tự đi qua từng mốc, khoảng 4 giây mỗi mốc. Dải mốc tự cuộn để mốc đang xem luôn trong tầm nhìn. Bấm lại thì dừng.
- **Ô nội dung** của mốc mới trượt lên nhẹ khi đổi mốc.
- **Giảm chuyển động:** đổi ngay, không tô dần; nút "Chạy" vẫn hoạt động.
- **Kiểm thử:**
  - nút "Chạy" đi tới mốc tiếp theo (dùng đồng hồ giả);
  - nhảy 3 mốc thì mỗi đoạn có độ trễ tăng dần;
  - giảm chuyển động thì không có độ trễ.

## Hiệu ứng tiến quân (đã làm)
Phản hồi: "2D thấy không có hiệu ứng gì hết" → "thêm hiệu ứng tiến quân vào".

Hiện tại mũi tiến quân chỉ là đường kẻ dài dần ra, không có cảm giác quân đang đi. Thêm ba hiệu ứng, áp dụng cho bản 2D và cả bản 3D:
1. **Lá cờ ở đầu mũi.** Đầu mũi tên đang vẽ mang một lá cờ nhỏ (màu của phe), có quầng sáng nhấp nháy theo nhịp bước. Mũi vẽ xong thì cờ biến mất, chỉ còn đầu mũi tên.
2. **Dòng chảy trên đường đã đi.** Trên phần đường đã vẽ có các vạch sáng chạy dọc theo hướng tiến quân, như dòng người đang di chuyển. Vạch tiếp tục chạy chậm cả khi thanh trượt đứng yên để bản đồ không "chết". Đường rút lui (nét đứt) chạy chậm hơn.
3. **Trận đánh nổ sáng.** Khi đầu mũi tới một trận thắng (★), ngôi sao bùng sáng một lần (vòng tròn lan ra rồi mờ đi) rồi mới hiện tên.

**Không đổi:** dữ liệu bài học, schema, cách điều khiển. Khi bật giảm chuyển động thì cả ba hiệu ứng đều không chạy, chỉ còn đường và ký hiệu tĩnh.

**Cách làm:**
- **Bản 2D (SVG):**
  - cờ là một nhóm `<g>` đặt tại điểm đầu mũi đang tính sẵn (`head`);
  - dòng chảy là một đường phủ lên đường đã vẽ, có `stroke-dasharray` và animation CSS `stroke-dashoffset`;
  - trận đánh có `data-burst` khi thời điểm `at` của nó vừa bị thanh trượt đi qua (lần qua theo chiều tiến).
- **Bản 3D:**
  - cờ là một nhãn HTML gắn ở đầu mũi, như nhãn địa danh;
  - dòng chảy dùng một dải băng thứ hai cùng hình, có texture vạch trượt theo thời gian (`offset` tăng mỗi khung hình);
  - trận đánh bùng sáng bằng nhãn HTML có animation CSS.

**Kiểm thử:**
- **Bản 2D:**
  - giữa giai đoạn có cờ ở đầu mũi đang vẽ;
  - mũi đã xong thì không còn cờ;
  - có đường dòng chảy.
- **Trận đánh:** thanh đi qua thời điểm của trận đánh thì có `data-burst`.
- **Giảm chuyển động:** không có cờ nhấp nháy và không có animation.
- Xem trên trình duyệt (Lam Sơn, bản phẳng và 3D).

## Camera xoay theo hướng tiến quân (đã làm, kèm nút bật/tắt, màu bản đồ cố định và quầng sáng — bảng màu theo đề xuất của Codex)
Phản hồi: "camera nó di chuyển khi qua giai đoạn khác nhưng nó không có xoay, chỉ di chuyển cam".

Hiện tại camera chỉ trượt và phóng to theo giai đoạn, lúc nào cũng nhìn về hướng bắc. Thêm phần camera tự xoay:
1. **Khi một mũi đang được vẽ:** camera xoay dần để hướng tiến của mũi đó chỉ "lên phía trên màn hình", như người xem đang đi theo đoàn quân. Hướng này lấy từ đoạn đường gần đầu mũi, làm mượt để không giật theo từng khúc quanh.
2. **Khi sang giai đoạn mới:** camera xoay theo hướng chung của các mũi trong giai đoạn đó, tức từ điểm đầu trung bình tới điểm cuối trung bình. Đồng thời camera hạ góc nghiêng một chút (khoảng 8°) để thấy rõ địa hình, rồi trở lại góc nghiêng cũ khi giai đoạn vẽ xong.
3. **Giai đoạn không có mũi tiến quân:** camera quay dần về hướng bắc.
4. **Giới hạn:** góc xoay tự động không vượt quá giới hạn xoay hiện có (±49° quanh hướng bắc). Vì vậy một mũi đi về phía nam chỉ làm camera xoay tối đa 49°, không lật ngược bản đồ.
5. **Người xem tự xoay hoặc kéo bản đồ:** camera ngừng tự xoay, giống như ngừng tự đi theo. Bấm "Camera đi theo" hoặc "Góc nhìn ban đầu" thì bật lại.
6. **Giảm chuyển động:** không tự xoay.

**Cách làm:**
- `historyMapGeo.ts`: thêm hàm `marchHeading(points, done)` trả về hướng đi (radian) gần đầu mũi, và `stageHeading(step)`.
- `MapRig`: khi đang đi theo và người xem chưa tự xoay, góc xoay mục tiêu là `HOME.theta + clamp(heading, ±turn)`, làm mượt chậm (khoảng 1,5 giây).
- Camera trong `historyMapCamera.ts`: thêm cờ "người xem đã tự xoay". Cờ này bật khi người xem kéo xoay hoặc dùng phím mũi tên, và tắt khi bấm "Góc nhìn ban đầu".

**Kiểm thử:**
- **Đo hướng:** một mũi đi về phía đông thì hướng là +90°, đi về phía bắc thì là 0. Kết quả được giới hạn trong ±49°.
- **Cờ tự xoay:** kéo xoay thì cờ bật; bấm "Góc nhìn ban đầu" thì cờ tắt.
- Xem trên trình duyệt với Lam Sơn và Tây Sơn.

### Màu cố định và phát sáng (đã duyệt 2026-10-15)
- Mũi tiến quân, cờ và vùng kiểm soát dùng màu riêng của bản đồ, giống nhau ở mọi theme. Đây là ngoại lệ người dùng yêu cầu so với quy tắc "chỉ dùng màu theme".
- Các màu là biến CSS trong `.mapColors` (`historyMap.module.css`):

  | Vai trò | Màu |
  |---|---|
  | phe ta | `#D92D2A` |
  | quân địch | `#173B7A` |
  | viền ngà | `#FFF8E7` |
  | vùng ta | `#F4845F`, viền `#B72A26` |
  | vùng địch | `#64748B`, viền `#26364A` |
  | vệt sáng | `#FFF3B0` |
  | bùng sáng | `#FFD166` |

- Độ đậm vùng kiểm soát:
  - giai đoạn đang xem: nền 0,36, viền 0,85;
  - giai đoạn cũ: nền 0,18, viền 0,48.
- Quầng sáng:
  - bản 2D: đường rộng 2,6 lần mũi tên, độ mờ nhấp nháy 0,16 → 0,30 trong 1,4 giây;
  - bản 3D: dải băng rộng 2,5 lần, cộng sáng, độ mờ 0,12 → 0,24 trong 1,5 giây.
- Giảm chuyển động: quầng sáng và vệt sáng vẫn hiện nhưng đứng yên, để vẫn phân biệt được các mũi tiến quân.
- Nút "Tự xoay camera theo hướng tiến quân" (biểu tượng la bàn), mặc định bật.
  - Tự xoay hoặc nghiêng bằng tay thì nút tắt.
  - "Góc nhìn ban đầu" bật lại.
