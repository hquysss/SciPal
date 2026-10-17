# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_23_tin12.py
from generate_tin_common import T, build, configure, mc, tf, web_block

configure(12, "Ứng dụng tin học", "Applied informatics", "Tin học ứng dụng")

slug = "chuan-bi-xay-dung-trang-web-bai-23-tin12"
title_vi = "Bài 23. Chuẩn bị xây dựng trang web"
title_en = "Lesson 23. Preparing to build a web page"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


STRUCTURE_HTML = """<header>
  <span class="logo">VN</span>
  <h1>Việt Nam – Vẻ đẹp tiềm ẩn</h1>
  <nav>
    <a href="#">Tây Bắc</a>
    <a href="#">Miền Trung</a>
    <a href="#">Liên hệ</a>
  </nav>
</header>
<main>
  <section>
    <h2>Mù Cang Chải</h2>
    <p>Ruộng bậc thang mùa lúa chín.</p>
  </section>
  <section>
    <h2>Thung Nham</h2>
    <p>Vườn chim giữa núi đá vôi.</p>
  </section>
</main>
<footer>
  <p>Bản quyền thuộc nhóm Vẻ đẹp tiềm ẩn. Liên hệ: tiemam@example.edu.vn</p>
</footer>"""

STRUCTURE_CSS = """header { background: #166534; color: #fff; padding: 10px 14px; }
.logo { display: inline-block; background: #fde68a; color: #166534; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
header h1 { margin: 6px 0; font-size: 20px; }
nav a { color: #fde68a; margin-right: 12px; font-size: 14px; }
main { display: flex; gap: 10px; margin: 10px 0; }
section { flex: 1; border: 1px solid #94a3b8; border-radius: 6px; padding: 8px; }
section h2 { margin: 0 0 4px; font-size: 16px; }
footer { border-top: 2px solid #166534; padding-top: 8px; font-size: 12px; opacity: .75; }"""

FONT_HTML = """<h2>Bốn cỡ chữ cho một trang web</h2>
<p class="t1">Cỡ rất lớn: tiêu đề nổi bật</p>
<p class="t2">Cỡ lớn: tiêu đề các mục</p>
<p class="t3">Cỡ thường: nội dung bài viết</p>
<p class="t4">Cỡ nhỏ: chú thích, chân trang</p>"""

FONT_CSS = """.t1 { font-size: 32px; font-weight: 700; margin: 6px 0; }
.t2 { font-size: 24px; font-weight: 700; margin: 6px 0; }
.t3 { font-size: 16px; margin: 6px 0; }
.t4 { font-size: 12px; font-style: italic; margin: 6px 0; }"""

PALETTE_HTML = """<h2>Bảng màu 5 màu: từ gam ấm đến gam lạnh</h2>
<div class="palette">
  <div class="c1">Nâu cam</div>
  <div class="c2">Vàng nắng</div>
  <div class="c3">Xám trung tính</div>
  <div class="c4">Xanh ngọc</div>
  <div class="c5">Xanh đêm</div>
</div>"""

PALETTE_CSS = """.palette { display: flex; }
.palette div { flex: 1; padding: 28px 6px; text-align: center; font-size: 13px; font-weight: 600; }
.c1 { background: #9a3412; color: #fff; }
.c2 { background: #fbbf24; color: #1c1917; }
.c3 { background: #e7e5e4; color: #1c1917; }
.c4 { background: #0f766e; color: #fff; }
.c5 { background: #1e3a5f; color: #fff; }"""

