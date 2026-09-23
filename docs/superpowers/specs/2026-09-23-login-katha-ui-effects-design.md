# Thiết Kế Chi Tiết: Nâng Cấp Giao Diện & Toàn Bộ Hiệu Ứng Login SciPal Chuẩn Katha

**Ngày lập**: 2026-09-23  
**Trạng thái**: Đã duyệt (Approved) — Tiếp nhận phản hồi: thay thế ngôi sao `✨` bằng họa tiết hình thoi học thuật (`DiamondMark`)  
**Định hướng**: Phương án A — Chuyển giao trọn vẹn 100% linh hồn thẩm mỹ và 10 tầng hiệu ứng thị giác của Katha sang SciPal với hệ màu Ngọc Lục Bảo (Emerald/Mint/Gold) và cơ chế Fluid Scaling đa chiều.

---

## 1. Mục tiêu & Bối cảnh

### 1.1. Mục tiêu
- Biến trang đăng nhập của **SciPal** (`/login`) thành một trải nghiệm **"Bảo tàng Khoa học Tự nhiên Số" (Contemporary Digital Science Museum)** đẳng cấp, sang trọng, giàu cảm xúc và sống động như Katha.
- Tái lập đầy đủ **10 tầng hiệu ứng & vi tương tác (micro-interactions)** từ Katha (đã được ghi nhận trong `D:\Code\Katha\frontend\src\app\login\login.css`).
- Tối ưu hóa phản hồi thị giác trên mọi kích thước màn hình: từ màn hình máy tính 4K/2K, Full HD 1080p, đến màn hình laptop 1366×768 (hoặc Windows scale 125%/150%), tablet và mobile mà **không bị mất tỷ lệ, không bị khuất chữ và không sinh thanh cuộn dọc không đáng có**.

### 1.2. Nguyên tắc bất biến (Invariants)
- **Không hardcode màu sắc**: Mọi màu sắc liên quan đến thương hiệu SciPal đều đọc qua hệ thống token CSS (`--lg-gold`, `--lg-primary`, `--lg-shell`, v.v.).
- **Tôn trọng Trợ năng (Accessibility & a11y)**: Mọi hiệu ứng chuyển động phức tạp đều được bọc trong `@media (prefers-reduced-motion: reduce)`.
- **Song ngữ hoàn chỉnh (Bilingual First-Class)**: Toàn bộ nhãn, thông điệp lỗi, gợi ý hỗ trợ đều hoạt động song ngữ VI/EN mượt mà với `@scipal/hooks`.
- **Độ tin cậy xác thực (Server-Authoritative)**: Chỉ xử lý giao diện tại client, logic đăng nhập tuân thủ Supabase Auth chuẩn.

---

## 2. Hệ Thống Token Màu Sắc & Bề Mặt (Atmospheric Surfaces)

Katha sử dụng bảng màu Warm Ivory & Angkor Gold (Daylight) và Deep Indigo & Ritual Gold (Indigo Night). SciPal sẽ ánh xạ chuẩn sang hệ màu **Khoa học Tự nhiên THPT**:

### 2.1. Daylight Tokens (Chế độ Sáng)
- `--lg-page`: `#fbfbfa` (Nền giấy ngà cao cấp, ấm áp như trang sách nghiên cứu).
- `--lg-shell`: `#ffffff` (Bề mặt khối Folio sắc nét, tinh khôi).
- `--lg-hero`: `color-mix(in srgb, #f4f6f5 65%, #ffffff)` (Nền cột Hero với ánh sáng quang học nhẹ).
- `--lg-pane`: `#ffffff` (Nền cột Form đăng nhập thanh tịnh).
- `--lg-ink`: `#0f172a` (Màu chữ đen mực in đậm rõ ràng).
- `--lg-ink-soft`: `rgba(15, 23, 42, 0.82)` (Màu chữ phụ đề).
- `--lg-muted`: `rgba(15, 23, 42, 0.58)` (Màu placeholder, chú thích).
- `--lg-gold`: `#059669` (Xanh Ngọc Lục Bảo đặc trưng của SciPal).
- `--lg-gold-soft`: `#d1fae5` (Xanh ngọc bích pastel đệm sáng).
- `--lg-primary`: `#059669` (Màu chính của nút và điểm nhấn).
- `--lg-line`: `rgba(15, 23, 42, 0.09)` (Đường kẻ phân tách mảnh).
- `--lg-field`: `#ffffff` (Nền ô nhập liệu).
- `--lg-field-line`: `rgba(15, 23, 42, 0.16)` (Viền ô nhập liệu).
- `--lg-field-focus-line`: `#059669` (Viền ô nhập khi focus).
- `--lg-field-focus-ring`: `rgba(5, 150, 105, 0.18)` (Vầng hào quang khi focus).

