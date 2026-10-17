# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_24_tin12.py
from generate_tin_common import T, build, configure, mc, tf, web_block

configure(12, "Ứng dụng tin học", "Applied informatics", "Tin học ứng dụng")

slug = "xay-dung-phan-dau-trang-web-bai-24-tin12"
title_vi = "Bài 24. Xây dựng phần đầu trang web"
title_en = "Lesson 24. Building the header of a web page"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


HEADER_HTML = """<div class="note">Trang đang được xây dựng, mời bạn ghé lại sau.</div>
<header>
  <div class="bar">
    <span class="logo">VN</span>
    <span class="site">Việt Nam – Vẻ đẹp tiềm ẩn</span>
  </div>
  <div class="hero">
    <h1>Việt Nam</h1>
    <h2>Vẻ đẹp tiềm ẩn</h2>
    <p>Việt Nam – đi mãi mà vẫn luôn bất ngờ!</p>
  </div>
</header>"""

HEADER_CSS = """.note { background: #fde68a; color: #422006; text-align: center; font-size: 13px; padding: 4px; }
header { background: linear-gradient(135deg, #14532d, #0f766e); color: #fff; }
.bar { display: flex; align-items: center; gap: 10px; padding: 8px 14px; }
.logo { background: #fde68a; color: #14532d; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
.site { font-size: 14px; letter-spacing: .5px; }
.hero { padding: 26px 14px 30px; }
.hero h1 { margin: 0; font-size: 36px; }
.hero h2 { margin: 0 0 6px; font-size: 22px; font-weight: 400; }
.hero p { margin: 0; font-size: 14px; font-style: italic; }"""

TYPES_HTML = """<div class="kind cover">
  <b>Bìa</b>
  <span>lớn nhất</span>
</div>
<div class="kind big">
  <b>Biểu ngữ lớn</b>
  <span>cao vừa</span>
</div>
<div class="kind banner">
  <b>Biểu ngữ</b>
  <span>thấp hơn</span>
</div>
<div class="kind only">
  <b>Chỉ có tiêu đề</b>
  <span>nhỏ nhất, không có ảnh nền</span>
</div>"""

TYPES_CSS = """.kind { background: #0f766e; color: #fff; margin-bottom: 8px; padding: 10px 14px; display: flex; flex-direction: column; justify-content: flex-end; border-radius: 6px; }
.kind span { font-size: 12px; opacity: .85; }
.cover { height: 130px; }
.big { height: 90px; }
.banner { height: 56px; }
.only { height: auto; background: transparent; color: inherit; border: 2px dashed #0f766e; }"""

PHONE_HTML = """<div class="phone">
  <div class="top">
    <span class="menu">&#9776;</span>
    <span class="logo">VN</span>
    <span class="name">Vẻ đẹp tiềm ẩn</span>
  </div>
  <div class="hero">
    <h2>Việt Nam</h2>
    <p>Vẻ đẹp tiềm ẩn</p>
  </div>
  <p class="cap">Xem trước trên điện thoại: bảng chọn thu gọn thành biểu tượng ba gạch.</p>
</div>"""

PHONE_CSS = """.phone { width: 260px; margin: 0 auto; border: 3px solid #475569; border-radius: 18px; overflow: hidden; }
.top { display: flex; align-items: center; gap: 8px; background: #14532d; color: #fff; padding: 8px 10px; }
.menu { font-size: 20px; }
.logo { background: #fde68a; color: #14532d; font-weight: 700; padding: 1px 6px; border-radius: 4px; font-size: 13px; }
.name { font-size: 13px; }
.hero { background: linear-gradient(135deg, #14532d, #0f766e); color: #fff; padding: 24px 12px; }
.hero h2 { margin: 0; font-size: 24px; }
.hero p { margin: 0; font-size: 13px; }
.cap { font-size: 12px; padding: 6px 10px; margin: 0; }"""