blocks = [
    T(
        "### Mục tiêu bài học\n\nSau bài này, bạn có thể:\n\n- nêu được **cấu trúc chung** của một trang web gồm ba phần: đầu trang, thân trang, chân trang;\n- nhận ra các thành phần của từng phần: logo, tên trang, thanh điều hướng, favicon, khối nội dung, thông tin bản quyền…;\n- kể được **ba bước chuẩn bị** xây dựng trang web: định hình ý tưởng, thiết kế, lựa chọn phần mềm và chuẩn bị tư liệu;\n- thực hiện bước chuẩn bị cho một chủ đề em chọn.",
        "### Learning goals\n\nAfter this lesson, you can:\n\n- describe the **general structure** of a web page with three parts: header, body, footer;\n- recognise the components of each part: logo, site name, navigation bar, favicon, content blocks, copyright information…;\n- list the **three preparation steps** for building a web page: shaping the idea, designing, choosing software and preparing materials;\n- carry out the preparation for a topic you choose.",
    ),
    T(
        "### 1. Những đặc điểm chung của trang web\n\nMỗi trang web đầy đủ nhất đều có cấu trúc gồm **ba phần chính**:\n\n| Phần | Vai trò |\n|---|---|\n| **Đầu trang** (header) | thông tin chung nhất về trang |\n| **Thân trang** (body) | nội dung của trang |\n| **Chân trang** (footer) | thông tin ngắn gọn về chủ thể, bản quyền |\n\n**a) Phần đầu trang** giống như trang bìa thu gọn của một cuốn sách hay phần mở đầu mỗi chương. Phần này có hình nền và những thông tin nổi bật:\n\n- **logo** và **tên trang**;\n- **thanh điều hướng**: gồm bảng chọn các chức năng; ô tìm kiếm có thể tách riêng khỏi bảng chọn;\n- **tiêu đề** và **thông tin tóm tắt** hay thông tin mới cập nhật.\n\nĐôi khi người ta còn dành vài dòng trước đầu trang cho **thông báo** quan trọng, ví dụ trang đang xây dựng hoặc bảo trì.\n\n**Lưu ý.** Khi trang được tải trong trình duyệt, tên trang hiện ở tiêu đề của tab, sau một biểu tượng nhỏ gọi là **favicon** (*favorite icon*). Favicon đại diện cho **cả website** chứ không riêng một trang, và có thể khác logo. Mỗi trang web có một địa chỉ **URL** (*Uniform Resource Locator*) để mở bằng trình duyệt như Firefox, Chrome, Edge, Safari.",
        "### 1. General features of web pages\n\nThe fullest web pages have **three main parts**:\n\n| Part | Role |\n|---|---|\n| **Header** | the most general information about the page |\n| **Body** | the content of the page |\n| **Footer** | short information about the owner and copyright |\n\n**a) The header** is like a book's compact cover or the opening of a chapter. It has a background image and prominent information:\n\n- the **logo** and the **site name**;\n- the **navigation bar**: a menu of functions; the search box may be separated from the menu;\n- the **title** and a **summary** or the latest updates.\n\nSome pages also reserve a few lines above the header for an important **announcement**, for example that the site is under construction or maintenance.\n\n**Note.** When the page is loaded in a browser, its name appears in the tab title after a small icon called the **favicon** (*favorite icon*). A favicon represents the **whole website**, not just one page, and may differ from the logo. Every web page has a **URL** (*Uniform Resource Locator*) to open it in a browser such as Firefox, Chrome, Edge or Safari.",
    ),
    T(
        "**b) Phần thân trang** chứa nội dung của trang web, thường bố cục thành các **khối hình chữ nhật**, mỗi khối trình bày một nội dung với tiêu đề riêng. Mỗi khối có thể chứa văn bản, hình ảnh, âm thanh, biểu mẫu nhập dữ liệu hoặc ứng dụng nhúng (như bản đồ, dự báo thời tiết).\n\n**c) Phần chân trang** có thể gồm: thông tin về thương hiệu, **bản quyền**; bảo mật; tóm tắt những thông tin cần nhấn mạnh thêm; **thông tin liên hệ**; liên kết tới các trang mạng xã hội liên quan. Nhiều trang tin còn ghi tên cơ quan chủ quản, giấy phép hoạt động và người chịu trách nhiệm nội dung.\n\nMô phỏng dưới đây dựng một trang đủ ba phần: mỗi dòng mã tạo một phần tử rồi các quy tắc CSS tạo hình thức cho nó. Quan sát phần tử vừa sáng lên thuộc phần nào của trang.",
        "**b) The body** holds the page content, usually laid out as **rectangular blocks**, each presenting one topic with its own heading. A block can hold text, images, audio, a data-entry form or an embedded application (such as a map or a weather forecast).\n\n**c) The footer** may contain: brand and **copyright** information; privacy; a summary of points to stress; **contact information**; links to related social-media pages. Many news sites also name the managing body, the operating licence and the person responsible for the content.\n\nThe simulation below builds a page with all three parts: each line of code creates an element, then the CSS rules style it. Watch which part of the page the element that just lit up belongs to.",
    ),
    web_block(
        sim("Trang web đủ ba phần", "A web page with all three parts", "Đầu trang có logo, tên trang, thanh điều hướng; thân trang là hai khối; chân trang ghi bản quyền và liên hệ.", "The header has a logo, name and navigation; the body is two blocks; the footer gives copyright and contact."),
        STRUCTURE_HTML,
        STRUCTURE_CSS,
        420,
    ),
    T(
        "### 2. Các bước chuẩn bị để xây dựng trang web\n\nMỗi trang web phải bắt nguồn từ **một nhu cầu cụ thể**, và được làm ra cho **những người đọc nó**. Vì vậy cần xác định mục đích, đối tượng và yêu cầu **trước** khi đi vào chi tiết nội dung và hình thức. Trình tự chuẩn bị:\n\n1. **Định hình ý tưởng:** xác định mục đích và đối tượng phục vụ; thiết lập các yêu cầu về nội dung và hình thức.\n2. **Thiết kế:** xây dựng dàn ý; xây dựng kiến trúc nội dung, thiết kế mĩ thuật, chọn bảng màu, phông chữ…\n3. **Lựa chọn phần mềm, chuẩn bị tư liệu:** chọn phần mềm; chuẩn bị thông tin đầu trang (logo, favicon, ảnh nền, tên trang); chuẩn bị tư liệu cho thân và chân trang.\n\n**Bước 1 – Định hình ý tưởng** là tìm câu trả lời rõ ràng cho: mục đích của trang là gì? ai là người dùng thường xuyên? trang cần đạt yêu cầu gì về nội dung, kiến trúc, mĩ thuật? Để hiểu người dùng, cần khảo sát: họ mong muốn biết gì, điều gì làm họ hứng thú, đặc điểm văn hoá và thị hiếu của họ ra sao.\n\n*Ví dụ.* Dự án trang web \"**Việt Nam – Vẻ đẹp tiềm ẩn**\" của một nhóm thiện nguyện: mục đích giới thiệu vẻ đẹp thiên nhiên, văn hoá, con người Việt Nam; đối tượng là những người yêu phong cảnh, văn hoá nghệ thuật, ẩm thực; yêu cầu: ảnh đẹp, bài viết về lịch sử và ẩm thực địa phương, kèm bản đồ, đường đi, thời gian đẹp nhất để đến; hình thức dễ theo dõi, sinh động, trang nhã; có tương tác để biết thêm nhu cầu của người dùng.",
        "### 2. Preparation steps for building a web page\n\nEvery web page must start from **a concrete need**, and is made **for the people who read it**. So the purpose, audience and requirements must be set **before** the details of content and form. The preparation order:\n\n1. **Shape the idea:** set the purpose and the audience; set the requirements for content and form.\n2. **Design:** build an outline; design the content architecture and the visual design, choose a colour palette and fonts…\n3. **Choose software, prepare materials:** pick the software; prepare header information (logo, favicon, background image, site name); prepare materials for the body and footer.\n\n**Step 1 – Shaping the idea** means finding clear answers to: what is the page for? who will use it regularly? what must it achieve in content, architecture and visual design? To understand users, survey them: what do they want to know, what attracts them, what are their cultural traits and tastes.\n\n*Example.* The web project \"**Vietnam – Hidden Beauty**\" by a volunteer group: the purpose is to present the beauty of Vietnam's nature, culture and people; the audience loves scenery, culture, arts and food; the requirements: fine photos, articles on local history and food, with a map, directions and the best time to visit; a form that is easy to follow, lively and elegant; interaction to learn more about users' needs.",
    ),
    T(
        "**Bước 2 – Thiết kế** bắt đầu bằng **dàn ý tổng thể**, từ đó xây dựng **bố cục** và các chỉ định **thiết kế mĩ thuật**. Dàn ý giúp hình dung toàn bộ nội dung và sắp xếp sao cho ấn tượng, mạch lạc, dễ tiếp cận. Với trang \"Việt Nam – Vẻ đẹp tiềm ẩn\" giới thiệu các vùng Tây Bắc, Đông Bắc, miền Trung, Tây Nguyên, miền Đông, miền Tây: thanh điều hướng có bảng chọn các vùng miền và mục liên hệ phản hồi; thân trang là một số bài viết nổi bật về các địa danh.\n\n**Thiết kế mĩ thuật** là thiết kế hình thức sao cho đẹp, hợp với thẩm mĩ của người dùng và nội dung. Ở mức thiết kế chung, ta chọn **định dạng chữ** và **bảng màu**.\n\n**Định dạng chữ** cần nhất quán và hài hoà:\n\n- bảng chọn trên thanh điều hướng nên dùng phông **Sans Serif** (không chân), hẹp ngang, dễ đọc như Arial Condensed;\n- phông **Serif** (có chân) như Times New Roman khó nhận diện trên màn hình, chỉ nên dùng ở cỡ lớn như tiêu đề; nội dung bài viết nên dùng Sans Serif như Calibri, Arial, Verdana, Tahoma;\n- chữ **đậm** để nhấn mạnh, thường cho tiêu đề; chữ **nghiêng** để phân biệt từ ngữ, câu chữ hay chú thích;\n- quy định tối thiểu **bốn cỡ chữ**: nhỏ nhất (chú thích, chân trang), thường (nội dung bài), lớn (tiêu đề), rất lớn (tiêu đề nổi bật).",
        "**Step 2 – Design** starts with an **overall outline**, from which the **layout** and the **visual design** choices follow. An outline helps picture all the content and arrange it to be striking, coherent and easy to reach. For \"Vietnam – Hidden Beauty\", which presents the Northwest, Northeast, Central, Central Highlands, Southeast and Mekong Delta regions: the navigation bar has a menu of regions and a feedback/contact entry; the body holds a few featured articles about places.\n\n**Visual design** gives the page a form that is attractive, fits users' taste and suits the content. At the general level we choose **text formatting** and a **colour palette**.\n\n**Text formatting** must be consistent and harmonious:\n\n- the menus on the navigation bar should use a **Sans Serif** (no feet) font, narrow and easy to read, such as Arial Condensed;\n- **Serif** fonts such as Times New Roman are hard to recognise on screen and should be used only at large sizes such as headings; article text should use a Sans Serif font such as Calibri, Arial, Verdana, Tahoma;\n- **bold** stresses, usually for headings; *italic* tells words, sentences or notes apart;\n- define at least **four sizes**: smallest (notes, footer), normal (article text), large (headings), very large (prominent headings).",
    ),
    web_block(
        sim("Bốn cỡ chữ cho một trang web", "Four text sizes for a web page", "Từ cỡ rất lớn đến cỡ nhỏ: chữ đậm cho tiêu đề, chữ nghiêng cho chú thích.", "From very large to small: bold for headings, italic for notes."),
        FONT_HTML,
        FONT_CSS,
        320,
    ),
    T(
        "**Bảng màu.** Màu tương phản quá gắt hay không hài hoà làm người đọc phản cảm; để gây cảm xúc tốt cần chọn màu có độ tương phản **nhẹ nhàng và hài hoà**. Mỗi bảng màu thường có **5 màu** pha giữa gam ấm, gam lạnh và trung tính, chưa kể trắng và đen. Có thể dùng các công cụ trực tuyến như Adobe Color hoặc Coolors để chọn bảng màu (và nhờ trợ lí AI gợi ý, rồi tự đánh giá lại).\n\nMột nguyên tắc nữa là **chữ phải đọc rõ trên nền**: chữ sáng trên nền sẫm hay chữ tối trên nền sáng. Hãy nhìn bảng màu 5 màu bên dưới, đi từ ấm sang lạnh.",
        "**Colour palette.** Harsh or clashing colours put readers off; to create a good feeling choose colours with **gentle, harmonious** contrast. A palette usually has **5 colours** mixing warm, cool and neutral tones, not counting white and black. Online tools such as Adobe Color or Coolors can help choose a palette (and an AI assistant can suggest one, which you then judge yourself).\n\nAnother rule: **text must be readable on its background**: light text on a dark background or dark text on a light one. Look at the 5-colour palette below, running from warm to cool.",
    ),
    web_block(
        sim("Bảng màu 5 màu cho trang Việt Nam – Vẻ đẹp tiềm ẩn", "A 5-colour palette for the Vietnam – Hidden Beauty site", "Từ nâu cam, vàng nắng (ấm) qua xám trung tính tới xanh ngọc, xanh đêm (lạnh); chữ luôn tương phản với nền.", "From brown-orange and sunny yellow (warm) through neutral grey to teal and night blue (cool); text always contrasts with its background."),
        PALETTE_HTML,
        PALETTE_CSS,
        260,
    ),
    T(
        "**Bước 3 – Lựa chọn phần mềm, chuẩn bị tư liệu.** Có nhiều phần mềm làm trang web trực quan nhưng hầu hết là phần mềm thương mại. Google cung cấp **miễn phí** phần mềm **Google Sites** với giao diện trực quan: dễ dùng, kết nối với Docs, Sheets, Slides, Maps, Photos, YouTube…; trang làm xong lưu trên Google Drive, chia sẻ và xuất bản với một địa chỉ URL do Google hỗ trợ. Chỉ cần đăng kí một tài khoản Google.\n\n**Chuẩn bị tư liệu** kéo dài suốt thời gian thực hiện dự án: thiết kế **favicon**, **logo**, chọn **hình nền** đầu trang, viết bài, chọn ảnh minh hoạ. Khi dùng ảnh, âm thanh, video của người khác, phải tôn trọng **bản quyền**: dùng nguồn được phép và ghi rõ nguồn, tác giả (thường ở chân trang).\n\n*Lưu ý.* Cần phân biệt xây dựng **trang web đơn giản** với xây dựng **website**: chuẩn bị website có thể cần thêm các bước, nhất là về tổ chức vận hành và quản trị.",
        "**Step 3 – Choosing software, preparing materials.** Many visual web-building programs exist but most are commercial. Google offers **Google Sites** **free**, with a visual interface: easy to use and linked to Docs, Sheets, Slides, Maps, Photos, YouTube…; finished pages are stored on Google Drive and can be shared and published with a URL supported by Google. All you need is a Google account.\n\n**Preparing materials** lasts the whole project: designing the **favicon** and **logo**, choosing the header **background**, writing articles, choosing illustrations. When you use other people's images, audio or video, respect **copyright**: use permitted sources and credit the source and author (often in the footer).\n\n*Note.* Building a **simple web page** differs from building a **website**: a website may need extra steps, especially for operation and administration.",
    ),
    T(
        "### Tóm tắt và tự kiểm tra\n\n| Nội dung | Ghi nhớ |\n|---|---|\n| Ba phần của trang web | đầu trang · thân trang · chân trang |\n| Đầu trang | logo, tên trang, thanh điều hướng, tiêu đề, tóm tắt; favicon trên tab |\n| Thân trang | các khối hình chữ nhật, mỗi khối một nội dung |\n| Chân trang | bản quyền, liên hệ, bảo mật, liên kết mạng xã hội |\n| Ba bước chuẩn bị | định hình ý tưởng → thiết kế → chọn phần mềm và chuẩn bị tư liệu |\n| Thiết kế mĩ thuật chung | định dạng chữ (bốn cỡ, Sans Serif) và bảng màu 5 màu |\n\n**Tự kiểm tra:** thông tin liên hệ của chủ trang web nằm ở phần nào? (đáp án: chân trang). Vì sao phải xác định đối tượng người dùng trước khi thiết kế? (đáp án: trang được làm ra cho người đọc nó; biết nhu cầu họ mới xác định đúng mục đích và yêu cầu).",
        "### Summary and self-check\n\n| Topic | Remember |\n|---|---|\n| Three parts of a page | header · body · footer |\n| Header | logo, site name, navigation bar, title, summary; favicon on the tab |\n| Body | rectangular blocks, each with one topic |\n| Footer | copyright, contact, privacy, social-media links |\n| Three preparation steps | shape the idea → design → choose software and prepare materials |\n| General visual design | text formatting (four sizes, Sans Serif) and a 5-colour palette |\n\n**Self-check:** in which part is the owner's contact information? (answer: the footer). Why identify the audience before designing? (answer: a page is made for its readers; knowing their needs sets the right purpose and requirements).",
    ),
]