### 2.2. Emerald Night Tokens (Chế độ Tối)
- `--lg-page`: `#030712` (Đêm đen vũ trụ sâu thẳm).
- `--lg-shell`: `#090d16` (Bề mặt phiến đá thạch anh tối).
- `--lg-hero`: `#060b13` (Nền sâu của cột Hero).
- `--lg-pane`: `#090d16` (Cột Form đăng nhập trầm ổn).
- `--lg-ink`: `#f8fafc` (Chữ trắng ngọc trai sáng rõ).
- `--lg-ink-soft`: `rgba(248, 250, 252, 0.84)` (Chữ trắng mềm).
- `--lg-muted`: `rgba(248, 250, 252, 0.55)` (Chữ xám dịu mắt).
- `--lg-gold`: `#10b981` (Xanh ngọc lục bảo phát sáng dạ quang).
- `--lg-gold-soft`: `#6ee7b7` (Xanh mint sáng nhẹ).
- `--lg-primary`: `#10b981` (Xanh ngọc sáng dạ quang).
- `--lg-line`: `rgba(16, 185, 129, 0.16)` (Đường kẻ ngọc dạ quang).
- `--lg-field`: `#111622` (Nền ô nhập liệu tối sâu, nổi khối).
- `--lg-field-line`: `rgba(16, 185, 129, 0.22)` (Viền dạ quang).
- `--lg-field-focus-line`: `#10b981` (Viền sáng nét khi focus).
- `--lg-field-focus-ring`: `rgba(16, 185, 129, 0.26)` (Hào quang ngọc khi gõ phím).

---

## 3. Kiến Trúc 10 Tầng Hiệu Ứng Thị Giác (The 10 Effects)

### Tầng 1: Living Photo Cinematic Drift (Ảnh trôi 24s)
- **Mô tả**: Bức ảnh/khối mô phỏng khoa học tự nhiên ở cột Hero không đứng yên mà từ từ phóng to và dịch chuyển tọa độ 3D theo chu kỳ thở 24 giây (`katha-login-photo-drift`).
- **Kỹ thuật**:
  ```css
  @keyframes katha-login-photo-drift {
    from { transform: scale(1.02) translate3d(-0.4%, 0.2%, 0); }
    to { transform: scale(1.08) translate3d(0.5%, -0.4%, 0); }
  }
  ```
- **Tác dụng**: Biến bức ảnh carousel thành một khung cửa sổ điện ảnh sống động.

### Tầng 2: Photo Sheen Sweep (Vệt sáng lướt qua ảnh)
- **Mô tả**: Khi người dùng lướt chuột qua (`:hover`) hoặc focus vào carousel, một dải quang phổ góc 112° quét lướt qua mặt kính (`katha-login-photo::after`).
- **Kỹ thuật**: `transition: opacity 700ms ease, transform 1.6s ease; transform: translateX(45%);`.

### Tầng 3: Botanical Vine Sway (Dây leo helix đung đưa)
- **Mô tả**: Hai dải viền trang trí thực vật/chuỗi xoắn gen ở hai mép sườn hero nhẹ nhàng lắc lư nhịp nhàng theo chu kỳ 12 giây ngược pha nhau (`login-vine-sway`).

### Tầng 4: Tactile Neuromorphic Inputs (Ô nhập liệu nổi khối xúc giác)
- **Mô tả**: Dựa trên thiết kế xúc giác cao cấp từ Katha (Uiverse.io).
- **Light mode**: Đổ bóng lòng sâu kép (`--login-inset: inset 4px 4px 8px rgba(0,0,0,0.06), inset -4px -4px 8px #ffffff`).
- **Dark mode**: Khối nổi 3D đa tầng với gradient nền `linear-gradient(135deg, #18202e 0%, #0e121a 100%)` cùng đổ bóng nổi `box-shadow: 6px 6px 14px #040609, -4px -4px 12px #1c2637`. Khi focus, tỏa ra vầng hào quang ngọc bích rực rỡ (`--login-glow`).

### Tầng 5: Button Dynamic Gloss & Radiant Aura (Nút bấm lóa sáng & Nảy xúc giác)
- **Mô tả**: Nút đăng nhập sở hữu hiệu ứng bóng gương tráng bạc (`katha-login-button-gloss`) lướt qua khi rê chuột, kết hợp hiệu ứng nảy nhẹ quang học và vầng hào quang rực rỡ.

### Tầng 6: Academic Diamond Mark ⬦ (Họa tiết hình thoi học thuật)
- **Mô tả**: Thay thế biểu tượng ngôi sao emoji `✨` bằng họa tiết hình thoi vector học thuật (`DiamondMark`) sắc sảo, thanh lịch đồng bộ với mấu ngọc ở Seam divider. Họa tiết có ánh sáng viền xanh ngọc bích nhẹ nhàng, tạo nét tôn nghiêm và khoa học.