blocks = [
    T(
        "### Mục tiêu bài học\n\nSau bài này, bạn có thể:\n\n- nhận biết **ba phần của giao diện đầu tiên** của Google Sites và các vùng chức năng khi tạo phần đầu trang;\n- phân biệt **tên tệp lưu trữ** trang web (trong Google Drive) với **tên trang web**;\n- thiết lập **logo, favicon, thông báo, loại tiêu đề, ảnh nền và tiêu đề trang**;\n- **xem trước** trang trên điện thoại, máy tính bảng, máy tính, rồi **công bố** (xuất bản) và lấy địa chỉ URL.",
        "### Learning goals\n\nAfter this lesson, you can:\n\n- recognise **the three parts of the first interface** of Google Sites and the functional areas used to create a header;\n- tell the **file name** of a site (in Google Drive) from the **site name**;\n- set up the **logo, favicon, announcement, header type, background image and page title**;\n- **preview** the page on a phone, tablet and computer, then **publish** it and copy the URL.",
    ),
    T(
        "### 1. Giao diện đầu tiên của Google Sites\n\nGoogle Sites là ứng dụng **miễn phí** trong hệ sinh thái Google, giúp người dùng không chuyên tin học vẫn cùng xây dựng và xuất bản được trang web. Google Sites chọn hướng tiếp cận **trực quan**: giao diện như một hệ soạn thảo chuyên dụng, không cần biết HTML, CSS hay JavaScript.\n\nĐể vào, đăng nhập tài khoản Google rồi nhập `sites.google.com` ở thanh địa chỉ trình duyệt. Giao diện đầu tiên có **ba phần**:\n\n| Phần | Nội dung |\n|---|---|\n| (1) trên cùng | ô **tìm kiếm** và biểu tượng mở **danh sách các ứng dụng** khác của Google |\n| (2) | các lựa chọn để **tạo một trang web mới** |\n| (3) | danh sách các **trang web đã mở gần đây** |",
        "### 1. The first interface of Google Sites\n\nGoogle Sites is a **free** application in Google's ecosystem that lets non-specialists build and publish web pages together. It takes a **visual** approach: an interface like a dedicated editor, with no need to know HTML, CSS or JavaScript.\n\nTo enter, sign in to a Google account and type `sites.google.com` in the browser's address bar. The first interface has **three parts**:\n\n| Part | Content |\n|---|---|\n| (1) top | a **search** box and an icon opening the **list of other Google apps** |\n| (2) | the options to **create a new site** |\n| (3) | the list of **recently opened sites** |",
    ),
    T(
        "### 2. Giao diện tạo phần đầu trang\n\nChọn biểu tượng dấu cộng để tạo trang web mới. Các **vùng chức năng** của giao diện làm phần đầu trang:\n\n| Vùng | Chức năng |\n|---|---|\n| **Trang web không có tiêu đề** | nhập **tên tệp lưu trữ** trang web trong Google Drive |\n| **Nhập tên trang web** | nhập **logo**, **favicon** và **tên trang web** |\n| **Thay đổi hình ảnh** | chọn **hình nền** cho phần đầu trang |\n| **Loại tiêu đề** | chọn **loại tiêu đề**, bốn loại theo kích thước từ lớn đến nhỏ: **Bìa**, **Biểu ngữ lớn**, **Biểu ngữ**, **Chỉ có tiêu đề** |\n| **Tiêu đề trang** | nhập **tiêu đề chính** và **tiêu đề phụ** |\n| Khu vực bảng chọn | thiết lập **thanh điều hướng** (xem ở các bài sau) |\n\nChú ý **phân biệt**: tên tệp lưu trữ (để em nhận ra tệp trong Drive) khác với tên trang web (hiện ở đầu trang và trên tab trình duyệt, nên ngắn gọn).",
        "### 2. The interface for creating the header\n\nChoose the plus icon to create a new site. The **functional areas** of the header-building interface:\n\n| Area | Function |\n|---|---|\n| **Untitled site** | enter the **file name** of the site in Google Drive |\n| **Enter site name** | enter the **logo**, **favicon** and **site name** |\n| **Change image** | choose the **background image** of the header |\n| **Header type** | choose the type of header: from largest to smallest, **Cover**, **Large banner**, **Banner**, **Title only** |\n| **Page title** | enter the **main title** and the **subtitle** |\n| Menu area | set up the **navigation bar** (covered in later lessons) |\n\nNote the **difference**: the file name (so you can recognise the file in Drive) is not the site name (shown in the header and on the browser tab, and best kept short).",
    ),
    web_block(
        sim("Loại tiêu đề: Bìa, Biểu ngữ lớn, Biểu ngữ, Chỉ có tiêu đề", "Header types: Cover, Large banner, Banner, Title only", "Bốn loại chỉ khác nhau về chiều cao của phần đầu trang, từ lớn nhất đến nhỏ nhất.", "The four types differ only in the height of the header, from largest to smallest."),
        TYPES_HTML,
        TYPES_CSS,
        460,
    ),
    T(
        "### 3. Các bước tạo phần đầu trang\n\n1. **Nhập tên tệp lưu trữ**: nháy vào dòng *Trang web không có tiêu đề* và đặt tên gợi nhớ.\n2. **Logo, favicon, tên trang, thông báo**:\n   - tệp ảnh logo và favicon có thể là PNG, JPG hoặc GIF; logo thường hình chữ nhật, favicon **hình vuông** cỡ 16 × 16, 32 × 32 hoặc 48 × 48 pixel;\n   - nháy ô *Nhập tên trang web*, chọn *Thêm biểu tượng* để mở cửa sổ **Cài đặt**, vào mục **Hình ảnh thương hiệu** để đặt logo và favicon, rồi nhập tên trang (nên ngắn gọn);\n   - muốn có thông báo đầu trang: chọn *Phần thông báo*, nhập nội dung vào ô *Lời nhắn*, chọn màu chữ và bật *Hiển thị phần thông báo*.\n3. **Kích thước, ảnh nền**: chọn *Loại tiêu đề*; chọn *Thay đổi hình ảnh* rồi *Tải lên* (ảnh từ máy), hoặc chọn từ Google Drive, Google Photos, Internet. Có thể **di chuyển hình nền** và bật chế độ **tự động điều chỉnh độ sáng** hình nền để chữ dễ đọc.\n4. **Tiêu đề trang**: nháy *Tiêu đề trang* và nhập; có thể gồm tiêu đề chính, phụ, khẩu hiệu. Đổi cỡ chữ, phông, màu, căn lề, dãn dòng ở các bảng chọn. Nhấn Enter hoặc Shift + Enter để xuống dòng.\n5. **Xem trước, chỉnh sửa**: nháy biểu tượng *Xem trước*, rồi xem trên điện thoại, máy tính bảng hoặc máy tính.\n6. **Xuất bản**: nháy nút **Công bố**; sao chép địa chỉ URL để truy cập trang trên Internet và chia sẻ cho nhóm cùng phát triển.",
        "### 3. Steps to create the header\n\n1. **Enter the file name**: click the line *Untitled site* and give it a memorable name.\n2. **Logo, favicon, site name, announcement**:\n   - logo and favicon files may be PNG, JPG or GIF; the logo is usually rectangular, the favicon **square** at 16 × 16, 32 × 32 or 48 × 48 pixels;\n   - click the *Enter site name* box, choose *Add icon* to open the **Settings** window, go to **Brand images** to set the logo and favicon, then type the site name (short is best);\n   - for an announcement above the header: choose *Announcement*, type the text in the *Message* box, pick the text colour and switch on *Show announcement*.\n3. **Size and background**: choose *Header type*; choose *Change image* then *Upload* (a picture from your computer), or pick from Google Drive, Google Photos or the Internet. You can **move the background** and switch on **automatic brightness adjustment** so text stays readable.\n4. **Page title**: click *Page title* and type; it may have a main title, subtitle and slogan. Change size, font, colour, alignment and line spacing in the menus. Press Enter or Shift + Enter for a new line.\n5. **Preview and edit**: click the *Preview* icon, then view on a phone, tablet or computer.\n6. **Publish**: click the **Publish** button; copy the URL to reach the page on the Internet and share it with the team.",
    ),
    web_block(
        sim("Phần đầu trang “Việt Nam – Vẻ đẹp tiềm ẩn”", "The header of “Vietnam – Hidden Beauty”", "Thông báo, logo, tên trang, rồi tiêu đề chính cỡ lớn, tiêu đề phụ và khẩu hiệu trên nền ảnh.", "The announcement, logo, site name, then a large main title, subtitle and slogan on the background."),
        HEADER_HTML,
        HEADER_CSS,
        340,
    ),
    T(
        "### Mẹo thiết kế phần đầu trang\n\n- **Chữ phải đọc rõ trên ảnh nền:** chọn ảnh nền không quá rối, bật tự động điều chỉnh độ sáng, dùng chữ sáng trên nền sẫm hoặc ngược lại.\n- **Ngắn gọn:** tên trang ngắn, tiêu đề chính cỡ lớn, tiêu đề phụ và khẩu hiệu cỡ nhỏ hơn, như \"Việt Nam\" (chính) – \"Vẻ đẹp tiềm ẩn\" (phụ) – một câu khẩu hiệu.\n- **Bản quyền:** dùng ảnh của chính mình, ảnh được phép sử dụng, hoặc ảnh do công cụ AI tạo ra; không lấy ảnh của người khác khi chưa được phép. Logo và favicon nên do nhóm tự thiết kế để mang dấu ấn riêng.\n- **Nhất quán:** màu và phông chữ phần đầu trang cần hợp với bảng màu đã chọn ở Bài 23.",
        "### Tips for designing the header\n\n- **Text must read clearly on the background:** pick a background that is not too busy, switch on automatic brightness, use light text on dark or the reverse.\n- **Keep it short:** a short site name, a large main title, a smaller subtitle and slogan, like \"Vietnam\" (main) – \"Hidden Beauty\" (sub) – a slogan line.\n- **Copyright:** use your own pictures, pictures you are allowed to use, or pictures made by an AI tool; do not take other people's pictures without permission. The team should design its own logo and favicon to give the site its own identity.\n- **Consistency:** the header's colours and fonts should match the palette chosen in Lesson 23.",
    ),
    web_block(
        sim("Xem trước trên điện thoại", "Previewing on a phone", "Trên màn hình hẹp, bảng chọn thu gọn thành biểu tượng ba gạch; phần đầu trang vẫn giữ logo, tên và tiêu đề.", "On a narrow screen the menu shrinks to a three-bar icon; the header keeps the logo, name and title."),
        PHONE_HTML,
        PHONE_CSS,
        340,
    ),
    T(
        "### Vận dụng: đầu trang cho đề tài “Những bài ca đi cùng năm tháng”\n\nTrang web giới thiệu những bản nhạc, nhạc sĩ, ca sĩ được nhiều thế hệ yêu thích trong các giai đoạn đấu tranh giành độc lập và xây dựng đất nước. Hãy làm đầu trang theo các bước ở trên:\n\n1. đặt **tên tệp** gợi nhớ và **tên trang** ngắn (ví dụ \"Bài ca năm tháng\");\n2. thiết kế **logo** (hình chữ nhật) và **favicon** (hình vuông), chọn **ảnh nền** hợp chủ đề;\n3. chọn **loại tiêu đề** phù hợp, nhập tiêu đề chính, phụ và khẩu hiệu;\n4. **xem trước** trên ba thiết bị, chỉnh sửa rồi **công bố**.",
        "### Application: the header for “Songs through the years”\n\nThis site presents songs, composers and singers loved by generations in the years of the struggle for independence and nation building. Make the header with the steps above:\n\n1. give a memorable **file name** and a short **site name** (for example \"Songs through the years\");\n2. design a **logo** (rectangular) and a **favicon** (square), choose a **background image** that fits the theme;\n3. choose a suitable **header type**, type the main title, subtitle and slogan;\n4. **preview** on three devices, edit, then **publish**.",
    ),
    T(
        "### Tóm tắt và tự kiểm tra\n\n| Nội dung | Ghi nhớ |\n|---|---|\n| Giao diện đầu tiên | (1) tìm kiếm và ứng dụng Google · (2) tạo trang mới · (3) trang gần đây |\n| Hai tên khác nhau | tên **tệp lưu trữ** (Drive) và tên **trang web** |\n| Logo / favicon | logo hình chữ nhật; favicon hình vuông 16, 32 hoặc 48 px; đặt trong *Hình ảnh thương hiệu* |\n| Loại tiêu đề | Bìa > Biểu ngữ lớn > Biểu ngữ > Chỉ có tiêu đề |\n| Ảnh nền | *Thay đổi hình ảnh*; di chuyển; tự động chỉnh độ sáng |\n| Hoàn tất | *Xem trước* (3 thiết bị) rồi *Công bố*, sao chép URL |\n\n**Tự kiểm tra:** em nhập tên tệp ở đâu? (đáp án: dòng *Trang web không có tiêu đề*). Muốn xem phần đầu trang trên điện thoại trước khi xuất bản em dùng chức năng nào? (đáp án: *Xem trước*, chọn biểu tượng điện thoại).",
        "### Summary and self-check\n\n| Topic | Remember |\n|---|---|\n| First interface | (1) search and Google apps · (2) create a site · (3) recent sites |\n| Two different names | the **file name** (Drive) and the **site name** |\n| Logo / favicon | logo rectangular; favicon square 16, 32 or 48 px; set in *Brand images* |\n| Header type | Cover > Large banner > Banner > Title only |\n| Background | *Change image*; move it; automatic brightness |\n| Finish | *Preview* (3 devices) then *Publish*, copy the URL |\n\n**Self-check:** where do you type the file name? (answer: the line *Untitled site*). Which function shows the header on a phone before publishing? (answer: *Preview*, choosing the phone icon).",
    ),
]

