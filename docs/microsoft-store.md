# Đưa SciPal lên Microsoft Store

SciPal là PWA (manifest `frontend/app/manifest.ts`, service worker `frontend/public/sw.js`), nên gói Windows được
tạo từ chính trang web bằng PWABuilder; không có code desktop riêng. App trong Store mở scipal.vercel.app trong cửa
sổ riêng, dùng được offline như PWA và tự cập nhật theo mỗi lần deploy web.

## 1. Tài khoản (làm một lần)
1. Vào https://storedeveloper.microsoft.com, đăng ký tài khoản nhà phát triển **cá nhân** (hiện miễn phí).
2. Trong Partner Center: **Apps and games → New product → MSIX or PWA app**, đặt tên **SciPal**.
3. Mở **Product management → Product identity**, ghi lại: **Package ID** (Package/Identity/Name),
   **Publisher ID** (Package/Identity/Publisher, dạng `CN=...`) và **Publisher display name**.

## 2. Tạo gói
1. Vào https://www.pwabuilder.com, dán `https://scipal.vercel.app`, bấm **Start**.
2. Kiểm tra báo cáo manifest và service worker không có lỗi đỏ.
3. **Package for stores → Windows → Generate package**, điền 3 giá trị ở bước 1.3, phiên bản bắt đầu `1.0.0`.
4. Tải về file zip (có `.msixbundle` và `.classic.appxbundle`).

## 3. Gửi duyệt
1. Partner Center → SciPal → **Start submission**.
2. **Packages**: tải lên cả hai file ở bước 2.4.
3. **Store listings (Tiếng Việt, English)**: mô tả, ảnh chụp lấy trong `frontend/public/screenshots/`
   (1280×720), icon 300×300 từ `frontend/public/icons/icon-512.png`.
4. **Properties**: danh mục *Education*; **Age ratings**: làm bảng hỏi IARC; **Privacy policy**: `https://scipal.vercel.app/privacy`.
5. **Submit**. Microsoft thường duyệt trong 1–3 ngày.

## 4. Sau khi được duyệt
Lấy link trang Store (dạng `https://apps.microsoft.com/detail/9XXXXXXXXXXX`), dán vào
`frontend/lib/pwa/stores.ts` (`MICROSOFT_STORE_URL`). Mục **Tải xuống** trên trang chủ sẽ hiện nút
**Tải từ Microsoft Store** cho người dùng Windows.

Cập nhật sau này: web deploy là app tự có bản mới. Chỉ cần gửi gói mới khi đổi tên, icon hoặc manifest.