### Tầng 7: Anti-Autofill Ugly Box (Triệt tiêu nền vàng trình duyệt)
- **Mô tả**: Trình duyệt Chromium thường ép nền màu vàng/xanh khi chọn tài khoản đã lưu, phá vỡ thiết kế. Sử dụng kỹ thuật `box-shadow: 0 0 0 1000px var(--lg-field) inset` kết hợp `transition: background-color 9999s` để giữ bề mặt ô nhập luôn hoàn hảo.

### Tầng 8: Seam Hairline Divider Glow (Chỉ chia Folio đính ngọc)
- **Mô tả**: Đường chỉ phát sáng 1px ở ranh giới 56/44 folio với gradient mờ dần 2 đầu, ở tâm đính viên ngọc hình thoi `katha-login-seam span`.

### Tầng 9: Fluid Viewport-Height Scale (Co giãn tỷ lệ toàn diện)
- **Mô tả**: Tự động nhận diện chiều cao và chiều rộng màn hình qua hàm `clamp()` và media queries (`max-height: 840px`, `max-height: 680px`), nén nhẹ tỷ lệ của form từ 15%–20% trên màn hình laptop để luôn giữ khoảng đệm thoáng đãng cho mascot bung bong bóng thoại lên trên mà không bị cắt cụt.

### Tầng 10: Spring Physics & Backdrop Blur (Gia tốc vật lý)
- **Mô tả**: Hộp thoại hỗ trợ (Help Modal) và các thông báo lỗi nhập liệu xuất hiện với gia tốc lò xo tự nhiên (`cubic-bezier(0.22, 1, 0.36, 1)`) trên nền kính mờ (`backdrop-filter: blur(6px)`).

---

## 4. Bố Cục & Cấu Trúc Thành Phần

```
┌────────────────────────────────────────────────────────────────────────┐
│  KATHA-LOGIN-PAGE (100dvh, edge-to-edge, overflow-x: clip)            │
│  ┌──────────────────────────────┬────────────────────────────────────┐ │
│  │ HERO PANE (56fr)             │ PANE (44fr)                        │ │
│  │                              │ ┌────────────────────────────────┐ │ │
│  │ • Eyebrow: SciPal KHTN       │ │ THEME TOGGLE (Sun/Moon Knob)   │ │ │
│  │ • Title: Không gian KHTN     │ └────────────────────────────────┘ │ │
│  │ • Subtitle: Tin học, Lý, Hóa │ • HEADER ROW:                      │ │
│  │ • CAROUSEL PHOTO (Drift 24s) │   [🍀 SCIPAL LAB]   [MASCOT CHIBI] │ │
│  │   - Slide Badge [Term·Tag]   │                     [BUBBLE POP UP]│ │
│  │   - Sheen Sweep hover        │ • HEADING: Đăng nhập [DiamondMark] │ │
│  │   - Caption bar              │ • FORM (Tactile Inset Inputs):     │ │
│  │ • Carousel Dots Navigation   │   - Email input (anti-autofill)    │ │
│  │ • Botanical Vines (12s sway) │   - Password input + eye toggle    │ │
│  │ • Archive stamp footer       │   - Remember me + Help modal link  │ │
│  │                              │   - Submit Button (Gloss sweep)    │ │
│  │                              │   - Security footnote TLS 1.3      │ │
│  │                              │ • LANGUAGE SWITCH (Plaque VI/EN)   │ │
│  └──────────────────────────────┴────────────────────────────────────┘ │
│                     SEAM DIVIDER (1px Glowing Line)                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Kế Hoạch Xác Minh & Kiểm Thử (Verification Plan)

1. **Kiểm tra TypeScript**: `pnpm turbo typecheck` đảm bảo 7/7 package sạch lỗi.
2. **Kiểm tra Unit Test**: `pnpm turbo test` đảm bảo 43/43 tests vượt qua không có hồi quy.
3. **Kiểm tra Hiển thị & Hoạt ảnh Trực quan**:
   - Kiểm tra hiệu ứng trôi ảnh 24s (`photo-drift`) và quét sáng (`photo-sheen`).
   - Kiểm tra ô input có đổ bóng âm dương (neuromorphic) và phát sáng khi focus.
   - Kiểm tra nút Submit có tia sáng quét lóa khi hover.
   - Kiểm tra ngôi sao ✨ có tỏa hào quang.
   - Kiểm tra Mascot có xoay đầu theo chuột và bong bóng thoại pop LÊN trên đầu mà không bị chạm mép ở mọi độ phân giải (1080p, laptop 768p, thu nhỏ cửa sổ).
4. **Kiểm tra Chế độ Trợ năng (Reduced Motion)**:
   - Khi bật `prefers-reduced-motion: reduce`, các chuyển động nặng dừng lại êm ái, giữ lại độ tĩnh lặng thanh nhã.