questions = [
    mc("tin12-b23-mc-01", 1, "Một trang web đầy đủ nhất thường có mấy phần chính?", "How many main parts does the fullest web page usually have?",
       "Trang web đầy đủ gồm ba phần chính: đầu trang, thân trang và chân trang.", "A full web page has three main parts: header, body and footer.", "B",
       ("Hai phần", "Two parts"), ("Ba phần", "Three parts"), ("Bốn phần", "Four parts"), ("Năm phần", "Five parts")),
    mc("tin12-b23-mc-02", 1, "Tên trang web và logo thường được đặt ở phần nào?", "In which part are the site name and logo usually placed?",
       "Logo, tên trang, thanh điều hướng, tiêu đề đều nằm ở phần đầu trang.", "The logo, site name, navigation bar and title are all in the header.", "C",
       ("Phần chân trang", "The footer"), ("Phần thân trang", "The body"), ("Phần đầu trang", "The header"), ("Chỉ trong phần thông báo bảo trì", "Only in the maintenance announcement")),
    mc("tin12-b23-mc-03", 1, "Thông tin về bản quyền và thông tin liên hệ của chủ trang web thường nằm ở đâu?", "Where are the copyright and contact information of the site owner usually placed?",
       "Chân trang chứa thông tin về thương hiệu, bản quyền, liên hệ và liên kết mạng xã hội.", "The footer holds brand, copyright, contact information and social-media links.", "D",
       ("Phần đầu trang", "The header"), ("Phần thân trang", "The body"), ("Thanh điều hướng", "The navigation bar"), ("Phần chân trang", "The footer")),
    mc("tin12-b23-mc-04", 1, "Biểu tượng nhỏ hiện trước tên trang trên tab của trình duyệt, đại diện cho cả website, được gọi là gì?", "What is the small icon before the page name on a browser tab, representing the whole website, called?",
       "Biểu tượng đó là favicon (favorite icon).", "That icon is the favicon (favorite icon).", "A",
       ("Favicon", "Favicon"), ("Weblogo", "Weblogo"), ("Favlogo", "Favlogo"), ("Webicon", "Webicon")),
    mc("tin12-b23-mc-05", 2, "Phần thân trang web thường được bố cục như thế nào?", "How is the body of a web page usually laid out?",
       "Thân trang thường gồm các khối hình chữ nhật, mỗi khối trình bày một nội dung với tiêu đề riêng.", "The body usually has rectangular blocks, each presenting one topic with its own heading.", "B",
       ("Chỉ một khối văn bản duy nhất", "A single block of text"), ("Các khối hình chữ nhật, mỗi khối một nội dung", "Rectangular blocks, each with one topic"), ("Chỉ gồm một bức ảnh", "Just one picture"), ("Chỉ gồm thanh điều hướng", "Just the navigation bar")),
    mc("tin12-b23-mc-06", 2, "Để định hình ý tưởng khi xây dựng trang web, em cần làm gì?", "To shape the idea when building a web page, what do you need to do?",
       "Định hình ý tưởng là xác định mục đích và đối tượng phục vụ của trang web (cùng yêu cầu về nội dung, hình thức).", "Shaping the idea means setting the purpose and audience of the page (and its content and form requirements).", "C",
       ("Làm logo, favicon và ảnh nền", "Make the logo, favicon and background"), ("Chọn phần mềm xây dựng trang web", "Choose the software"), ("Xác định mục đích và đối tượng phục vụ của trang web", "Set the purpose and audience of the page"), ("Chọn phông chữ và bảng màu", "Choose fonts and the palette")),
    mc("tin12-b23-mc-07", 2, "Nên chọn loại phông chữ nào cho các bảng chọn trên thanh điều hướng?", "Which type of font should be chosen for the menus on the navigation bar?",
       "Bảng chọn nên dùng phông Sans Serif (không chân), dễ đọc và tiết kiệm diện tích.", "Menus should use a Sans Serif font (no feet): easy to read and space-saving.", "D",
       ("Monospace", "Monospace"), ("Serif", "Serif"), ("Fantasy", "Fantasy"), ("Sans Serif", "Sans Serif")),
    mc("tin12-b23-mc-08", 2, "Một bảng màu cho trang web thường gồm khoảng bao nhiêu màu (chưa kể trắng và đen)?", "About how many colours does a palette for a web page usually have (not counting white and black)?",
       "Mỗi bảng màu thường có 5 màu pha giữa gam ấm, gam lạnh và trung tính.", "A palette usually has 5 colours mixing warm, cool and neutral tones.", "A",
       ("5 màu", "5 colours"), ("2 màu", "2 colours"), ("12 màu", "12 colours"), ("Càng nhiều càng tốt", "As many as possible")),
    mc("tin12-b23-mc-09", 2, "Kiểu chữ nghiêng thường được dùng để làm gì?", "What is italic text usually used for?",
       "Chữ nghiêng có ý nghĩa phân biệt từ ngữ, câu chữ hay phần chú thích; chữ đậm dùng để nhấn mạnh.", "Italic tells words, sentences or notes apart; bold is used for emphasis.", "B",
       ("Nhấn mạnh các tiêu đề", "Emphasising headings"), ("Phân biệt từ ngữ, câu chữ hay chú thích", "Telling words, sentences or notes apart"), ("Làm cho chữ to hơn", "Making text larger"), ("Thay thế màu chữ", "Replacing the text colour")),
    mc("tin12-b23-mc-10", 2, "Thông tin nào KHÔNG phù hợp với trang web chủ đề \"Việt Nam – Vẻ đẹp tiềm ẩn\"?", "Which information is NOT suitable for a site on \"Vietnam – Hidden Beauty\"?",
       "Xu hướng nghề nghiệp tương lai không liên quan tới mục đích giới thiệu cảnh đẹp, văn hoá, ẩm thực của trang.", "Future career trends do not relate to the site's purpose of presenting scenery, culture and food.", "C",
       ("Đặc điểm ẩm thực địa phương", "Local cuisine"), ("Những làng nghề truyền thống nổi tiếng", "Famous traditional craft villages"), ("Xu hướng nghề nghiệp trong tương lai", "Future career trends"), ("Lịch sử dựng nước và giữ nước", "The history of nation building and defence")),
    mc("tin12-b23-mc-11", 2, "Phần mềm nào của Google cho phép làm trang web trực quan, miễn phí và liên kết với các phần mềm khác của Google?", "Which Google software lets you build web pages visually and free, linked to other Google apps?",
       "Google Sites là phần mềm làm trang web miễn phí, kết nối với Docs, Sheets, Maps, YouTube…", "Google Sites is free web-building software linked to Docs, Sheets, Maps, YouTube…", "D",
       ("Google Docs", "Google Docs"), ("Google Maps", "Google Maps"), ("Google Sheets", "Google Sheets"), ("Google Sites", "Google Sites")),
    mc("tin12-b23-mc-12", 3, "Trình tự đúng của các bước chuẩn bị xây dựng trang web là gì?", "What is the correct order of the preparation steps for building a web page?",
       "Trước hết định hình ý tưởng, rồi thiết kế, sau cùng chọn phần mềm và chuẩn bị tư liệu.", "First shape the idea, then design, and finally choose software and prepare materials.", "A",
       ("Định hình ý tưởng → thiết kế → chọn phần mềm, chuẩn bị tư liệu", "Shape the idea → design → choose software, prepare materials"), ("Chuẩn bị tư liệu → thiết kế → định hình ý tưởng", "Prepare materials → design → shape the idea"), ("Thiết kế → chọn phần mềm → định hình ý tưởng", "Design → choose software → shape the idea"), ("Chọn phần mềm → chuẩn bị tư liệu → định hình ý tưởng", "Choose software → prepare materials → shape the idea")),
]

