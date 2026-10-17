# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_26_tin12.py
from generate_tin_common import T, build, configure, mc, tf, web_block

configure(12, "Ứng dụng tin học", "Applied informatics", "Tin học ứng dụng")

slug = "lien-ket-va-thanh-dieu-huong-bai-26-tin12"
title_vi = "Bài 26. Liên kết và thanh điều hướng"
title_en = "Lesson 26. Links and the navigation bar"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


TREE_HTML = """<h3>Cấu trúc website: cây trang</h3>
<ul class="tree">
  <li>Trang chủ
    <ul>
      <li>Tây Bắc – Đông Bắc
        <ul>
          <li>Mù Cang Chải</li>
        </ul>
      </li>
      <li>Tây Nguyên
        <ul>
          <li>Bản Đôn</li>
        </ul>
      </li>
    </ul>
  </li>
</ul>"""

TREE_CSS = """h3 { margin: 0 0 6px; }
.tree, .tree ul { list-style: none; margin: 4px 0 4px 18px; padding-left: 14px; border-left: 2px solid #0f766e; }
.tree { margin-left: 0; border-left: none; padding-left: 0; }
.tree li { margin: 4px 0; font-weight: 600; }
.tree li li { font-weight: 500; }
.tree li li li { font-weight: 400; }"""

LINK_HTML = """<article class="good">
  <h2>Mù Cang Chải</h2>
  <p>Mùa lúa chín nhuộm vàng những thửa ruộng bậc thang.</p>
  <a href="#mcc">Đọc tiếp về Mù Cang Chải</a>
  <p class="tip">Nên: văn bản liên kết mô tả rõ trang đích.</p>
</article>
<article class="bad">
  <h2>Bản Đôn</h2>
  <p>Vùng đất voi nổi tiếng của Tây Nguyên.</p>
  <a href="#bd">Nhấp vào đây</a>
  <p class="tip">Không nên: chung chung, không nói trang đích là gì.</p>
</article>"""

LINK_CSS = """article { border: 1px solid #94a3b8; border-radius: 8px; padding: 8px 12px; margin-bottom: 10px; }
article h2 { margin: 0 0 4px; font-size: 17px; }
article p { margin: 0 0 4px; font-size: 14px; }
.good { border-left: 5px solid #15803d; }
.bad { border-left: 5px solid #b91c1c; }
.tip { font-size: 12px; opacity: .8; }"""

NAV_HTML = """<nav class="top">
  <a href="#">Trang chủ</a>
  <a href="#">Tây Bắc – Đông Bắc</a>
  <a href="#">Tây Nguyên</a>
  <a href="#">Liên hệ</a>
</nav>
<p class="hint">Bảng chọn đặt ở trên cùng: Cài đặt, Điều hướng, chọn Trên cùng.</p>"""

NAV_CSS = """.top { display: flex; gap: 4px; background: #14532d; padding: 6px; border-radius: 8px; }
.top a { color: #f0fdf4; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 14px; }
.top a:first-child { background: #0f766e; }
.hint { font-size: 13px; opacity: .8; }"""

URL_HTML = """<p class="url">sites.google.com/view/ten-website/<b>home</b>/<b>tbdb</b>/<b>mcc</b></p>
<ul>
  <li><b>home</b>: Trang chủ</li>
  <li><b>tbdb</b>: trang Tây Bắc – Đông Bắc, con của Trang chủ</li>
  <li><b>mcc</b>: trang Mù Cang Chải, con của trang tbdb</li>
</ul>"""

URL_CSS = """.url { font-family: monospace; background: #f1f5f9; color: #0f172a; padding: 8px 10px; border-radius: 6px; font-size: 13px; word-break: break-all; }
.url b { color: #0f766e; }
li { margin: 4px 0; font-size: 14px; }"""