questions = [
    mc("tin12-b24-mc-01", 1, "Google Sites tự động lưu trang web đang tạo vào đâu?", "Where does Google Sites automatically save the site being built?",
       "Trang web làm bằng Google Sites được lưu trên Google Drive.", "A site built with Google Sites is stored on Google Drive.", "B",
       ("Google Docs", "Google Docs"), ("Google Drive", "Google Drive"), ("Google Photos", "Google Photos"), ("Google Sheets", "Google Sheets")),
    mc("tin12-b24-mc-02", 1, "Trong giao diện đầu tiên của Google Sites, phần trên cùng có chức năng gì?", "In the first interface of Google Sites, what does the top part do?",
       "Phần trên cùng có ô tìm kiếm và biểu tượng mở danh sách các ứng dụng khác của Google.", "The top part has the search box and an icon opening the list of other Google apps.", "C",
       ("Hiển thị quảng cáo", "Show advertisements"), ("Hiển thị thông báo bảo trì", "Show maintenance notices"), ("Chứa ô tìm kiếm và biểu tượng truy cập các ứng dụng Google", "Hold the search box and the icon for Google apps"), ("Cung cấp bài kiểm tra", "Provide a quiz")),
    mc("tin12-b24-mc-03", 1, "Phần thứ hai của giao diện đầu tiên trong Google Sites chứa gì?", "What does the second part of the first Google Sites interface contain?",
       "Phần thứ hai có các lựa chọn để tạo một trang web mới.", "The second part has the options to create a new site.", "D",
       ("Danh sách trang đã mở gần đây", "The list of recently opened sites"), ("Biểu đồ thống kê truy cập", "Visit statistics charts"), ("Ô tìm kiếm", "The search box"), ("Các lựa chọn để tạo một trang web mới", "The options to create a new site")),
    mc("tin12-b24-mc-04", 1, "Tên tệp lưu trữ trang web trong Google Drive được nhập vào đâu?", "Where do you enter the file name of the site in Google Drive?",
       "Tên tệp lưu trữ nhập ở dòng Trang web không có tiêu đề.", "The file name is entered on the line Untitled site.", "A",
       ("Dòng Trang web không có tiêu đề", "The line Untitled site"), ("Ô Nhập tên trang web", "The Enter site name box"), ("Phần thông báo đầu trang", "The header announcement"), ("Vùng Tiêu đề trang", "The Page title area")),
    mc("tin12-b24-mc-05", 2, "Logo, favicon và tên trang web được thiết lập trong vùng nào?", "In which area are the logo, favicon and site name set?",
       "Ô Nhập tên trang web là vùng nhập logo, favicon và tên trang web.", "The Enter site name box is where the logo, favicon and site name are entered.", "B",
       ("Trang web không có tiêu đề", "Untitled site"), ("Nhập tên trang web", "Enter site name"), ("Loại tiêu đề", "Header type"), ("Thay đổi hình ảnh", "Change image")),
    mc("tin12-b24-mc-06", 2, "Loại tiêu đề nào có kích thước lớn nhất?", "Which header type is the largest?",
       "Các loại theo kích thước từ lớn đến nhỏ là Bìa, Biểu ngữ lớn, Biểu ngữ, Chỉ có tiêu đề.", "From largest to smallest the types are Cover, Large banner, Banner, Title only.", "C",
       ("Chỉ có tiêu đề", "Title only"), ("Biểu ngữ", "Banner"), ("Bìa", "Cover"), ("Biểu ngữ lớn", "Large banner")),
    mc("tin12-b24-mc-07", 2, "Favicon của trang web có dạng và kích thước như thế nào?", "What shape and size does a website favicon have?",
       "Favicon thường là hình vuông cỡ 16 × 16, 32 × 32 hoặc 48 × 48 pixel.", "A favicon is usually square, 16 × 16, 32 × 32 or 48 × 48 pixels.", "D",
       ("Hình chữ nhật dài 1000 pixel", "A rectangle 1000 pixels long"), ("Hình tròn 5 pixel", "A circle 5 pixels wide"), ("Hình tam giác", "A triangle"), ("Hình vuông cỡ 16 × 16, 32 × 32 hay 48 × 48 pixel", "A square 16 × 16, 32 × 32 or 48 × 48 pixels")),
    mc("tin12-b24-mc-08", 2, "Muốn xem trang trên điện thoại, máy tính bảng hay máy tính trước khi xuất bản, em dùng chức năng nào?", "Which function lets you view the site on a phone, tablet or computer before publishing?",
       "Chức năng Xem trước cho phép chọn xem trên điện thoại, máy tính bảng hoặc máy tính.", "The Preview function lets you view on a phone, tablet or computer.", "A",
       ("Xem trước", "Preview"), ("Công bố", "Publish"), ("Thêm biểu tượng", "Add icon"), ("Thay đổi hình ảnh", "Change image")),
    mc("tin12-b24-mc-09", 2, "Muốn xuất bản trang web lên Internet, em nháy chuột vào nút lệnh nào?", "Which button do you click to publish the site on the Internet?",
       "Nút Công bố dùng để xuất bản; sau đó có thể sao chép địa chỉ URL.", "The Publish button publishes the site; afterwards you can copy the URL.", "B",
       ("Xem trước", "Preview"), ("Công bố", "Publish"), ("Cài đặt", "Settings"), ("Tiêu đề trang", "Page title")),
    mc("tin12-b24-mc-10", 2, "Để đổi hình nền của phần đầu trang, em dùng lệnh nào?", "Which command changes the background image of the header?",
       "Lệnh Thay đổi hình ảnh mở bảng chọn tải ảnh lên hoặc chọn ảnh từ Drive, Photos, Internet.", "The Change image command opens the choice to upload or pick an image from Drive, Photos or the Internet.", "C",
       ("Loại tiêu đề", "Header type"), ("Nhập tên trang web", "Enter site name"), ("Thay đổi hình ảnh", "Change image"), ("Phần thông báo", "Announcement")),
    mc("tin12-b24-mc-11", 3, "Muốn đặt thông báo ở trên phần đầu trang (như trang đang xây dựng), em làm cách nào?", "How do you place an announcement above the header (such as the site being under construction)?",
       "Chọn Phần thông báo, nhập nội dung vào ô Lời nhắn, chọn màu chữ và bật Hiển thị phần thông báo.", "Choose Announcement, type the text in the Message box, pick the text colour and switch on Show announcement.", "D",
       ("Nhập thông báo vào dòng Trang web không có tiêu đề", "Type it on the Untitled site line"), ("Đổi Loại tiêu đề sang Bìa", "Change Header type to Cover"), ("Tải lên một ảnh nền mới", "Upload a new background"), ("Chọn Phần thông báo, nhập Lời nhắn và bật Hiển thị phần thông báo", "Choose Announcement, type the Message and switch on Show announcement")),
    mc("tin12-b24-mc-12", 3, "Trình tự nào hợp lí nhất để làm phần đầu trang và đưa lên Internet?", "Which order is the most sensible for making the header and putting it on the Internet?",
       "Nhập tên tệp, đặt logo/favicon và tên trang, chọn loại tiêu đề và ảnh nền, nhập tiêu đề, xem trước rồi công bố.", "Enter the file name, set the logo/favicon and site name, choose the header type and background, type the title, preview, then publish.", "A",
       ("Tên tệp → logo, favicon, tên trang → loại tiêu đề, ảnh nền → tiêu đề → xem trước → công bố", "File name → logo, favicon, site name → header type, background → title → preview → publish"), ("Công bố → tên tệp → xem trước → tiêu đề", "Publish → file name → preview → title"), ("Xem trước → công bố → logo → tên tệp", "Preview → publish → logo → file name"), ("Tiêu đề → công bố → ảnh nền → tên tệp", "Title → publish → background → file name")),
]

