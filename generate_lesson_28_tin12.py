# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_28_tin12.py
from generate_tin_common import T, build, configure, mc, tf, web_block

configure(12, "Ứng dụng tin học", "Applied informatics", "Tin học ứng dụng")

slug = "thuc-hanh-tong-hop-bai-28-tin12"
title_vi = "Bài 28. Thực hành tổng hợp"
title_en = "Lesson 28. Comprehensive practice"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


FLOW_HTML = """<h2>Quy trình xây dựng một trang web</h2>
<ol class="flow">
  <li>
    <b>1. Chuẩn bị</b>
    <span>Định hình ý tưởng, thiết kế cấu trúc, chuẩn bị tư liệu</span>
  </li>
  <li>
    <b>2. Tiến hành thiết kế</b>
    <span>Đầu trang, thân trang, chân trang, trang con, liên kết, biểu mẫu</span>
  </li>
  <li>
    <b>3. Công bố và hiệu chỉnh</b>
    <span>Xem trước, công bố, thu ý kiến rồi chỉnh sửa</span>
  </li>
</ol>"""

FLOW_CSS = """h2 { margin: 0 0 8px; font-size: 18px; }
.flow { list-style: none; margin: 0; padding: 0; }
.flow li { display: flex; flex-direction: column; border-left: 6px solid #0f766e; background: #ecfdf5; color: #14532d; padding: 8px 12px; margin-bottom: 8px; border-radius: 0 8px 8px 0; }
.flow span { font-size: 13px; }"""

SITE_HTML = """<header>
  <span class="logo">12A</span>
  <h1>Lớp 12A thân yêu</h1>
  <nav>
    <a href="#">Trang chủ</a>
    <a href="#">Kỉ niệm</a>
    <a href="#">Thầy cô</a>
    <a href="#">Liên hệ</a>
  </nav>
</header>
<main>
  <article>
    <h2>Buổi dã ngoại đầu năm</h2>
    <p>Cả lớp cùng leo núi và ăn trưa dưới tán cây.</p>
    <a href="#">Đọc tiếp về buổi dã ngoại</a>
  </article>
  <article>
    <h2>Hội trại 26 tháng 3</h2>
    <p>Gian trại của lớp đạt giải nhì toàn trường.</p>
    <a href="#">Đọc tiếp về hội trại</a>
  </article>
  <article>
    <h2>Đội bóng của lớp</h2>
    <p>Mười một cầu thủ và một tinh thần không bỏ cuộc.</p>
    <a href="#">Đọc tiếp về đội bóng</a>
  </article>
</main>
<section class="feedback">
  <h2>Góp ý cho trang web</h2>
  <label>Ý kiến của bạn
    <textarea rows="2"></textarea>
  </label>
  <button type="button">Gửi</button>
</section>
<footer>
  <p>Ảnh do các bạn trong lớp chụp. Liên hệ: lop12a@example.edu.vn</p>
</footer>"""

SITE_CSS = """header { background: #14532d; color: #fff; padding: 8px 14px; }
.logo { background: #fde68a; color: #14532d; font-weight: 700; padding: 1px 8px; border-radius: 4px; }
header h1 { margin: 4px 0; font-size: 22px; }
nav a { color: #fde68a; margin-right: 12px; font-size: 14px; }
main { display: flex; gap: 8px; margin: 10px 0; }
article { flex: 1; border: 1px solid #94a3b8; border-radius: 8px; padding: 6px 10px; }
article h2 { margin: 0 0 4px; font-size: 15px; }
article p { margin: 0 0 4px; font-size: 13px; }
article a { font-size: 13px; }
.feedback { border: 1px dashed #0f766e; border-radius: 8px; padding: 6px 12px; }
.feedback h2 { margin: 0 0 4px; font-size: 15px; }
textarea { display: block; width: 95%; margin: 4px 0; }
button { background: #0f766e; color: #fff; border: 0; border-radius: 6px; padding: 4px 14px; }
footer { margin-top: 10px; border-top: 2px solid #14532d; padding-top: 6px; font-size: 12px; opacity: .8; }"""