blocks = [
    T(
        "### Mục tiêu bài học\n\nSau bài này, bạn có thể:\n\n- giải thích **liên kết**, **trang chủ**, **trang con** và cách các trang web được tổ chức theo **cấu trúc hình cây**;\n- **tạo trang con** trong bảng chọn *Trang* của Google Sites và truy cập chúng;\n- tạo **liên kết** từ bài viết trên trang chủ tới trang con, với văn bản liên kết mô tả rõ trang đích;\n- thiết lập **thanh điều hướng**, đặt **địa chỉ ngắn** cho trang và hiểu cách bảng chọn hiển thị trên điện thoại.",
        "### Learning goals\n\nAfter this lesson, you can:\n\n- explain **link**, **home page**, **subpage** and how pages are organised in a **tree structure**;\n- **create subpages** in the *Pages* menu of Google Sites and open them;\n- create a **link** from an article on the home page to a subpage, with link text that describes the destination;\n- set up the **navigation bar**, give pages **short addresses** and understand how the menu looks on a phone.",
    ),
    T(
        "### 1. Các trang web được tổ chức theo cấu trúc hình cây\n\nNếu mọi bài viết dài đặt hết trên một trang, người dùng sẽ khó đọc tiếp các phần sau, và hai bài cạnh nhau có độ dài khác nhau làm lộ khoảng trống, trang mất cân đối. Giải pháp: trang đầu chỉ có **ảnh và đoạn giới thiệu ngắn**; bấm vào tên bài sẽ mở **trang riêng** có nội dung đầy đủ.\n\n- **Liên kết** (*link*): cụm từ mang liên kết; nháy chuột vào cụm từ đó sẽ đi tới trang được liên kết.\n- **Trang chủ** (*home page*): trang web đầu tiên, chứa các khối văn bản giới thiệu.\n- **Trang con**: các trang mở từ bảng chọn của trang chủ.\n\nCác trang liên kết với nhau theo **cấu trúc hình cây**: từ một gốc là trang chủ, rẽ nhánh sang các trang con, rồi trang con của trang con. Tổ chức như vậy làm website khoa học, chuyên nghiệp và dễ tìm thông tin. Nhưng **quá nhiều cấp trang con** lại làm website phức tạp, khó dùng.",
        "### 1. Pages are organised in a tree structure\n\nIf every long article sits on one page, users find it hard to keep reading, and two neighbouring articles of different lengths leave gaps that unbalance the page. The fix: the first page holds only **a picture and a short introduction**; clicking the article's name opens **its own page** with the full content.\n\n- **Link**: a phrase carrying a link; clicking it takes you to the linked page.\n- **Home page**: the first page, holding the introductory text blocks.\n- **Subpage**: a page opened from the home page's menu.\n\nPages are linked in a **tree structure**: from a root, the home page, branching into subpages, then subpages of subpages. This makes a site well organised, professional and easy to search. But **too many levels of subpages** make a site complicated and hard to use.",
    ),
    web_block(
        sim("Cây trang của website “Việt Nam – Vẻ đẹp tiềm ẩn”", "The page tree of the “Vietnam – Hidden Beauty” site", "Trang chủ là gốc, hai trang con Tây Bắc – Đông Bắc và Tây Nguyên, mỗi trang lại có một trang con riêng.", "The home page is the root, with two subpages, Northwest – Northeast and Central Highlands, each with a subpage of its own."),
        TREE_HTML,
        TREE_CSS,
        380,
    ),
    T(
        "### 2. Tạo và truy cập các trang con\n\n1. Mở bảng chọn **Trang**.\n2. Nháy dấu cộng cạnh *Trang chủ* → **Thêm trang con** → gõ tên (ví dụ *Tây Bắc – Đông Bắc*) → *Xong*.\n3. Tạo trang con của trang con: làm tương tự cạnh trang vừa tạo (ví dụ *Mù Cang Chải* nằm trong *Tây Bắc – Đông Bắc*).\n4. Dùng chế độ **Xem trước** để kiểm tra; mở các trang con từ bảng chọn xổ ra từ *Trang chủ*.\n5. Thêm nội dung (bài viết, ảnh) cho trang con giống như làm trang chủ.\n\nTrang con **không có sẵn nội dung giống trang chủ**: phần đầu của nó được tạo tự động với hình nền của trang chủ và tiêu đề là tên trang con. Hệ thống cũng tự tạo **đường dẫn (URL) riêng** cho mỗi trang con, và các trang con có thể tuỳ chỉnh giao diện nhưng vẫn nên thống nhất với nhau.",
        "### 2. Creating and opening subpages\n\n1. Open the **Pages** menu.\n2. Click the plus beside *Home* → **Add subpage** → type a name (for example *Northwest – Northeast*) → *Done*.\n3. Create a subpage of a subpage: do the same beside the page just made (for example *Mù Cang Chải* inside *Northwest – Northeast*).\n4. Use **Preview** to check; open the subpages from the menu that drops down from *Home*.\n5. Add content (articles, pictures) to a subpage just like the home page.\n\nA subpage **does not come with the home page's content**: its header is made automatically with the home page's background and a title equal to the subpage name. The system also creates a **separate URL** for each subpage, and subpages should look consistent with one another.",
    ),
    T(
        "### 3. Tạo liên kết từ trang chủ tới trang con\n\nTại trang chủ, di chuyển tới cuối đoạn giới thiệu Mù Cang Chải → nháy chuột phải → chọn biểu tượng **chèn liên kết** → chọn trang *Mù Cang Chải* → nhập văn bản liên kết (ví dụ *Đọc tiếp*) → *Áp dụng*.\n\n**Nguyên tắc văn bản liên kết:** mô tả rõ, chính xác nội dung của trang đích, tránh những cụm chung chung như \"nhấp vào đây\", \"di chuyển\", \"click chuột\".\n\n**Liên kết nội bộ và liên kết ngoài:**\n\n- liên kết **nội bộ** nối các trang liên quan trong cùng website, giúp người dùng tìm thêm thông tin và ở lại website lâu hơn, nên được ưu tiên;\n- liên kết tới **trang bên ngoài** nên dẫn tới những trang uy tín để tăng độ tin cậy cho website.",
        "### 3. Creating a link from the home page to a subpage\n\nOn the home page, move to the end of the Mù Cang Chải introduction → right-click → choose the **insert link** icon → choose the page *Mù Cang Chải* → type the link text (for example *Read more*) → *Apply*.\n\n**Rule for link text:** describe the destination page clearly and accurately; avoid vague phrases such as \"click here\", \"go\", \"click\".\n\n**Internal and external links:**\n\n- **internal** links connect related pages in the same website, help users find more information and stay longer, so they are to be preferred;\n- links to **outside pages** should lead to reputable pages to raise the site's credibility.",
    ),
    web_block(
        sim("Liên kết tốt và liên kết chưa tốt", "A good link and a poor link", "Hai bài giới thiệu cùng dẫn tới trang con, nhưng chỉ liên kết thứ nhất nói rõ trang đích.", "Two introductions lead to a subpage, but only the first link says what the destination is."),
        LINK_HTML,
        LINK_CSS,
        380,
    ),
    T(
        "### 4. Thanh điều hướng, địa chỉ ngắn và các thiết bị\n\n**Thanh điều hướng.** Bảng chọn có thể hiển thị **bên trái** hoặc **trên cùng**: mở *Cài đặt* → *Điều hướng* → *Phần tử xuất hiện nhiều nhất* → chọn *Trên cùng* hoặc *Bên*. Trên máy tính, trang nào cũng truy cập được qua thanh điều hướng, nhưng cũng truy cập được bằng **địa chỉ URL chi tiết** của nó.\n\n**Địa chỉ ngắn.** URL tự tạo thường dài, khó nhớ. Google Sites cho đặt địa chỉ ngắn gọn: nháy biểu tượng sau tên trang → **Thuộc tính** → **Nâng cao** → nhập địa chỉ (ví dụ `home`, `tbdb`, `mcc`). Sau khi **xuất bản lại**, trang Mù Cang Chải sẽ có địa chỉ dạng `…/home/tbdb/mcc`. Đường dẫn phản ánh đúng cấu trúc cây: `mcc` là con của `tbdb`, `tbdb` là con của `home`.\n\n**Trên điện thoại hay máy tính bảng**, Google Sites tự điều chỉnh giao diện; bảng chọn trên thanh điều hướng thu gọn thành biểu tượng để đỡ chiếm chỗ. Có thể chỉnh để bảng chọn trên máy tính hiển thị giống như trên điện thoại. Cuối cùng, trong bảng chọn *Trang* có thể **kéo thả** để đổi vị trí và cấp của các trang.",
        "### 4. The navigation bar, short addresses and devices\n\n**Navigation bar.** The menu can appear on the **left** or at the **top**: open *Settings* → *Navigation* → *Most prominent element* → choose *Top* or *Side*. On a computer every page can be reached through the navigation bar, and also through its own **detailed URL**.\n\n**Short addresses.** Automatic URLs are long and hard to remember. Google Sites lets you set short ones: click the icon after the page name → **Properties** → **Advanced** → type the address (for example `home`, `tbdb`, `mcc`). After you **publish again**, the Mù Cang Chải page gets an address like `…/home/tbdb/mcc`. The path mirrors the tree: `mcc` is a child of `tbdb`, which is a child of `home`.\n\n**On a phone or tablet** Google Sites adjusts the layout itself; the navigation menu shrinks into an icon to save space. The menu on a computer can be set to look like the one on a phone. Finally, in the *Pages* menu you can **drag and drop** to change the position and level of pages.",
    ),
    web_block(
        sim("Thanh điều hướng đặt ở trên cùng", "A navigation bar at the top", "Bảng chọn gồm Trang chủ và các trang con; mục đang mở được tô sáng.", "The menu lists the home page and subpages; the current entry is highlighted."),
        NAV_HTML,
        NAV_CSS,
        220,
    ),
    web_block(
        sim("Địa chỉ ngắn phản ánh cây trang", "A short address mirrors the page tree", "Mỗi đoạn trong địa chỉ là một trang: home, tbdb, mcc từ gốc tới lá.", "Each segment of the address is a page: home, tbdb, mcc from root to leaf."),
        URL_HTML,
        URL_CSS,
        240,
    ),
    T(
        "### Tóm tắt và tự kiểm tra\n\n| Nội dung | Ghi nhớ |\n|---|---|\n| Cấu trúc | cây: trang chủ → trang con → trang con của trang con |\n| Tạo trang con | bảng chọn **Trang** → dấu cộng cạnh trang → *Thêm trang con* |\n| Liên kết | văn bản mô tả rõ trang đích; ưu tiên liên kết nội bộ |\n| Thanh điều hướng | *Cài đặt* → *Điều hướng* → *Trên cùng* hoặc *Bên* |\n| Địa chỉ ngắn | *Thuộc tính* → *Nâng cao*; xuất bản lại để áp dụng |\n| Thiết bị di động | giao diện tự điều chỉnh, bảng chọn thu gọn thành biểu tượng |\n\n**Tự kiểm tra:** vì sao không nên đặt liên kết có chữ \"nhấp vào đây\"? (đáp án: không cho biết trang đích là gì). Liên kết nội bộ có lợi gì? (đáp án: giúp người dùng tìm thêm thông tin liên quan và ở lại website lâu hơn).",
        "### Summary and self-check\n\n| Topic | Remember |\n|---|---|\n| Structure | a tree: home page → subpage → subpage of a subpage |\n| Creating subpages | **Pages** menu → plus beside a page → *Add subpage* |\n| Links | text that clearly describes the destination; prefer internal links |\n| Navigation bar | *Settings* → *Navigation* → *Top* or *Side* |\n| Short address | *Properties* → *Advanced*; publish again to apply |\n| Mobile devices | the layout adjusts itself, the menu shrinks to an icon |\n\n**Self-check:** why should a link not say \"click here\"? (answer: it does not tell what the destination is). What is the benefit of internal links? (answer: they help users find related information and stay longer on the website).",
    ),
]

