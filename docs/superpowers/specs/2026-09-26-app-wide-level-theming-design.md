# Đồng bộ giao diện toàn app theo cấp học — Design Spec

- Ngày: 26/09/2026
- Trạng thái: Chờ duyệt
- Phạm vi: Web `frontend/` (S1–S12, landing, cổng chọn cấp). Mobile (`mobile/`, hiện chỉ có khung 2 file) không thuộc đợt này.
- Thay thế một phần: bảng màu và font trong `DESIGN.md`, bảng màu landing ở `2026-09-25-public-landing-field-notebook-design.md`.

## 1. Mục tiêu và tiêu chí thành công

Toàn bộ web dùng một hệ thiết kế duy nhất, đổi tông theo cấp học (Tiểu học / THCS / THPT), có sáng và tối; màu môn học (`--accent`) chỉ còn là dấu nhận diện.

Hiện trạng (đo 26/09): ~1.450 class màu Tailwind thô và 99 mã hex trong `.tsx`; 358 class `dark:` không có công tắc thống nhất; `--accent` đặt trên `:root` trong `globals.css`; navbar đổi màu theo cấp bằng `body:has(...) !important`; token shadcn trung tính không liên quan tới landing.

Thành công khi:

1. `app/`, `components/`, `features/` không còn class màu Tailwind thô, mã hex, hay class `dark:` — có test chặn tái phạm.
2. 8 bảng màu (3 cấp + trung tính, × sáng/tối) đạt WCAG AA, kiểm bằng test tự động.
3. Không nháy màu (sai cấp hoặc sai chế độ) khi tải trang.
4. `pnpm turbo typecheck`, `pnpm turbo test`, `pnpm turbo build` xanh sau mỗi giai đoạn.
5. Không thụt lùi chức năng, song ngữ, hay bảo mật so với hiện tại.

Ngoài phạm vi: mobile Expo; thay đổi nội dung, API, schema DB; thêm thư viện UI mới.

## 2. Hướng thẩm mỹ: đồ dùng học tập Việt Nam theo từng cấp

Mỗi cấp mượn chất liệu từ đồ dùng học sinh cấp đó cầm hằng ngày. Bảng màu Tiểu học cũ (kem `#FFF8EF` + đất nung `#8A3E1F`) bị thay vì trùng mẫu mặc định "kem + terracotta".

| Cấp | Chất liệu | Hoạ tiết nền |
|---|---|---|
| Tiểu học | Vở ô li kẻ tím, mực tím | Bút chì, gọt bút chì, thước kẻ, hộp bút, bảng con, phấn màu |
| THCS | Giấy kẻ, bút bi xanh | Compa, ê-ke, thước đo độ, bút bi, máy tính cầm tay |
| THPT | Bảng xanh, phấn trắng | Phấn và giẻ lau, bình tam giác, máy tính cầm tay, kính lúp, bàn phím/chuột |
| Trung tính (chưa rõ cấp) | Giấy trắng | Lẫn vài món của cả ba cấp |

### 2.1 Bảng màu

| Bảng | paper | surface | ink | muted | line | action |
|---|---|---|---|---|---|---|
| primary / light | `#FBFAFE` | `#FFFFFF` | `#231B3A` | `#5A5078` | `#D9D2F0` | `#5B3FB3` |
| primary / dark | `#15122A` | `#1E1A38` | `#ECE8F8` | `#B4ACD2` | `#3A3363` | `#B9A6F7` |
| lower_secondary / light | `#F5F8FC` | `#FFFFFF` | `#14233D` | `#44566F` | `#CFDCEC` | `#1F4FA8` |
| lower_secondary / dark | `#0F1826` | `#172336` | `#E6EDF7` | `#A9B8CC` | `#2C3D57` | `#8DB3F2` |
| upper_secondary / light | `#F4F7F3` | `#FFFFFF` | `#13241B` | `#46594D` | `#D3E0D6` | `#1D5C45` |
| upper_secondary / dark | `#1C3329` | `#234034` | `#EEF2EC` | `#BCCBC1` | `#3B5A4B` | `#F2E3A0` |
| neutral / light | `#F7F7F3` | `#FFFFFF` | `#202922` | `#49574E` | `#D8DED8` | `#275B42` |
| neutral / dark | chốt trong giai đoạn 0, phải qua test tương phản | | | | | |

Màu trạng thái dùng chung:

| Vai | Light | Dark | Quy tắc |
|---|---|---|---|
| danger ("bút đỏ chấm bài") | `#B3261E` | `#FF9C8F` | Chỉ cho lỗi và phần sửa đáp án quiz |
| success | `#2F6E3A` | `#8FD19E` | Luôn kèm dấu ✓ (trùng họ với xanh THPT) |
| warning | chốt trong giai đoạn 0 | | Kèm biểu tượng |

