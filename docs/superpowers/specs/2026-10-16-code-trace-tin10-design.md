# Mô phỏng `code-trace`: chạy từng dòng chương trình Python (Tin học 10)

> Trạng thái: hướng đã duyệt trong hội thoại (các bước ghi sẵn khi soạn bài); chờ duyệt bản viết. Dùng `CodePanel` của spec `2026-10-16-algorithm-code-trace-design.md`; làm sau spec đó.

## Mục tiêu
Tin 10 KNTT, chủ đề F "Giải quyết vấn đề với sự trợ giúp của máy tính", Bài 16–32 (biến, nhập/xuất, `if`, `for`, `while`, danh sách, xâu, hàm, tham số, phạm vi biến, lỗi và gỡ lỗi). Mỗi chương trình mẫu trong bài là một khối mô phỏng: học sinh bấm chạy hoặc từng bước, thấy chữ của dòng đang chạy nổi lên và phát sáng, biến đổi giá trị và màn hình in dần ra.

Ngoài phạm vi: học sinh sửa và chạy lại code (Pyodide, dự án sau), soạn bài Tin 10 (việc nạp nội dung riêng), ngôn ngữ khác Python.

## Dữ liệu (kind mới `code-trace` trong `@scipal/types`)
```ts
{
  code: string;                 // ≤ 60 dòng, ≤ 4000 kí tự
  input: string[];              // giá trị cho các lần input(), ≤ 20
  steps: {
    line: number;               // dòng sắp chạy, 1-based, ≤ số dòng của code
    frames: {                   // khung biến, ngoài cùng trước: '<module>', rồi hàm đang gọi
      name: string;
      vars: Record<string, { repr: string; items?: string[] }>; // items cho list, tuple, str để vẽ thành ô
    }[];
    out?: string;               // phần in ra thêm sau bước này
    error?: string;             // bước cuối khi chương trình lỗi: "ZeroDivisionError: division by zero"
  }[];                          // 1–500 bước
  truncated?: boolean;          // hết 500 bước mà chương trình chưa dừng
}
```
- Zod kiểm `line` nằm trong code, `steps` 1–500, chỉ bước cuối được có `error`. Dữ liệu sai thì khối hiện thông báo lỗi chuẩn như các mô phỏng khác.
- Không có đáp án trong dữ liệu này.

## Sinh các bước khi soạn bài (`code_trace.py` ở gốc repo)
- `trace(code, inputs) -> dict` chạy chương trình trong tiến trình con, giới hạn 5 giây, dùng `sys.settrace` ghi sự kiện `line` của code bài (bỏ qua thư viện). Ở mỗi dòng: chụp biến của các khung từ `<module>` tới hàm đang chạy (bỏ tên bắt đầu bằng `__`, hàm và mô đun); `repr` của giá trị, `items` cho list/tuple/str (≤ 30 phần tử, cắt bớt có "…").
- `input()` lấy lần lượt từ `inputs` và in lời nhắc như Python thật; `print` ghi vào `out` của bước đó.
- Lỗi chạy: bước cuối có `error` là dòng cuối của traceback, `line` là dòng gây lỗi. Lỗi cú pháp: không sinh được khối, script báo lỗi để người soạn sửa.
- Các script `generate_lesson_*_tin10.py` sau này gọi `trace()` rồi ghi khối `interactive` kind `code-trace`.

## Giao diện (`codeTrace.tsx`)
- Điện thoại xếp dọc, ≥1024px hai cột: trái `CodePanel` (chỉ tab Python, `activeLine` = `steps[k].line`), phải là biến và màn hình.
- **Biến**: mỗi khung một nhóm có tên (`Chương trình chính`, `Hàm tinh_tong`), khung hàm đang chạy nổi lên trên cùng. Mỗi biến một chip, màu xoay vòng `--coral`, `--sun`, `--sky` pha nhạt; giá trị vừa đổi nảy nhẹ, biến mới xuất hiện thì trượt vào. List và xâu vẽ thành hàng ô có chỉ số 0, 1, 2… (Bài 22–25).
- **Màn hình**: khung tối giống `CodePanel`, chữ mono, hiện dần `out` tới bước hiện tại; giá trị nhập hiện màu `--sun` sau lời nhắc. Lỗi hiện dòng đỏ `--danger` pha sáng, và dòng gây lỗi trong code đổi quầng sáng sang `--danger`.
- Ghi chú bước (`aria-live`): "Dòng 3: gán `s = 6`", "Dòng 5: điều kiện `x > 0` đúng", sinh ở client từ chênh lệch biến giữa hai bước (không lưu trong dữ liệu).
- Điều khiển dùng lại của `algorithm-sim`: bước trước, chạy/dừng, bước sau, làm lại, `SpeedPicker`, "Bước k/n". `truncated` thì báo "Chương trình còn chạy tiếp, chỉ hiện 500 bước đầu".
- Editor của giáo viên (`SimulationEditorProps`) chỉ cho xem code và số bước, kèm hướng dẫn "Sửa code bằng script soạn bài"; không sửa được vì các bước phải sinh lại.

## Kiểm thử
- Python: `code_trace.py` có tự kiểm (`__main__`) cho gán, `if`, `for`, `while`, hàm có tham số, biến cục bộ che biến toàn cục, `input`, lỗi chia 0, vòng lặp vô hạn (cắt ở 500 bước).
- Zod: chấp nhận khối mẫu, từ chối `line` ngoài code, quá 500 bước, `error` không ở bước cuối.
- Giao diện: bước tiếp đổi dòng sáng và chip biến; màn hình hiện đúng `out` tới bước k; khung hàm xuất hiện và mất đi; lỗi hiện đỏ.
- `pnpm turbo typecheck`, test `@scipal/types` và `@scipal/web`; xem trình duyệt ở 1280px và 375px với một chương trình mẫu của Bài 20 và Bài 26.