questions = [
    mc("tin12-b26-mc-01", 1, "Để tạo trang con trong Google Sites, em sử dụng bảng chọn nào?", "Which menu do you use to create a subpage in Google Sites?",
       "Trang con được tạo trong bảng chọn Trang.", "Subpages are created in the Pages menu.", "B",
       ("Bảng chọn Chèn", "The Insert menu"), ("Bảng chọn Trang", "The Pages menu"), ("Bảng chọn Giao diện", "The Themes menu"), ("Bảng chọn Cấu trúc", "The Structure menu")),
    mc("tin12-b26-mc-02", 1, "Các trang web của một website thường được tổ chức theo cấu trúc nào?", "In what structure are the pages of a website usually organised?",
       "Các trang được tổ chức theo cấu trúc hình cây, từ trang chủ rẽ nhánh sang các trang con.", "Pages are organised in a tree structure, branching from the home page into subpages.", "C",
       ("Một dòng thẳng duy nhất", "A single straight line"), ("Bảng hai chiều", "A two-dimensional table"), ("Hình cây", "A tree"), ("Hình tròn khép kín", "A closed circle")),
    mc("tin12-b26-mc-03", 1, "Trang chủ của một website là trang nào?", "Which page is the home page of a website?",
       "Trang chủ là trang web đầu tiên, chứa các khối văn bản giới thiệu.", "The home page is the first page, containing the introductory text blocks.", "D",
       ("Trang chứa mọi bài viết dài đầy đủ", "The page with all the full long articles"), ("Trang con cuối cùng của website", "The last subpage of the website"), ("Trang chỉ có biểu mẫu", "A page with only a form"), ("Trang web đầu tiên chứa các khối văn bản giới thiệu", "The first page, holding the introductory text blocks")),
    mc("tin12-b26-mc-04", 1, "Muốn đi tới một trang con, người dùng thường làm thế nào?", "How does a user usually get to a subpage?",
       "Nháy chuột vào tên trang đó ở bảng chọn mở từ trang chủ (hoặc vào liên kết trong bài viết).", "Click the page name in the menu opened from the home page (or a link in an article).", "A",
       ("Nháy vào tên trang ở bảng chọn mở từ Trang chủ", "Click the page name in the menu opened from the home page"), ("Gõ lại toàn bộ nội dung trang", "Retype the whole content of the page"), ("Xoá trang chủ", "Delete the home page"), ("Đổi tên tệp lưu trữ", "Rename the stored file")),
    mc("tin12-b26-mc-05", 2, "Văn bản của một liên kết nên được viết như thế nào?", "How should the text of a link be written?",
       "Văn bản liên kết nên mô tả rõ, chính xác nội dung của trang đích.", "Link text should describe the destination page clearly and accurately.", "B",
       ("Càng chung chung càng tốt", "As vague as possible"), ("Mô tả rõ nội dung của trang đích", "Describe the destination page clearly"), ("Chỉ ghi \"nhấp vào đây\"", "Just \"click here\""), ("Để trống", "Leave it empty")),
    mc("tin12-b26-mc-06", 2, "Liên kết nội bộ giữa các trang liên quan trong website có lợi ích gì?", "What is the benefit of internal links between related pages of a website?",
       "Liên kết nội bộ giúp người dùng tìm thêm thông tin về chủ đề và tăng thời gian họ ở lại website.", "Internal links help users find more about a topic and increase the time they stay on the site.", "C",
       ("Làm trang web tải chậm hơn", "They make the page load slower"), ("Làm mất địa chỉ URL", "They remove the URL"), ("Giúp tìm thêm thông tin liên quan và ở lại website lâu hơn", "They help users find related information and stay longer"), ("Không có lợi ích gì", "They have no benefit")),
    mc("tin12-b26-mc-07", 2, "Phát biểu nào sau đây về trang con là SAI?", "Which statement about subpages is WRONG?",
       "Sau khi tạo, trang con chưa có nội dung giống trang chủ; phần đầu được tạo tự động với hình nền của trang chủ và tiêu đề là tên trang con.", "After creation, a subpage does not have the home page's content; its header is automatic with the home page's background and the subpage's name as the title.", "D",
       ("Muốn mở trang con, nháy tên trang ở bảng chọn mở từ Trang chủ", "To open a subpage, click its name in the menu opened from the home page"), ("Google Sites tự điều chỉnh giao diện trên điện thoại", "Google Sites adjusts the layout on phones itself"), ("Phần đầu của trang con tạo tự động với hình nền trang chủ", "A subpage's header is made automatically with the home page's background"), ("Sau khi tạo, trang con đã có sẵn nội dung giống trang chủ", "After creation, a subpage already has content identical to the home page")),
    mc("tin12-b26-mc-08", 2, "Muốn đặt địa chỉ ngắn gọn cho một trang trong Google Sites, em dùng mục nào?", "Which entry do you use to give a page a short address in Google Sites?",
       "Nháy biểu tượng sau tên trang, chọn Thuộc tính rồi Nâng cao và nhập địa chỉ ngắn.", "Click the icon after the page name, choose Properties then Advanced and type the short address.", "A",
       ("Thuộc tính, Nâng cao", "Properties, Advanced"), ("Chèn, Hình ảnh", "Insert, Images"), ("Giao diện, Màu sắc", "Themes, Colours"), ("Xem trước, Điện thoại", "Preview, Phone")),
    mc("tin12-b26-mc-09", 2, "Muốn bảng chọn điều hướng hiển thị ở trên cùng hoặc bên trái trên máy tính, em chọn thao tác nào?", "To display the navigation menu at the top or on the left on a computer, which operation do you choose?",
       "Vào Cài đặt, chọn Điều hướng, rồi mục Phần tử xuất hiện nhiều nhất và chọn Trên cùng hoặc Bên.", "Go to Settings, choose Navigation, then Most prominent element and choose Top or Side.", "B",
       ("Chèn, Bản đồ, Bên", "Insert, Map, Side"), ("Cài đặt, Điều hướng, Phần tử xuất hiện nhiều nhất", "Settings, Navigation, Most prominent element"), ("Công bố, Chia sẻ, Bên", "Publish, Share, Side"), ("Trang, Xoá, Trên cùng", "Pages, Delete, Top")),
    mc("tin12-b26-mc-10", 2, "Khi người dùng truy cập bằng điện thoại, bảng chọn trên thanh điều hướng thường như thế nào?", "When a user visits on a phone, what happens to the menu on the navigation bar?",
       "Google Sites tự điều chỉnh giao diện; bảng chọn thu gọn thành một biểu tượng để tiết kiệm chỗ.", "Google Sites adjusts the layout itself; the menu shrinks into an icon to save space.", "C",
       ("Biến mất hoàn toàn", "It disappears completely"), ("Luôn mở rộng chiếm cả màn hình", "It is always open across the whole screen"), ("Thu gọn thành một biểu tượng", "It shrinks into an icon"), ("Chuyển thành bảng tính", "It turns into a spreadsheet")),
    mc("tin12-b26-mc-11", 3, "Địa chỉ …/home/tbdb/mcc cho biết điều gì về cấu trúc website?", "What does the address …/home/tbdb/mcc tell you about the website's structure?",
       "Đường dẫn thể hiện cây trang: mcc là trang con của tbdb, và tbdb là trang con của home.", "The path shows the page tree: mcc is a subpage of tbdb, and tbdb is a subpage of home.", "D",
       ("home là trang con của mcc", "home is a subpage of mcc"), ("Ba trang này là ba trang độc lập, không liên quan", "These three pages are independent and unrelated"), ("tbdb và mcc là hai trang con cùng cấp của home", "tbdb and mcc are two sibling subpages of home"), ("mcc là trang con của tbdb, tbdb là trang con của home", "mcc is a subpage of tbdb, and tbdb is a subpage of home")),
    mc("tin12-b26-mc-12", 3, "Một nhóm tạo quá nhiều cấp trang con cho website nhỏ của mình. Nhận xét nào hợp lí nhất?", "A team makes too many levels of subpages for its small website. Which comment is the most sensible?",
       "Quá nhiều cấp trang con làm website phức tạp, khó dùng; nên tổ chức đủ cấp để người dùng tìm thông tin dễ dàng.", "Too many subpage levels make a site complicated and hard to use; keep just enough levels for users to find information easily.", "A",
       ("Nên giảm số cấp, vì quá nhiều cấp làm website phức tạp, khó dùng", "Reduce the levels, because too many make the site complicated and hard to use"), ("Càng nhiều cấp càng chuyên nghiệp", "The more levels, the more professional"), ("Số cấp không ảnh hưởng gì đến người dùng", "The number of levels does not affect users"), ("Nên bỏ hết trang con, chỉ dùng trang chủ", "Drop all subpages and use only the home page")),
]