Đo tương phản sơ bộ (26/09): ink/paper 11.9–15.7:1; muted và action trên paper/surface 6.7–10.5:1; danger/success trên surface ≥ 5.6:1. `line` (1.3–1.8:1) chỉ là dòng kẻ trang trí; viền điều khiển dùng `edge`.

Các giá trị còn thiếu (`surface-sunken`, `edge`, `action-hover`, `action-ink`, `focus`, `nav`, `*-surface`, `pattern-ink`, neutral/dark, warning) được chốt trong giai đoạn 0 và chỉ được chấp nhận khi test tương phản §6 đạt.

### 2.2 Chữ

- Một họ chữ cho toàn app: **Be Vietnam Pro** (tiêu đề và thân bài, phân biệt bằng độ đậm và cỡ). Bỏ Inter khỏi `app/layout.tsx`.
- **JetBrains Mono chỉ cho khối code**; không dùng cho nhãn, số liệu, khoảng lớp.
- Thang cỡ chữ giữ theo `DESIGN.md` §3. Đoạn đọc tối đa ~68 ký tự/dòng; thân bài không nhỏ hơn `0.875rem`.
- Không nhãn IN HOA phía trên tiêu đề; không gắn "→" vào nút; câu viết thường (sentence case).

### 2.3 Bố cục và điểm nhấn

Khung app yên tĩnh: navbar, danh sách, bảng biểu phẳng, căn trái. Điểm nhấn duy nhất là **trang đọc bài học** trình bày như trang vở của cấp đó:

```
┌ navbar (token nav) ─────────────────────────────┐
│ ┃ Tin học · Lớp 10          [nhãn vở = accent]  │
│ ┃ Bài 3. Thuật toán tìm kiếm                    │
│ ┃ ───────── dòng kẻ (line) ─────────            │
│ ┃ Lý thuyết, tối đa 68ch                        │
│ ┃ [code] [công thức] [quiz: sửa bằng bút đỏ]    │
│ ↑ lề vở                                         │
└─────────────────────────────────────────────────┘
```

- Accent môn là "nhãn vở": mảng màu nhỏ (nhãn, icon, dải lề, thanh tiến độ). Không tô nền trang, thẻ, hay nút chính.
- Chuyển động chỉ phản hồi thao tác (mở menu, chấm quiz); không fade-in theo section. Tôn trọng `prefers-reduced-motion`.

### 2.4 Hoạ tiết nền mờ

- Mỗi cấp một SVG nét mảnh một màu tại `frontend/public/patterns/<level>.svg` (< 4 KB, ô lặp ~320px, rải thưa, xoay ngẫu nhiên, tự vẽ).
- Hiển thị bằng `mask-image` trên `::before` sau nội dung; màu lấy từ `--pattern-ink`, độ đậm từ `--pattern-opacity` (~5% sáng, ~7% tối). Không JS.
- **Hiện** trên nền `paper`: landing, cổng chọn cấp, danh sách môn, hồ sơ, tiến trình, danh sách đề thi, khu vực giáo viên/admin.
- **Ẩn**: dưới cột đọc bài học; trong phòng thi đang làm bài (`/exam/[blueprintId]`); dưới mọi `surface` (nền đặc).
- Tắt khi `prefers-contrast: more` và khi in.
- Bỏ hoạ tiết cỏ bốn lá trên navbar (`frontend/public/clover.svg` không còn dùng làm nền); logo giữ nguyên.

## 3. Hệ token

### 3.1 Nguồn duy nhất

- `packages/ui/src/themes.ts`: kiểu `ThemePalette` và `THEME_PALETTES: Record<Level | 'neutral', Record<'light' | 'dark', ThemePalette>>`.
- `renderThemeCss(): string` (cùng package) sinh CSS cho mọi tổ hợp; `app/layout.tsx` (server component) in vào `<style>` trong `<head>`. Không bước build, không file sinh.
- Bảng màu `--landing-*` và `--gate-*` trong các `*.module.css` trở thành bí danh trỏ về token chung (giai đoạn 2).

### 3.2 Vai token

| Nhóm | Token |
|---|---|
| Nền và chữ | `paper`, `surface`, `surface-sunken`, `ink`, `muted` |
| Đường | `line` (trang trí), `edge` (viền điều khiển, ≥ 3:1) |
| Hành động | `action`, `action-hover`, `action-ink` (chữ trên nền action), `focus`, `nav` |
| Trạng thái | `danger`, `danger-surface`, `success`, `success-surface`, `warning`, `warning-surface` |
| Hoạ tiết | `pattern-ink`, `pattern-opacity` |
| Môn học | `accent` (do `SubjectProvider` đặt), `accent-ink` (dẫn xuất) |