truefalse = [
    tf("tin12-b24-tf-01", 2, "Xét giao diện đầu tiên của Google Sites.", "Consider the first interface of Google Sites.",
       "Ba phần: tìm kiếm cùng biểu tượng ứng dụng; lựa chọn tạo trang mới; danh sách trang mở gần đây. Không cần biết HTML để dùng Google Sites.", "Three parts: search with the app icon; the options to create a site; the recently opened sites. You do not need to know HTML to use Google Sites.",
       ("Phần (1) có ô tìm kiếm và biểu tượng danh sách ứng dụng Google.", "Part (1) has the search box and the Google apps icon.", True),
       ("Phần (2) có các lựa chọn để tạo trang web mới.", "Part (2) has the options to create a new site.", True),
       ("Phần (3) là danh sách các trang web đã mở gần đây.", "Part (3) is the list of recently opened sites.", True),
       ("Phải biết viết mã HTML mới dùng được Google Sites.", "You must know how to write HTML to use Google Sites.", False)),
    tf("tin12-b24-tf-02", 2, "Xét tên tệp lưu trữ, tên trang web, logo và favicon.", "Consider the file name, site name, logo and favicon.",
       "Tên tệp (Drive) và tên trang web nhập ở hai nơi khác nhau; logo và favicon đặt trong Cài đặt, mục Hình ảnh thương hiệu.", "The file name (Drive) and the site name are entered in two different places; the logo and favicon are set in Settings, under Brand images.",
       ("Tên tệp lưu trữ nhập ở dòng Trang web không có tiêu đề.", "The file name is entered on the Untitled site line.", True),
       ("Tên trang web nên ngắn gọn.", "The site name should be short.", True),
       ("Tên tệp lưu trữ và tên trang web luôn nhập chung vào một ô.", "The file name and the site name are always entered in the same box.", False),
       ("Logo và favicon được đặt trong cửa sổ Cài đặt, mục Hình ảnh thương hiệu.", "The logo and favicon are set in the Settings window under Brand images.", True)),
    tf("tin12-b24-tf-03", 2, "Xét loại tiêu đề và hình nền.", "Consider header types and the background image.",
       "Bìa là loại lớn nhất, Chỉ có tiêu đề nhỏ nhất; có thể di chuyển hình nền và bật tự động điều chỉnh độ sáng.", "Cover is the largest and Title only the smallest; the background can be moved and automatic brightness switched on.",
       ("Bìa là loại tiêu đề có kích thước lớn nhất.", "Cover is the largest header type.", True),
       ("Chỉ có tiêu đề là loại có kích thước nhỏ nhất.", "Title only is the smallest header type.", True),
       ("Hình nền đã tải lên thì không thể di chuyển.", "Once uploaded, the background image cannot be moved.", False),
       ("Có thể bật chế độ tự động điều chỉnh độ sáng hình nền.", "Automatic brightness adjustment of the background can be switched on.", True)),
    tf("tin12-b24-tf-04", 3, "Xét việc xem trước và xuất bản trang web.", "Consider previewing and publishing the site.",
       "Xem trước được trước khi xuất bản trên ba loại thiết bị; nút Công bố để xuất bản; sau khi công bố có URL để chia sẻ; không cần công bố mới xem trước được.", "Preview works before publishing on three device types; the Publish button publishes; after publishing there is a URL to share; publishing is not needed to preview.",
       ("Có thể xem trước trang trên điện thoại, máy tính bảng và máy tính.", "The site can be previewed on a phone, tablet and computer.", True),
       ("Phải xuất bản trang web thì mới xem trước được.", "The site must be published before it can be previewed.", False),
       ("Nháy nút Công bố để xuất bản trang web.", "Click the Publish button to publish the site.", True),
       ("Sau khi xuất bản, có thể sao chép URL để chia sẻ cho nhóm.", "After publishing, the URL can be copied and shared with the team.", True)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