truefalse = [
    tf("tin12-b26-tf-01", 2, "Xét việc tổ chức trang web bằng trang con và liên kết.", "Consider organising a site with subpages and links.",
       "Cấu trúc cây tăng tính chuyên nghiệp; nhiều cấp trang con làm phức tạp; liên kết nội bộ không chỉ đặt ở phần điều hướng; trang con không bắt buộc cùng giao diện mọi chi tiết.", "A tree structure adds professionalism; many levels add complexity; internal links are not confined to the navigation; subpages need not share every detail of appearance.",
       ("Sử dụng cấu trúc hình cây giúp tăng tính chuyên nghiệp cho trang web.", "Using a tree structure makes a website more professional.", True),
       ("Tạo quá nhiều cấp trang con có thể làm trang web phức tạp và khó dùng.", "Creating too many subpage levels can make a site complicated and hard to use.", True),
       ("Liên kết nội bộ chỉ được đặt trong phần điều hướng của trang web.", "Internal links may be placed only in the navigation part of the site.", False),
       ("Tất cả các trang con đều bắt buộc phải có cùng một giao diện hoàn toàn giống nhau.", "All subpages are required to have exactly the same appearance.", False)),
    tf("tin12-b26-tf-02", 2, "Xét văn bản liên kết.", "Consider link text.",
       "Văn bản liên kết nên mô tả trang đích; \"nhấp vào đây\" quá chung chung; đọc tiếp về Mù Cang Chải rõ nghĩa; liên kết ngoài nên dẫn tới trang uy tín.", "Link text should describe the destination; \"click here\" is too vague; \"Read more about Mù Cang Chải\" is clear; external links should lead to reputable pages.",
       ("Văn bản liên kết nên mô tả rõ nội dung của trang đích.", "Link text should describe the destination page clearly.", True),
       ("\"Nhấp vào đây\" là văn bản liên kết tốt vì ngắn gọn.", "\"Click here\" is good link text because it is short.", False),
       ("\"Đọc tiếp về Mù Cang Chải\" cho biết rõ trang đích.", "\"Read more about Mù Cang Chải\" shows the destination clearly.", True),
       ("Liên kết tới trang bên ngoài nên dẫn tới các trang uy tín.", "Links to outside pages should lead to reputable pages.", True)),
    tf("tin12-b26-tf-03", 2, "Xét địa chỉ ngắn của trang.", "Consider the short address of a page.",
       "Google Sites hỗ trợ địa chỉ ngắn trong Thuộc tính – Nâng cao; cần xuất bản lại để áp dụng; địa chỉ có thể đổi.", "Google Sites supports short addresses under Properties – Advanced; you must publish again to apply them; the address can be changed.",
       ("Google Sites cho phép đặt địa chỉ ngắn gọn cho từng trang.", "Google Sites allows a short address for each page.", True),
       ("Địa chỉ ngắn được đặt ở Thuộc tính, mục Nâng cao.", "The short address is set under Properties, Advanced.", True),
       ("Sau khi đổi địa chỉ, cần xuất bản lại website để áp dụng.", "After changing an address, the site must be published again to apply it.", True),
       ("Địa chỉ của một trang một khi đã tạo thì không thể thay đổi.", "Once a page's address is created it can never be changed.", False)),
    tf("tin12-b26-tf-04", 3, "Xét thanh điều hướng và các thiết bị.", "Consider the navigation bar and devices.",
       "Giao diện tự điều chỉnh trên điện thoại; bảng chọn thu gọn thành biểu tượng; có thể kéo thả đổi thứ tự trang; bảng chọn không cố định đặt mãi mở rộng trên điện thoại.", "The layout adjusts itself on phones; the menu shrinks to an icon; pages can be reordered by drag and drop; the menu is not kept permanently expanded on phones.",
       ("Google Sites tự điều chỉnh giao diện khi truy cập bằng điện thoại.", "Google Sites adjusts the layout automatically when visited on a phone.", True),
       ("Trên điện thoại bảng chọn thu gọn thành một biểu tượng.", "On a phone the menu shrinks into an icon.", True),
       ("Có thể kéo thả trong bảng chọn Trang để đổi vị trí các trang.", "Pages can be repositioned by drag and drop in the Pages menu.", True),
       ("Trên điện thoại, bảng chọn luôn mở rộng đầy đủ chiếm nửa màn hình.", "On a phone the menu is always fully expanded across half the screen.", False)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