CSS biến có dạng `--paper`, `--ink`… Tailwind (`packages/ui/tailwind.config` và `frontend/tailwind.config.ts`) ánh xạ thành `bg-paper`, `text-ink`, `border-edge`, `bg-action`…

Bí danh shadcn giữ lại để `components/ui` không vỡ: `background→paper`, `foreground→ink`, `card→surface`, `popover→surface`, `primary→action`, `primary-foreground→action-ink`, `secondary/muted→surface-sunken`, `muted-foreground→muted`, `border/input→edge`, `ring→focus`, `destructive→danger`.

### 3.3 Accent môn

- `SubjectProvider` giữ nguyên hợp đồng: đặt `--accent` trên thẻ bao của mình (accent lấy từ `subjects.accent_color`, dự phòng `getAccentColor`).
- `accent-ink` = `color-mix(in oklab, var(--accent) X%, var(--ink))`, tỷ lệ theo sáng/tối để chữ màu môn đọc được trên `surface`. Tỷ lệ được test với cả 29 accent trong catalog.
- Xoá `--accent`, `--accent-10`, `--accent-20` khỏi `:root` trong `globals.css`; phần nào cần nền nhạt dùng `color-mix` cục bộ trong phạm vi `SubjectProvider`.

## 4. Xác định cấp học và chế độ

### 4.1 Thẻ bao app-shell

`app/layout.tsx` bọc `NavBar` và nội dung trong `<div data-app-shell data-level="…" data-theme="…">`. Không gắn thuộc tính theme/level lên `<html>` hay `:root`. `body` chỉ nhận font; màu nền do thẻ bao quyết định. Xoá các khối `body:has([data-scipal-level…]) > header` trong `globals.css`.

### 4.2 Cấp của người dùng

Thứ tự: `profiles.preferred_education_level` (tài khoản) → `sessionStorage[LEVEL_SESSION_KEY]` (tab) → `neutral`.

- Tái sử dụng `resolveEducationLevel` và `readSessionEducationLevel` trong `features/landing/educationLevel.ts` (chuyển phần dùng chung sang vị trí trung lập, ví dụ `lib/educationLevel.ts`).
- Khi tài khoản tải hồ sơ hoặc đổi cấp trong Profile, ghi cấp đó vào `sessionStorage` để script trước khi hiển thị dùng được.

### 4.3 Cấp của nội dung

`<LevelScope level>` (client-safe, trong `packages/ui`) đặt `data-level` trên một thẻ bao con để định nghĩa lại token cho cây con. Trang môn và trang bài dùng `levelOfGrade(grade)` của nội dung. Navbar giữ cấp của người dùng; vùng nội dung theo cấp của bài.

### 4.4 Chế độ sáng/tối

- Ba lựa chọn: *Theo hệ thống* (mặc định), *Sáng*, *Tối*; lưu `localStorage['scipal-theme']` (tiện ích riêng người xem; đọc/ghi trong try/catch).
- "Theo hệ thống" = không có `data-theme`; CSS dùng `@media (prefers-color-scheme: dark)` với `[data-app-shell]:not([data-theme="light"])`.
- Nút đổi trong navbar cạnh công tắc EN/VI và trong Profile; nhãn song ngữ qua `useLanguage`.
- Tailwind `darkMode` đổi sang selector `[data-theme="dark"]`; mục tiêu là không còn class `dark:`.

### 4.5 Script trước khi hiển thị

Một script nội tuyến nhỏ ngay đầu `<body>` (trước thẻ bao được vẽ) đọc `sessionStorage` và `localStorage`, gắn `data-level`/`data-theme` lên `[data-app-shell]`. Mọi truy cập storage bọc try/catch; lỗi thì giữ `neutral` + theo hệ thống. Logic tách thành hàm thuần để test.

## 5. Primitive dùng chung (giai đoạn 1)

Chuyển `components/ui/{button,card,badge,progress,separator}.tsx` sang token. Thêm:

- `Input`, `Field` (nhãn, mô tả, lỗi dùng `danger`, liên kết `aria-describedby`)
- `Alert` (info/success/warning/danger, kèm biểu tượng)
- `EmptyState` (câu nói rõ chuyện gì và nút hành động kế tiếp)
- `Table` (tiêu đề dính, hàng có focus, cuộn ngang trong khung ở 375px)