RUBRIC_HTML = """<table>
  <tr><th>Tiêu chí</th><th>Nội dung đánh giá</th></tr>
  <tr><td>Nội dung</td><td>Bài viết đúng chủ đề; trang chủ có ít nhất 3 bài kèm minh hoạ và 3 trang con; có thanh điều hướng, liên kết; có biểu mẫu</td></tr>
  <tr><td>Hình thức</td><td>Cấu trúc logic; bố cục khoa học, đẹp; hình ảnh, video phù hợp, không vi phạm bản quyền</td></tr>
  <tr><td>Sáng tạo và hiệu quả</td><td>Ý tưởng sáng tạo, thu hút; cung cấp thông tin hiệu quả cho người xem</td></tr>
</table>"""

RUBRIC_CSS = """table { border-collapse: collapse; width: 100%; font-size: 14px; }
th, td { border: 1px solid #94a3b8; padding: 6px 10px; text-align: left; vertical-align: top; }
th { background: #14532d; color: #fff; }
td:first-child { font-weight: 600; white-space: nowrap; }"""

blocks = [
    T(
        "### Mục tiêu bài học\n\nSau bài này, bạn có thể:\n\n- vận dụng tổng hợp các kiến thức từ Bài 23 đến Bài 27 để **chuẩn bị, xây dựng và hoàn thiện** một website nhỏ bằng Google Sites;\n- tóm tắt **quy trình chung** xây dựng trang web;\n- đối chiếu sản phẩm với **bảng tiêu chí đánh giá** (nội dung, hình thức, sáng tạo và hiệu quả);\n- **tự đánh giá**, rút kinh nghiệm và chỉnh sửa để hoàn thiện sản phẩm.",
        "### Learning goals\n\nAfter this lesson, you can:\n\n- combine the knowledge of Lessons 23 to 27 to **prepare, build and finish** a small website with Google Sites;\n- summarise the **general process** of building a website;\n- compare your product with an **evaluation rubric** (content, form, creativity and effectiveness);\n- **self-assess**, learn from the experience and edit to perfect the product.",
    ),
    T(
        "### 1. Quy trình chung và yêu cầu của sản phẩm\n\nQuy trình xây dựng trang web gồm **ba bước**:\n\n1. **Chuẩn bị:** định hình ý tưởng (mục đích, đối tượng, phong cách), thiết kế cấu trúc (dàn ý, bố cục), chuẩn bị tư liệu (thông tin, ảnh, video, logo, ảnh nền, tên trang).\n2. **Tiến hành thiết kế:** làm đầu trang, thân trang, chân trang, trang con, liên kết, bảng chọn, biểu mẫu.\n3. **Công bố trang web và hiệu chỉnh** (nếu cần).\n\n**Sản phẩm của nhóm phải đáp ứng:**\n\n- **Nội dung:** có tư liệu đa phương tiện, ít nhất **3 đến 4 bài viết ngắn gọn**;\n- **Bố cục** nội dung và hình thức hợp lí; **màu sắc, phông chữ** hợp lí;\n- tất cả các trang có **dữ liệu đa phương tiện**, không chỉ chữ thuần;\n- có **bảng chọn** ở thanh điều hướng để đi tới các trang con;\n- có **liên kết** trong bài viết tới các trang khác của website hoặc trang trên Internet;\n- có **biểu mẫu** với nội dung hợp lí;\n- kèm **thuyết minh sản phẩm**: bài giới thiệu ngắn gọn về mục đích, ý nghĩa và các yêu cầu đã đạt được.",
        "### 1. The general process and product requirements\n\nBuilding a web page takes **three steps**:\n\n1. **Prepare:** shape the idea (purpose, audience, style), design the structure (outline, layout), prepare materials (information, pictures, video, logo, background, site name).\n2. **Design:** build the header, body, footer, subpages, links, menus and forms.\n3. **Publish the site and adjust** (if needed).\n\n**The team's product must meet:**\n\n- **Content:** multimedia materials and at least **3 to 4 short articles**;\n- a sensible **layout** of content and form; sensible **colours and fonts**;\n- every page has **multimedia data**, not text alone;\n- a **menu** on the navigation bar leading to the subpages;\n- **links** in articles to other pages of the site or pages on the Internet;\n- a **form** with sensible content;\n- a **product description**: a short introduction to the purpose, meaning and the requirements achieved.",
    ),
    web_block(
        sim("Quy trình ba bước", "The three-step process", "Chuẩn bị, tiến hành thiết kế, rồi công bố và hiệu chỉnh.", "Prepare, design, then publish and adjust."),
        FLOW_HTML,
        FLOW_CSS,
        340,
    ),
    T(
        "### 2. Nhiệm vụ 1 và 2: chọn chủ đề và chuẩn bị\n\n**Chọn chủ đề.** Mỗi nhóm khoảng 4 học sinh chọn một đề tài, gợi ý: *Lớp 12A thân yêu của chúng tôi*, *Những kỉ niệm THPT*, *Lưu bút trước ngày tốt nghiệp*, hoặc chủ đề về quê hương, xóm nhỏ, ngõ phố. Đề tài **không nên quá rộng**, đối tượng người dùng nên hạn chế, yêu cầu vừa phải để nhanh chóng chuẩn bị tư liệu; đề tài gắn với sở thích, sở trường của thành viên là một lợi thế.\n\n**Thực hiện các bước chuẩn bị:**\n\n- **Định hình ý tưởng:** xác định mục đích thiết kế, đối tượng người dùng, từ đó định hình phong cách.\n- **Thiết kế cấu trúc:** dàn ý, phác thảo cấu trúc (cây trang) và bố cục.\n- **Chuẩn bị tư liệu:** tìm thông tin, ảnh, video; làm logo, ảnh nền; đặt tên trang web. Chọn và sàng lọc để thông tin **chính xác**, phù hợp từng chuyên mục, và **không vi phạm bản quyền** (ghi nguồn nếu cần).",
        "### 2. Tasks 1 and 2: choosing a topic and preparing\n\n**Choosing a topic.** Each team of about 4 students picks a subject, for example: *Our beloved class 12A*, *High-school memories*, *A farewell notebook before graduation*, or a topic about the hometown, a hamlet or a street. The subject **should not be too broad**, the audience should be limited and the requirements moderate so materials can be prepared quickly; a subject linked to the members' interests and strengths is an advantage.\n\n**Carrying out the preparation steps:**\n\n- **Shape the idea:** set the design purpose and the audience, then fix the style.\n- **Design the structure:** an outline, a sketch of the structure (page tree) and the layout.\n- **Prepare materials:** find information, pictures, video; make the logo and background; name the site. Select and screen so information is **accurate**, fits each section, and **does not infringe copyright** (credit sources when needed).",
    ),
    T(
        "### 3. Nhiệm vụ 3: xây dựng các trang web trên Google Sites\n\nBám sát yêu cầu sản phẩm và các phân tích ở bước chuẩn bị. Một số gợi ý:\n\n1. **Bảng chọn theo chiều ngang:** *Cài đặt* → *Điều hướng* → *Phần tử xuất hiện nhiều nhất* → *Trên cùng*.\n2. **Mẫu giao diện có sẵn:** dùng bảng chọn **Giao diện**, thử phối các sắc thái màu và kiểu phông khác nhau để có phong cách riêng, phù hợp với chủ đề (không chỉ dùng mẫu có sẵn mà tuỳ chỉnh thông số).\n3. **Đổi vị trí và cấp của trang:** trong bảng chọn *Trang*, **kéo thả** một trang để đổi thứ tự hiển thị hoặc biến một trang cấp 1 thành trang cấp 2, giúp điều hướng thuận tiện hơn.\n\nMô phỏng dưới đây là bản phác của một website lớp học nhỏ: đầu trang có thanh điều hướng, ba bài viết ở thân trang có liên kết \"Đọc tiếp\", một biểu mẫu góp ý và chân trang ghi nguồn ảnh, liên hệ.",
        "### 3. Task 3: building the pages in Google Sites\n\nStay close to the product requirements and the analysis made in preparation. Some hints:\n\n1. **A horizontal menu:** *Settings* → *Navigation* → *Most prominent element* → *Top*.\n2. **Ready-made themes:** use the **Themes** menu, try combining colour shades and font styles to get your own style that suits the topic (do not just use a template; adjust the settings).\n3. **Change the position and level of pages:** in the *Pages* menu, **drag and drop** a page to change the display order or turn a level-1 page into a level-2 page, making navigation easier.\n\nThe simulation below is a sketch of a small class website: a header with a navigation bar, three articles in the body with \"Read more\" links, a feedback form and a footer crediting images and giving contact information.",
    ),
    web_block(
        sim("Website nhỏ của lớp 12A", "A small website for class 12A", "Đầu trang có bảng chọn ngang; thân trang ba bài viết có liên kết, biểu mẫu góp ý; chân trang ghi nguồn ảnh và liên hệ.", "The header has a horizontal menu; the body has three articles with links and a feedback form; the footer credits images and gives contact information."),
        SITE_HTML,
        SITE_CSS,
        680,
    ),
    T(
        "### 4. Đánh giá sản phẩm và hoàn thiện\n\nCác nhóm giới thiệu sản phẩm, nhóm khác đặt câu hỏi, nhận xét và chấm điểm theo bảng tiêu chí (mỗi tiêu chí chấm từ 1 đến 5 điểm). Trước khi công bố, mỗi nhóm nên rà soát:\n\n- mọi **liên kết** mở đúng trang và có văn bản mô tả rõ trang đích;\n- **xem trước** trên điện thoại, máy tính bảng và máy tính;\n- **ảnh, video** chất lượng tốt, phù hợp nội dung, có ghi nguồn khi cần;\n- **biểu mẫu** hoạt động, câu hỏi ngắn gọn, chỉ hỏi thông tin cần thiết;\n- **thuyết minh sản phẩm** nêu rõ mục đích, ý nghĩa, những yêu cầu đã đạt.\n\nSau khi công bố, dùng ý kiến thu được từ biểu mẫu để **hiệu chỉnh** trang web.",
        "### 4. Evaluating and finishing the product\n\nTeams present their products; other teams ask questions, comment and score against the rubric (each criterion scored from 1 to 5). Before publishing, each team should check:\n\n- every **link** opens the right page and has text that clearly describes it;\n- **preview** on a phone, tablet and computer;\n- **images and videos** are of good quality, fit the content and are credited when needed;\n- the **form** works, questions are short, and only necessary information is asked;\n- the **product description** states the purpose, meaning and requirements achieved.\n\nAfter publishing, use the opinions gathered from the form to **adjust** the site.",
    ),
    web_block(
        sim("Bảng tiêu chí đánh giá sản phẩm", "The product evaluation rubric", "Ba nhóm tiêu chí: nội dung, hình thức, sáng tạo và hiệu quả.", "Three groups of criteria: content, form, creativity and effectiveness."),
        RUBRIC_HTML,
        RUBRIC_CSS,
        300,
    ),
    T(
        "### Tóm tắt và tự kiểm tra\n\n| Nội dung | Ghi nhớ |\n|---|---|\n| Quy trình | chuẩn bị → tiến hành thiết kế → công bố và hiệu chỉnh |\n| Chuẩn bị | định hình ý tưởng · thiết kế cấu trúc · chuẩn bị tư liệu |\n| Sản phẩm | 3–4 bài viết, đa phương tiện, bảng chọn, liên kết, biểu mẫu, thuyết minh |\n| Thanh điều hướng ngang | *Cài đặt* → *Điều hướng* → *Trên cùng* |\n| Đổi thứ tự trang | kéo thả trong bảng chọn *Trang* |\n| Bản quyền | hình ảnh, video không vi phạm bản quyền, ghi nguồn |\n\n**Tự kiểm tra:** bước nào trong quy trình dùng ý kiến thu được từ biểu mẫu? (đáp án: công bố và hiệu chỉnh). Vì sao đề tài không nên quá rộng? (đáp án: để nhanh chóng chuẩn bị đủ tư liệu và hoàn thiện sản phẩm trong thời gian có hạn).",
        "### Summary and self-check\n\n| Topic | Remember |\n|---|---|\n| Process | prepare → design → publish and adjust |\n| Preparation | shape the idea · design the structure · prepare materials |\n| Product | 3–4 articles, multimedia, menu, links, form, description |\n| Horizontal navigation | *Settings* → *Navigation* → *Top* |\n| Reordering pages | drag and drop in the *Pages* menu |\n| Copyright | images and video must not infringe copyright; credit sources |\n\n**Self-check:** which step uses the opinions gathered by the form? (answer: publish and adjust). Why should the subject not be too broad? (answer: so enough materials can be prepared and the product finished quickly within limited time).",
    ),
]