truefalse = [
    tf("tin12-b23-tf-01", 2, "Xét cấu trúc của một trang web.", "Consider the structure of a web page.",
       "Đầu trang có logo, thanh điều hướng; thân trang chứa nội dung; chân trang chứa bản quyền, liên hệ; thanh điều hướng không nằm ở chân trang.", "The header has the logo and navigation; the body holds the content; the footer holds copyright and contact; the navigation bar is not in the footer.",
       ("Phần đầu trang thường có logo và thanh điều hướng.", "The header usually has the logo and navigation bar.", True),
       ("Phần thân trang chứa nội dung của trang web.", "The body holds the content of the web page.", True),
       ("Thanh điều hướng luôn nằm ở phần chân trang.", "The navigation bar is always in the footer.", False),
       ("Thông tin bản quyền thường nằm ở phần chân trang.", "Copyright information is usually in the footer.", True)),
    tf("tin12-b23-tf-02", 2, "Xét các bước chuẩn bị và việc định hình ý tưởng.", "Consider the preparation steps and shaping the idea.",
       "Phải khảo sát người dùng để xác định mục đích; mọi trang web bắt nguồn từ nhu cầu; tư liệu chuẩn bị suốt dự án; không thể làm tư liệu xong trước khi định hình ý tưởng.", "Users must be surveyed to set the purpose; every page starts from a need; materials are prepared throughout the project; materials cannot be finished before the idea is shaped.",
       ("Cần khảo sát nhu cầu và đặc điểm của người dùng để xác định mục đích trang web.", "The needs and traits of users must be surveyed to set the page's purpose.", True),
       ("Mỗi trang web bắt nguồn từ một nhu cầu cụ thể.", "Every web page starts from a concrete need.", True),
       ("Nên làm xong toàn bộ tư liệu trước, rồi mới nghĩ tới mục đích của trang.", "All materials should be finished first, and only then the page's purpose considered.", False),
       ("Việc chuẩn bị tư liệu kéo dài suốt thời gian thực hiện dự án.", "Preparing materials lasts the whole project.", True)),
    tf("tin12-b23-tf-03", 2, "Xét thiết kế mĩ thuật ở mức chung.", "Consider visual design at the general level.",
       "Chữ đậm dùng để nhấn mạnh, nghiêng để phân biệt; màu nên tương phản nhẹ nhàng, hài hoà chứ không gắt; cần tối thiểu bốn cỡ chữ.", "Bold is for emphasis, italic to tell things apart; colours should have gentle, harmonious contrast, not harsh; at least four text sizes are needed.",
       ("Chữ đậm có ý nghĩa nhấn mạnh, thường dùng cho tiêu đề.", "Bold stresses and is usually used for headings.", True),
       ("Chữ nghiêng có ý nghĩa nhấn mạnh hơn chữ đậm.", "Italic is a stronger emphasis than bold.", False),
       ("Nên chọn các màu có độ tương phản nhẹ nhàng, hài hoà.", "Colours with gentle, harmonious contrast should be chosen.", True),
       ("Nên quy định tối thiểu bốn cỡ chữ cho các phần của trang.", "At least four text sizes should be set for the parts of the page.", True)),
    tf("tin12-b23-tf-04", 3, "Xét Google Sites, favicon và bản quyền.", "Consider Google Sites, the favicon and copyright.",
       "Favicon đại diện cả website; Google Sites miễn phí và cần tài khoản Google; trang làm xong lưu ở Google Drive; ảnh lấy của người khác phải ghi nguồn, không thể tự ý dùng như của mình.", "The favicon represents the whole website; Google Sites is free and needs a Google account; finished pages are stored on Google Drive; other people's images need credit and cannot be used as your own.",
       ("Favicon đại diện cho cả website chứ không riêng một trang.", "The favicon represents the whole website, not just one page.", True),
       ("Google Sites là phần mềm làm trang web miễn phí, cần có tài khoản Google.", "Google Sites is free web-building software that needs a Google account.", True),
       ("Ảnh của người khác có thể dùng thoải mái mà không cần ghi nguồn.", "Other people's images can be used freely with no credit.", False),
       ("Trang web làm bằng Google Sites được lưu trên Google Drive.", "A page made with Google Sites is stored on Google Drive.", True)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