Mọi điều khiển: vùng chạm ≥ 44px, focus hiển thị bằng `focus`, không phụ thuộc hover.

## 6. Kiểm thử

- **Tương phản** (`packages/ui`): mỗi bảng màu — `ink`, `muted`, `danger`, `success`, `warning` trên `paper`/`surface`/`surface-sunken` ≥ 4.5:1; `action-ink` trên `action` ≥ 4.5:1; `edge`, `focus` trên `paper`/`surface` ≥ 3:1; `accent-ink` của 29 accent trên `surface` ≥ 4.5:1. Chữ trên `paper` được kiểm cả khi trộn `pattern-ink` ở `pattern-opacity`.
- **`renderThemeCss`**: sinh đủ 8 tổ hợp, không có selector `:root`/`html`.
- **Xác định cấp và chế độ**: hàm thuần cho thứ tự tài khoản → session → neutral, cấp nội dung, storage ném lỗi.
- **Chặn màu thô** (`frontend`): quét `app/`, `components/`, `features/` (`.tsx`) tìm class màu Tailwind thô, hex, `dark:`; so với `frontend/theme-baseline.json` (số vi phạm theo file). Tăng thì fail; file mới phải 0; giảm thì yêu cầu hạ baseline. Giai đoạn 5 kết thúc khi baseline rỗng.
- **Trực quan**: màn hình của giai đoạn × 3 cấp (+ neutral) × sáng/tối, ở 375px và desktop, cùng focus bàn phím; ghi kết quả vào `PROJECT_STATE.md`.
- Mỗi giai đoạn: `pnpm turbo typecheck`, `pnpm turbo test`, `pnpm turbo build`.

## 7. Lộ trình

| # | Giai đoạn | Nội dung | Plan |
|---|---|---|---|
| 0 | Nền tảng | `themes.ts`, `renderThemeCss`, thẻ bao app-shell, script trước khi hiển thị, nút sáng/tối, `LevelScope`, cơ chế hoạ tiết + 1 hoạ tiết mẫu, bỏ `--accent` khỏi `:root`, bỏ Inter, test chặn màu thô + baseline, cập nhật quy tắc dự án | Plan A |
| 1 | Primitive | §5 | Plan A |
| 2 | Khung app | Navbar dùng `nav` (bỏ `!important`, bỏ hoạ tiết cỏ), footer, loading, not-found, login, landing + cổng chọn cấp sang token chung (Tiểu học sang mực tím), vẽ đủ 4 bộ hoạ tiết | Plan riêng |
| 3 | Luồng học | Trang môn, trang bài dạng trang vở, 7 block renderer, quiz sửa bằng bút đỏ, AI Tutor, glossary | Plan riêng |
| 4 | Cá nhân | Tiến trình, hồ sơ, thi thử, khảo sát | Plan riêng |
| 5 | Giáo viên/admin | Studio soạn bài, lớp học, duyệt bài, tài khoản; baseline về 0 | Plan riêng |

Mỗi giai đoạn merge được độc lập; màn hình chưa chuyển vẫn chạy nhờ bí danh shadcn và baseline cho phép.

## 8. Cập nhật tài liệu dự án

- `.agents/rules/02-domain-rules.md` §2: navbar dùng token `nav` theo cấp; `SCIPAL_GREEN` chỉ còn cho logo và `nav` của bảng trung tính. Bổ sung quy tắc: màu trong `.tsx` chỉ qua token.
- `DESIGN.md`: mở rộng phạm vi ra toàn app; thay bảng màu, font, thêm hoạ tiết, sáng/tối.
- `PROJECT_STATE.md`: ghi quyết định và tiến độ từng giai đoạn.

## 9. Rủi ro

| Rủi ro | Xử lý |
|---|---|
| Nháy màu khi tải | Script trước khi hiển thị + mặc định neutral; kiểm bằng test hàm thuần và kiểm trực quan với cache trống |
| Accent của một số môn khó đọc trên nền tối | `accent-ink` dẫn xuất + test với cả 29 accent; accent chỉ là nhãn, không làm nền chữ |
| Chuyển ~1.450 class gây thụt lùi giao diện | Chuyển theo giai đoạn, baseline chỉ giảm, kiểm trực quan mỗi giai đoạn |
| Hoạ tiết làm giảm khả năng đọc | Chỉ trên `paper`, ẩn ở vùng đọc và phòng thi, test tương phản sau khi trộn |
| Đổi bảng màu landing đã duyệt 25/09 | Được người dùng đồng ý 26/09; ghi vào `PROJECT_STATE.md` |