questions = [
    mc("tin12-b28-mc-01", 1, "Quy trình chung để xây dựng một trang web gồm những bước nào?", "What steps does the general process of building a web page include?",
       "Quy trình gồm chuẩn bị, tiến hành thiết kế, rồi công bố trang web và hiệu chỉnh.", "The process is prepare, design, then publish the site and adjust.", "B",
       ("Công bố → thiết kế → chuẩn bị", "Publish → design → prepare"), ("Chuẩn bị → thiết kế → công bố và hiệu chỉnh", "Prepare → design → publish and adjust"), ("Thiết kế → công bố → chuẩn bị", "Design → publish → prepare"), ("Chỉ cần chọn giao diện rồi công bố", "Just pick a theme and publish")),
    mc("tin12-b28-mc-02", 1, "Việc nào sau đây thuộc bước chuẩn bị xây dựng trang web?", "Which of these belongs to the preparation step of building a web page?",
       "Xác định mục đích và đối tượng người dùng là việc của bước định hình ý tưởng, thuộc bước chuẩn bị.", "Setting the purpose and the audience is part of shaping the idea, which belongs to preparation.", "C",
       ("Bấm nút Công bố", "Click the Publish button"), ("Kéo thả thay đổi thứ tự trang", "Drag and drop to reorder pages"), ("Xác định mục đích và đối tượng người dùng", "Set the purpose and the audience"), ("Thu thập kết quả biểu mẫu", "Gather the form results")),
    mc("tin12-b28-mc-03", 1, "Sản phẩm trang web của bài thực hành cần có ít nhất bao nhiêu bài viết ngắn gọn?", "How many short articles must the web product of the practice have at least?",
       "Nội dung gồm tư liệu đa phương tiện với ít nhất 3 đến 4 bài viết ngắn gọn.", "The content has multimedia materials with at least 3 to 4 short articles.", "D",
       ("Một bài", "One article"), ("Hai bài", "Two articles"), ("Mười bài", "Ten articles"), ("Từ 3 đến 4 bài", "3 to 4 articles")),
    mc("tin12-b28-mc-04", 1, "Theo bảng tiêu chí, trang chủ cần có tối thiểu những gì?", "According to the rubric, what must the home page have at least?",
       "Trang chủ có tối thiểu 3 bài viết kèm minh hoạ và xây dựng được 3 trang con tương ứng.", "The home page has at least 3 articles with illustrations and 3 corresponding subpages.", "A",
       ("3 bài viết kèm minh hoạ và 3 trang con tương ứng", "3 articles with illustrations and 3 matching subpages"), ("Chỉ một dòng tiêu đề", "Just a title line"), ("Một bức ảnh không có chữ", "One picture with no text"), ("Chỉ một biểu mẫu", "Just one form")),
    mc("tin12-b28-mc-05", 2, "Yêu cầu nào sau đây KHÔNG nằm trong yêu cầu của sản phẩm?", "Which of these is NOT among the product's requirements?",
       "Sản phẩm cần có đa phương tiện, bảng chọn, liên kết và biểu mẫu; trang chỉ có chữ thuần không đáp ứng yêu cầu.", "The product needs multimedia, a menu, links and a form; a page with plain text alone does not meet the requirements.", "B",
       ("Có bảng chọn ở thanh điều hướng đi tới các trang con", "A menu on the navigation bar leading to subpages"), ("Mọi trang chỉ gồm chữ thuần, không cần hình ảnh", "Every page only plain text, no pictures"), ("Có liên kết trong bài viết tới trang khác", "Links in articles to other pages"), ("Có biểu mẫu với nội dung hợp lí", "A form with sensible content")),
    mc("tin12-b28-mc-06", 2, "Khi dùng hình ảnh và video trên trang web, yêu cầu nào là đúng?", "When using images and video on the site, which requirement is right?",
       "Hình ảnh, video cần chất lượng tốt, phù hợp nội dung và không vi phạm bản quyền (có trích dẫn nguồn khi cần).", "Images and videos must be good quality, fit the content and not infringe copyright (credit sources when needed).", "C",
       ("Lấy mọi ảnh trên mạng mà không cần ghi nguồn", "Take any image from the Internet without credit"), ("Càng nhiều ảnh càng tốt, không cần liên quan", "The more images the better, relevant or not"), ("Không vi phạm bản quyền, có trích dẫn đầy đủ khi cần", "No copyright infringement, with full credit when needed"), ("Chỉ dùng ảnh mờ cho nhẹ trang", "Use only blurry images to make the page light")),
    mc("tin12-b28-mc-07", 2, "Khi chọn đề tài cho website, nhận xét nào hợp lí?", "When choosing a subject for the website, which comment is sensible?",
       "Đề tài không nên quá rộng, đối tượng nên hạn chế và yêu cầu vừa phải để nhanh chóng chuẩn bị được tư liệu.", "The subject should not be too broad, the audience limited and the requirements moderate so materials are prepared quickly.", "D",
       ("Đề tài càng rộng càng tốt", "The broader the subject the better"), ("Nên chọn đề tài không ai trong nhóm biết", "Pick a subject nobody in the team knows"), ("Không cần quan tâm đối tượng người dùng", "Ignore the audience"), ("Không nên quá rộng, tư liệu dễ chuẩn bị, gắn với sở thích của nhóm càng tốt", "Not too broad, easy to prepare materials for, better if linked to the team's interests")),
    mc("tin12-b28-mc-08", 2, "Muốn đổi thứ tự hiển thị của các trang hoặc biến trang cấp 1 thành cấp 2, em làm thế nào?", "How do you change the display order of pages or turn a level-1 page into level 2?",
       "Dùng thao tác kéo thả các trang trong bảng chọn Trang.", "Drag and drop the pages in the Pages menu.", "A",
       ("Kéo thả các trang trong bảng chọn Trang", "Drag and drop pages in the Pages menu"), ("Xoá cả website rồi làm lại", "Delete the whole site and start over"), ("Đổi tên tệp lưu trữ", "Rename the stored file"), ("Tắt chế độ xem trước", "Turn off Preview")),
    mc("tin12-b28-mc-09", 2, "Muốn bảng chọn điều hướng nằm ngang ở trên cùng trang, em chọn thao tác nào?", "To place the navigation menu horizontally at the top of the page, which operation do you choose?",
       "Vào Cài đặt, Điều hướng, Phần tử xuất hiện nhiều nhất rồi chọn Trên cùng.", "Go to Settings, Navigation, Most prominent element and choose Top.", "B",
       ("Chèn → Bản đồ", "Insert → Map"), ("Cài đặt → Điều hướng → Trên cùng", "Settings → Navigation → Top"), ("Công bố → Chia sẻ", "Publish → Share"), ("Trang → Xoá", "Pages → Delete")),
    mc("tin12-b28-mc-10", 2, "Muốn thay đổi màu sắc và kiểu phông chữ chung của cả website theo mẫu có sẵn, em dùng bảng chọn nào?", "Which menu do you use to change the whole site's colours and font style from a ready-made theme?",
       "Bảng chọn Giao diện cho phép chọn mẫu giao diện, phối màu và kiểu phông.", "The Themes menu lets you choose a theme, colour combination and font style.", "C",
       ("Chèn", "Insert"), ("Trang", "Pages"), ("Giao diện", "Themes"), ("Công bố", "Publish")),
    mc("tin12-b28-mc-11", 3, "Phần thuyết minh sản phẩm của nhóm cần nêu những nội dung nào?", "What should the team's product description state?",
       "Thuyết minh là bài giới thiệu ngắn gọn về mục đích, ý nghĩa của sản phẩm cùng các yêu cầu đã đạt được.", "The description is a short introduction to the product's purpose and meaning and the requirements achieved.", "D",
       ("Chỉ tên các thành viên", "Only the names of the members"), ("Toàn bộ mã nguồn của trang", "The whole source code of the page"), ("Danh sách mật khẩu tài khoản", "A list of account passwords"), ("Mục đích, ý nghĩa của sản phẩm và các yêu cầu đã đạt được", "The product's purpose, meaning and the requirements achieved")),
    mc("tin12-b28-mc-12", 3, "Nhóm thấy ảnh đẹp trên mạng và muốn dùng cho trang. Cách làm nào vừa phù hợp tiêu chí hình thức vừa đúng bản quyền?", "A team finds a lovely image online and wants to use it. Which approach fits the form criterion and respects copyright?",
       "Chỉ dùng ảnh được phép sử dụng hoặc tự chụp, và ghi rõ nguồn, tác giả khi cần; không lấy ảnh khi chưa được phép.", "Use only permitted or self-taken images and credit the source and author when needed; do not take images without permission.", "A",
       ("Dùng ảnh được phép sử dụng hoặc tự chụp và ghi rõ nguồn khi cần", "Use a permitted or self-taken image and credit the source when needed"), ("Dùng luôn mà không ghi nguồn vì ảnh đẹp", "Use it without credit because it is lovely"), ("Xoá tên tác giả khỏi ảnh rồi dùng", "Remove the author's name from the image and use it"), ("Nhận ảnh là của nhóm để được nhiều điểm", "Claim the image as the team's own to score higher")),
]

truefalse = [
    tf("tin12-b28-tf-01", 2, "Xét quy trình xây dựng trang web.", "Consider the process of building a web page.",
       "Quy trình gồm chuẩn bị, thiết kế, công bố và hiệu chỉnh; bước chuẩn bị gồm ý tưởng, cấu trúc và tư liệu; công bố rồi vẫn có thể chỉnh sửa.", "The process is prepare, design, publish and adjust; preparation covers the idea, structure and materials; after publishing you can still edit.",
       ("Quy trình gồm: chuẩn bị, tiến hành thiết kế, công bố và hiệu chỉnh.", "The process is prepare, design, publish and adjust.", True),
       ("Bước chuẩn bị gồm định hình ý tưởng, thiết kế cấu trúc và chuẩn bị tư liệu.", "Preparation covers shaping the idea, designing the structure and preparing materials.", True),
       ("Sau khi công bố thì không thể chỉnh sửa trang web nữa.", "After publishing, the website can no longer be edited.", False),
       ("Nên xác định mục đích và đối tượng người dùng trước khi chọn màu sắc, phông chữ.", "The purpose and audience should be set before choosing colours and fonts.", True)),
    tf("tin12-b28-tf-02", 2, "Xét yêu cầu đối với sản phẩm của nhóm.", "Consider the requirements for the team's product.",
       "Cần có bảng chọn, liên kết, biểu mẫu và dữ liệu đa phương tiện ở mọi trang; trang chỉ có chữ thuần không đạt.", "A menu, links, a form and multimedia on every page are needed; a text-only page fails.",
       ("Sản phẩm cần có bảng chọn ở thanh điều hướng để đi tới các trang con.", "The product needs a menu on the navigation bar leading to the subpages.", True),
       ("Sản phẩm cần có liên kết trong bài viết tới các trang khác.", "The product needs links in articles to other pages.", True),
       ("Sản phẩm cần có biểu mẫu với nội dung hợp lí.", "The product needs a form with sensible content.", True),
       ("Các trang chỉ cần chữ thuần là đủ, không cần dữ liệu đa phương tiện.", "Pages need only plain text, no multimedia.", False)),
    tf("tin12-b28-tf-03", 2, "Xét các thao tác khi xây dựng trang web.", "Consider operations when building the site.",
       "Giao diện và điều hướng thiết lập ở Cài đặt, Giao diện; có thể kéo thả đổi thứ tự trang; có thể tuỳ chỉnh thay vì chỉ dùng mẫu.", "Appearance and navigation are set under Settings and Themes; pages can be reordered by drag and drop; you can customise rather than just use a template.",
       ("Có thể kéo thả trang trong bảng chọn Trang để đổi thứ tự hiển thị.", "Pages can be dragged and dropped in the Pages menu to change their display order.", True),
       ("Bảng chọn Giao diện cho phép chọn mẫu giao diện và phối màu, phông chữ.", "The Themes menu allows choosing a theme and combining colours and fonts.", True),
       ("Chỉ được dùng đúng mẫu giao diện có sẵn, không được tuỳ chỉnh.", "Only the exact ready-made theme may be used, with no customisation.", False),
       ("Có thể đặt bảng chọn điều hướng nằm ngang ở trên cùng trang.", "The navigation menu can be placed horizontally at the top of the page.", True)),
    tf("tin12-b28-tf-04", 3, "Xét việc đánh giá và hoàn thiện sản phẩm.", "Consider evaluating and finishing the product.",
       "Đánh giá theo ba nhóm tiêu chí; ảnh và video không được vi phạm bản quyền; ý kiến từ biểu mẫu dùng để hiệu chỉnh; không cần chấm sản phẩm theo tiêu chí.", "Evaluation uses three groups of criteria; images and videos must not infringe copyright; form feedback is used to adjust; products are scored against the rubric.",
       ("Bảng tiêu chí gồm các nhóm: nội dung, hình thức, tính sáng tạo và hiệu quả.", "The rubric has the groups: content, form, creativity and effectiveness.", True),
       ("Hình ảnh và video phải không vi phạm bản quyền, có trích dẫn nguồn khi cần.", "Images and videos must not infringe copyright and must be credited when needed.", True),
       ("Ý kiến thu được từ biểu mẫu có thể dùng để hiệu chỉnh trang web.", "Opinions collected through the form can be used to adjust the site.", True),
       ("Các nhóm không cần chấm điểm, nhận xét sản phẩm của nhau.", "Teams need not score or comment on one another's products.", False)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
