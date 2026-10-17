# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_25_tin12.py
from generate_tin_common import T, build, configure, mc, tf, web_block

configure(12, "Ứng dụng tin học", "Applied informatics", "Tin học ứng dụng")

slug = "xay-dung-phan-than-va-chan-trang-web-bai-25-tin12"
title_vi = "Bài 25. Xây dựng phần thân và chân trang web"
title_en = "Lesson 25. Building the body and footer of a web page"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


BODY_HTML = """<main>
  <article>
    <div class="photo">Ảnh Mù Cang Chải</div>
    <h2>Mù Cang Chải</h2>
    <p>Những thửa ruộng bậc thang uốn lượn trên sườn núi.</p>
  </article>
  <article>
    <div class="photo">Ảnh Thung Nham</div>
    <h2>Thung Nham</h2>
    <p>Hang động, núi đá vôi và vườn chim nổi tiếng.</p>
  </article>
</main>"""

BODY_CSS = """main { display: flex; gap: 12px; }
article { flex: 1; border: 1px solid #94a3b8; border-radius: 8px; overflow: hidden; }
.photo { height: 90px; background: linear-gradient(135deg, #166534, #0f766e); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; }
article h2 { margin: 8px 10px 2px; font-size: 17px; }
article p { margin: 0 10px 10px; font-size: 14px; }"""

MAP_HTML = """<article>
  <h2>Thung Nham</h2>
  <p>Hang động, núi đá vôi và vườn chim nổi tiếng.</p>
  <div class="map">
    <b>Bản đồ nhúng (Google Maps)</b>
    <span>Vị trí: Thung Nham, Ninh Bình</span>
  </div>
  <p class="note">Bản đồ nhúng là dữ liệu động: kéo, phóng to, thu nhỏ ngay trên trang.</p>
</article>"""

MAP_CSS = """article { border: 1px solid #94a3b8; border-radius: 8px; padding: 10px 12px; }
article h2 { margin: 0 0 4px; font-size: 18px; }
.map { height: 110px; background: repeating-linear-gradient(45deg, #dcfce7, #dcfce7 12px, #bbf7d0 12px, #bbf7d0 24px); color: #14532d; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 8px 0; }
.map span { font-size: 12px; }
.note { font-size: 13px; opacity: .8; margin: 0; }"""

FOOTER_HTML = """<footer>
  <p>Bản quyền thuộc nhóm Vẻ đẹp tiềm ẩn. Ảnh do nhóm tự chụp.</p>
  <p>Liên hệ: tiemam@example.edu.vn</p>
  <div class="social">
    <a href="#">Facebook</a>
    <a href="#">YouTube</a>
    <a href="#">Instagram</a>
  </div>
</footer>"""

FOOTER_CSS = """footer { background: #14532d; color: #f0fdf4; padding: 12px 16px; border-radius: 8px; font-size: 13px; }
footer p { margin: 0 0 4px; }
.social { margin-top: 8px; }
.social a { color: #fde68a; margin-right: 14px; }"""

blocks = [
    T(
        "### Mục tiêu bài học\n\nSau bài này, bạn có thể:\n\n- nhận biết ba bảng chọn **Chèn**, **Trang**, **Giao diện** và các nhóm lệnh của bảng chọn *Chèn* trong Google Sites;\n- tạo phần thân trang gồm các **khối nội dung** có ảnh, tiêu đề và bài viết;\n- **nhúng bản đồ** (và các ứng dụng khác) vào trang web;\n- **chỉnh sửa** đối tượng đã có: đổi kích thước, di chuyển, sao chép, xoá, hoàn tác và làm lại;\n- thiết lập **chân trang** với thông tin bản quyền, liên hệ và liên kết mạng xã hội.",
        "### Learning goals\n\nAfter this lesson, you can:\n\n- recognise the three menus **Insert**, **Pages**, **Themes** and the command groups of the *Insert* menu in Google Sites;\n- build the body of a page from **content blocks** with a picture, a heading and an article;\n- **embed a map** (and other applications) into the page;\n- **edit** existing objects: resize, move, copy, delete, undo and redo;\n- set up a **footer** with copyright, contact information and social-media links.",
    ),
    T(
        "### 1. Giao diện tạo phần thân trang\n\nỞ khung bên phải cửa sổ thiết kế có **ba bảng chọn**: **Chèn**, **Trang** và **Giao diện**. Bảng chọn **Chèn** có ba nhóm lệnh:\n\n| Nhóm | Các lệnh |\n|---|---|\n| Nhóm thứ nhất | **Hộp văn bản**, **Hình ảnh**, **Nhúng**, **Drive** |\n| Nhóm thứ hai | các **thành phần nội dung** (khối bố cục sẵn có) |\n| Nhóm thứ ba | các đối tượng khác: khối văn bản có thể thu gọn, mục lục, băng chuyền hình ảnh, **bản đồ**, đoạn video YouTube, **bộ chia**… |\n\nLệnh **Nhúng** dùng để chèn dữ liệu từ các ứng dụng khác trên Internet như thời tiết hay âm nhạc.",
        "### 1. The interface for building the body\n\nIn the right-hand panel of the design window there are **three menus**: **Insert**, **Pages** and **Themes**. The **Insert** menu has three command groups:\n\n| Group | Commands |\n|---|---|\n| First group | **Text box**, **Images**, **Embed**, **Drive** |\n| Second group | the **content elements** (ready-made layout blocks) |\n| Third group | other objects: collapsible text, table of contents, image carousel, **map**, YouTube video, **divider**… |\n\nThe **Embed** command inserts data from other Internet applications such as weather or music.",
    ),
    T(
        "### 2. Tạo phần thân trang\n\nPhần thân trang thường là các **khối hình chữ nhật**, mỗi khối một nội dung. Để có cấu trúc hai khối:\n\n1. Trong nhóm *Thành phần nội dung* của bảng chọn *Chèn*, chọn biểu tượng cấu trúc **hai khối**.\n2. Trong mỗi khối, nháy biểu tượng thêm ảnh để thêm **ảnh** vào trang; bên dưới ảnh thêm **tiêu đề** và **nội dung bài viết**.\n\nHai khối nên cân đối về ảnh và độ dài chữ để trang không bị khoảng trống lệch. Bài viết dài nên để ở trang riêng (xem Bài 26) và ở đây chỉ để phần giới thiệu ngắn. Mô phỏng sau dựng hai khối như vậy cho \"Việt Nam – Vẻ đẹp tiềm ẩn\".",
        "### 2. Building the body\n\nThe body is usually **rectangular blocks**, each with one topic. To get a two-block structure:\n\n1. In the *Content elements* group of the *Insert* menu, choose the **two-block** layout icon.\n2. In each block click the add-image icon to put a **picture** on the page; below it add a **heading** and the **article text**.\n\nThe two blocks should be balanced in picture and text length so the page does not show lopsided gaps. A long article is better on its own page (see Lesson 26) with only a short introduction here. The simulation below builds two such blocks for \"Vietnam – Hidden Beauty\".",
    ),
    web_block(
        sim("Phần thân trang gồm hai khối nội dung", "A body made of two content blocks", "Mỗi khối có ảnh, tiêu đề và đoạn giới thiệu; hai khối xếp cạnh nhau và cân đối.", "Each block has a picture, a heading and an introduction; the two blocks sit side by side, balanced."),
        BODY_HTML,
        BODY_CSS,
        300,
    ),
    T(
        "### 3. Thêm bản đồ vào trang web\n\nThêm bản đồ vào trang thực chất là **nhúng ứng dụng bản đồ** vào trang web. Trong bảng chọn *Chèn*, chọn **Bản đồ** (ở nhóm lệnh thứ ba, hoặc qua lệnh *Nhúng*):\n\n1. Trong cửa sổ *Chọn bản đồ*, nhập tên vào ô *Nhập vị trí* hoặc dùng *Đặt dấu vị trí* và nháy chuột để chọn địa điểm trên bản đồ.\n2. Khi bản đồ đã có dấu vị trí, nháy nút **Chọn** để thêm vào trang.\n3. **Thay đổi kích thước** cho hợp lí và **di chuyển** về cuối bài viết tương ứng (ví dụ bản đồ Thung Nham, Mù Cang Chải).\n\n**Chú ý:** bản đồ nhúng khác với **ảnh chụp bản đồ**. Ảnh chụp là dữ liệu **tĩnh**; bản đồ nhúng là dữ liệu **động**, kết nối trực tiếp với cơ sở dữ liệu của Google Maps nên người xem có thể kéo, phóng to, thu nhỏ ngay trên trang.",
        "### 3. Adding a map to the page\n\nAdding a map really means **embedding a map application** into the page. In the *Insert* menu choose **Map** (in the third command group, or through *Embed*):\n\n1. In the *Choose map* window type a name into *Enter location* or use *Place marker* and click on the map to choose a place.\n2. Once the map has a marker, click **Select** to add it to the page.\n3. **Resize** it sensibly and **move** it to the end of the matching article (for example the maps of Thung Nham and Mù Cang Chải).\n\n**Note:** an embedded map differs from a **screenshot of a map**. A screenshot is **static** data; an embedded map is **dynamic** data, connected directly to the Google Maps database, so viewers can drag, zoom in and out right on the page.",
    ),
    web_block(
        sim("Bản đồ nhúng ở cuối bài viết", "An embedded map at the end of an article", "Bản đồ nằm trong khối bài viết, sau đoạn giới thiệu, và là nội dung nhúng tương tác.", "The map sits inside the article block, after the introduction, as interactive embedded content."),
        MAP_HTML,
        MAP_CSS,
        340,
    ),
    T(
        "### 4. Chỉnh sửa các đối tượng đã có\n\n- **Thay đổi kích thước, di chuyển** khối văn bản, hình ảnh, bản đồ…: nháy chọn đối tượng rồi **kéo thả chuột**.\n- **Sao chép** hoặc **xoá** một đối tượng: dùng nút lệnh tương ứng của đối tượng đang chọn.\n- **Hoàn tác** (*undo*, phím tắt Ctrl + Z) huỷ bỏ lệnh vừa thực hiện; **làm lại** (*redo*, Ctrl + Shift + Z) thực hiện lại lệnh vừa hoàn tác. Nhờ hai lệnh này ta có thể thử nghiệm bố cục mà không sợ sai.\n\nCác thao tác chèn khối nội dung, thay đổi kích thước khối, di chuyển khối hay khung nội dung bên trong khối (kể cả sang khối khác) giúp **tạo bố cục trang web nhanh và đơn giản** với giao diện nhất quán. Lệnh **Bộ chia** chèn một **đường kẻ ngang** để phân chia nội dung.",
        "### 4. Editing existing objects\n\n- **Resize and move** text blocks, images, maps…: click the object then **drag and drop** it.\n- **Copy** or **delete** an object: use the matching button of the selected object.\n- **Undo** (shortcut Ctrl + Z) cancels the command just done; **redo** (Ctrl + Shift + Z) repeats the command just undone. With these two you can try layouts without fear of mistakes.\n\nInserting content blocks, resizing blocks, moving blocks or the frames inside a block (even into another block) **builds a page layout quickly and simply** with a consistent look. The **Divider** command inserts a **horizontal line** to separate content.",
    ),
    T(
        "### 5. Thiết lập chân trang\n\nDi chuyển xuống cuối trang sẽ thấy nút **Thêm chân trang**. Tương tự phần thân, ta chèn vào chân trang các khối văn bản và sắp xếp theo ý muốn. Có thể chèn **liên kết đến mạng xã hội** của chủ thể trang web bằng lệnh *Đường liên kết đến mạng xã hội* rồi nhập địa chỉ các liên kết.\n\nChân trang là nơi thể hiện **bản quyền**: ghi tên chủ thể, tác giả, **nguồn của ảnh và tư liệu** đã dùng, và thông tin liên hệ. Làm vậy thể hiện sự tôn trọng quyền tác giả và trách nhiệm với tài sản số do mình tạo ra.",
        "### 5. Setting up the footer\n\nMove to the bottom of the page and you will see the **Add footer** button. As with the body, insert text blocks into the footer and arrange them as you like. You can insert **social-media links** of the site owner with the *Social links* command and then type the link addresses.\n\nThe footer is where **copyright** is shown: the owner's name, the authors, the **sources of images and materials** used, and contact information. This shows respect for authors' rights and responsibility for the digital property you create.",
    ),
    web_block(
        sim("Chân trang: bản quyền, liên hệ, mạng xã hội", "A footer: copyright, contact, social media", "Chân trang gồm dòng bản quyền, thông tin liên hệ và ba liên kết mạng xã hội.", "The footer has a copyright line, contact information and three social-media links."),
        FOOTER_HTML,
        FOOTER_CSS,
        240,
    ),
    T(
        "### Tóm tắt và tự kiểm tra\n\n| Nội dung | Ghi nhớ |\n|---|---|\n| Ba bảng chọn | **Chèn** · **Trang** · **Giao diện** |\n| Nhóm lệnh của *Chèn* | (1) Hộp văn bản, Hình ảnh, Nhúng, Drive · (2) thành phần nội dung · (3) đối tượng khác |\n| Phần thân | các khối hình chữ nhật: ảnh + tiêu đề + bài viết |\n| Bản đồ | nhúng ứng dụng bản đồ (dữ liệu **động**), khác ảnh chụp (dữ liệu tĩnh) |\n| Chỉnh sửa | kéo thả, sao chép, xoá, hoàn tác (Ctrl + Z), làm lại (Ctrl + Shift + Z) |\n| Chân trang | *Thêm chân trang*; bản quyền, liên hệ, liên kết mạng xã hội |\n\n**Tự kiểm tra:** muốn chèn video YouTube về Mù Cang Chải vào bài viết em làm thế nào? (đáp án: chọn lệnh YouTube ở bảng chọn *Chèn*, tìm video, nháy *Chèn*, rồi đổi kích thước và di chuyển xuống dưới bài viết).",
        "### Summary and self-check\n\n| Topic | Remember |\n|---|---|\n| Three menus | **Insert** · **Pages** · **Themes** |\n| Command groups of *Insert* | (1) Text box, Images, Embed, Drive · (2) content elements · (3) other objects |\n| Body | rectangular blocks: picture + heading + article |\n| Map | an embedded map application (**dynamic** data), unlike a screenshot (static data) |\n| Editing | drag and drop, copy, delete, undo (Ctrl + Z), redo (Ctrl + Shift + Z) |\n| Footer | *Add footer*; copyright, contact, social-media links |\n\n**Self-check:** how do you insert a YouTube video about Mù Cang Chải into an article? (answer: choose the YouTube command in the *Insert* menu, search for the video, click *Insert*, then resize it and move it below the article).",
    ),
]

questions = [
    mc("tin12-b25-mc-01", 1, "Ở khung bên phải cửa sổ thiết kế của Google Sites có những bảng chọn nào để tạo nội dung trang?", "Which menus does the right-hand panel of the Google Sites design window offer for building page content?",
       "Có ba bảng chọn là Chèn, Trang và Giao diện.", "There are three menus: Insert, Pages and Themes.", "B",
       ("Tệp, Sửa, Xem", "File, Edit, View"), ("Chèn, Trang, Giao diện", "Insert, Pages, Themes"), ("Bố cục, Mẫu, In", "Layout, Templates, Print"), ("Công bố, Chia sẻ, Thoát", "Publish, Share, Exit")),
    mc("tin12-b25-mc-02", 1, "Muốn chèn dữ liệu nhúng từ các ứng dụng Internet khác như thời tiết, âm nhạc, em nháy vào lệnh nào trong bảng chọn Chèn?", "To insert data embedded from other Internet applications such as weather or music, which command of the Insert menu do you click?",
       "Lệnh Nhúng dùng để chèn dữ liệu nhúng từ các ứng dụng khác.", "The Embed command inserts data embedded from other applications.", "C",
       ("Hộp văn bản", "Text box"), ("Drive", "Drive"), ("Nhúng", "Embed"), ("Hình ảnh", "Images")),
    mc("tin12-b25-mc-03", 1, "Việc thêm bản đồ vào trang web thực chất là gì?", "What does adding a map to a web page really mean?",
       "Thêm bản đồ là nhúng ứng dụng bản đồ vào trang web.", "Adding a map means embedding a map application into the page.", "D",
       ("Tải bản đồ về máy tính", "Downloading the map to the computer"), ("Cập nhật bản đồ trên máy chủ", "Updating the map on the server"), ("Vẽ bản đồ bằng tay trên trang", "Drawing the map by hand on the page"), ("Nhúng ứng dụng bản đồ vào trang web", "Embedding a map application into the page")),
    mc("tin12-b25-mc-04", 1, "Nhóm lệnh đầu tiên của bảng chọn Chèn gồm những lệnh nào?", "Which commands make up the first command group of the Insert menu?",
       "Nhóm đầu tiên gồm Hộp văn bản, Hình ảnh, Nhúng và Drive.", "The first group has Text box, Images, Embed and Drive.", "A",
       ("Hộp văn bản, Hình ảnh, Nhúng, Drive", "Text box, Images, Embed, Drive"), ("Bản đồ, YouTube, Mục lục, Bộ chia", "Map, YouTube, Table of contents, Divider"), ("Công bố, Xem trước, Chia sẻ, Đóng", "Publish, Preview, Share, Close"), ("Bìa, Biểu ngữ, Chỉ có tiêu đề, Logo", "Cover, Banner, Title only, Logo")),
    mc("tin12-b25-mc-05", 2, "Thao tác nào huỷ bỏ lệnh vừa thực hiện trong Google Sites?", "Which operation cancels the command just carried out in Google Sites?",
       "Hoàn tác (undo, Ctrl + Z) huỷ bỏ lệnh vừa thực hiện.", "Undo (Ctrl + Z) cancels the command just carried out.", "B",
       ("Làm lại (redo)", "Redo"), ("Hoàn tác (undo)", "Undo"), ("Sao chép", "Copy"), ("Xoá khối", "Delete the block")),
    mc("tin12-b25-mc-06", 2, "Thao tác nào thực hiện lại lệnh vừa được hoàn tác?", "Which operation repeats the command that was just undone?",
       "Làm lại (redo, Ctrl + Shift + Z) thực hiện lại lệnh vừa hoàn tác.", "Redo (Ctrl + Shift + Z) repeats the command just undone.", "C",
       ("Hoàn tác (undo)", "Undo"), ("Sao chép", "Copy"), ("Làm lại (redo)", "Redo"), ("Xuất bản", "Publish")),
    mc("tin12-b25-mc-07", 2, "Khi di chuyển xuống cuối trang, nút lệnh nào xuất hiện để thiết lập chân trang?", "When you move to the bottom of the page, which button appears to set up the footer?",
       "Ở cuối trang xuất hiện nút Thêm chân trang.", "At the bottom of the page the Add footer button appears.", "D",
       ("Thêm tiêu đề", "Add title"), ("Thêm trang con", "Add subpage"), ("Thêm bản đồ", "Add map"), ("Thêm chân trang", "Add footer")),
    mc("tin12-b25-mc-08", 2, "Để chèn liên kết đến mạng xã hội của chủ trang web ở chân trang, em dùng lệnh nào?", "Which command inserts the owner's social-media links in the footer?",
       "Lệnh Đường liên kết đến mạng xã hội cho phép nhập địa chỉ các liên kết.", "The Social links command lets you type the link addresses.", "A",
       ("Đường liên kết đến mạng xã hội", "Social links"), ("Hình ảnh", "Images"), ("Bộ chia", "Divider"), ("Loại tiêu đề", "Header type")),
    mc("tin12-b25-mc-09", 2, "Muốn thay đổi kích thước hoặc di chuyển một khối văn bản, hình ảnh hay bản đồ đã có, em làm thế nào?", "How do you resize or move an existing text block, image or map?",
       "Nháy chọn đối tượng rồi kéo thả chuột.", "Click the object then drag and drop it.", "B",
       ("Xoá đi rồi chèn lại", "Delete it and insert again"), ("Chọn đối tượng rồi kéo thả chuột", "Select the object and drag and drop"), ("Công bố lại trang web", "Publish the site again"), ("Đổi tên tệp lưu trữ", "Rename the file")),
    mc("tin12-b25-mc-10", 2, "Lệnh Bộ chia trong bảng chọn Chèn đưa vào trang web nội dung gì?", "What does the Divider command in the Insert menu put on the page?",
       "Bộ chia chèn một đường kẻ phân chia nội dung theo chiều ngang.", "The Divider inserts a horizontal line separating content.", "C",
       ("Một dấu xuống dòng", "A line break"), ("Một bảng dữ liệu", "A data table"), ("Một đường kẻ phân chia nội dung theo chiều ngang", "A horizontal line separating content"), ("Một biểu mẫu khảo sát", "A survey form")),
    mc("tin12-b25-mc-11", 3, "Điểm khác nhau chính giữa bản đồ nhúng từ Google Maps và một ảnh chụp bản đồ là gì?", "What is the main difference between an embedded Google Maps map and a screenshot of a map?",
       "Bản đồ nhúng là dữ liệu động, kết nối với dữ liệu của Google Maps nên có thể tương tác; ảnh chụp là dữ liệu tĩnh.", "An embedded map is dynamic data linked to Google Maps so it is interactive; a screenshot is static data.", "D",
       ("Ảnh chụp luôn rõ hơn bản đồ nhúng", "A screenshot is always sharper than an embedded map"), ("Bản đồ nhúng không cần Internet", "An embedded map needs no Internet"), ("Hai loại hoàn toàn giống nhau", "The two are exactly alike"), ("Bản đồ nhúng là dữ liệu động có thể kéo, phóng to; ảnh chụp là dữ liệu tĩnh", "An embedded map is dynamic and can be dragged and zoomed; a screenshot is static")),
    mc("tin12-b25-mc-12", 3, "Trình tự đúng để thêm bản đồ một địa danh vào cuối bài viết là gì?", "What is the correct order to add the map of a place at the end of an article?",
       "Chèn → Bản đồ → nhập vị trí hoặc đặt dấu → Chọn → đổi kích thước và di chuyển xuống cuối bài.", "Insert → Map → enter a location or place a marker → Select → resize and move it to the end of the article.", "A",
       ("Chèn → Bản đồ → nhập vị trí → Chọn → đổi kích thước, di chuyển", "Insert → Map → enter a location → Select → resize, move"), ("Công bố → Bản đồ → Chèn → nhập tên tệp", "Publish → Map → Insert → enter the file name"), ("Xem trước → Chọn → Bản đồ → Chèn", "Preview → Select → Map → Insert"), ("Giao diện → Chọn → nhập vị trí → Công bố", "Themes → Select → enter a location → Publish")),
]

truefalse = [
    tf("tin12-b25-tf-01", 2, "Xét phần thân trang.", "Consider the body of the page.",
       "Thân trang gồm các khối hình chữ nhật chứa văn bản và ảnh, có thể kèm bản đồ, video; mỗi khối không bị giới hạn chỉ một ảnh.", "The body is rectangular blocks holding text and images, possibly with a map or video; a block is not limited to a single image.",
       ("Phần thân trang được tổ chức thành các khối hình chữ nhật.", "The body is organised into rectangular blocks.", True),
       ("Mỗi khối có thể chứa cả ảnh, tiêu đề và văn bản.", "Each block can hold an image, a heading and text.", True),
       ("Mỗi khối chỉ được chứa một bức ảnh, không chứa được văn bản.", "Each block can hold only one image and no text.", False),
       ("Có thể đặt cả bản đồ và video YouTube vào trang.", "Both a map and a YouTube video can be placed on the page.", True)),
    tf("tin12-b25-tf-02", 2, "Xét việc thêm bản đồ.", "Consider adding a map.",
       "Bản đồ nhúng là dữ liệu động; chọn Bản đồ trong nhóm lệnh thứ ba; có thể nhập tên hoặc đặt dấu vị trí; sau khi chèn vẫn đổi được kích thước.", "An embedded map is dynamic; choose Map in the third command group; you can enter a name or place a marker; after inserting you can still resize it.",
       ("Bản đồ nhúng là dữ liệu động, người xem tương tác được ngay trên trang.", "An embedded map is dynamic; viewers can interact with it on the page.", True),
       ("Lệnh Bản đồ nằm ở nhóm lệnh thứ ba của bảng chọn Chèn.", "The Map command is in the third command group of the Insert menu.", True),
       ("Sau khi chèn, kích thước bản đồ không thể thay đổi.", "After insertion the map's size cannot be changed.", False),
       ("Có thể chọn địa điểm bằng cách nhập tên hoặc đặt dấu vị trí.", "A place can be chosen by entering a name or placing a marker.", True)),
    tf("tin12-b25-tf-03", 2, "Xét các thao tác chỉnh sửa đối tượng.", "Consider the object-editing operations.",
       "Kéo thả để di chuyển; có sao chép và xoá; hoàn tác Ctrl + Z; làm lại không phải Ctrl + Z.", "Drag and drop moves things; copy and delete exist; undo is Ctrl + Z; redo is not Ctrl + Z.",
       ("Có thể kéo thả chuột để di chuyển một đối tượng.", "You can drag and drop to move an object.", True),
       ("Có thể sao chép hoặc xoá một đối tượng đã chọn.", "A selected object can be copied or deleted.", True),
       ("Lệnh vừa thực hiện thì không thể huỷ bỏ.", "A command just carried out cannot be cancelled.", False),
       ("Ctrl + Z là phím tắt của hoàn tác (undo).", "Ctrl + Z is the shortcut for undo.", True)),
    tf("tin12-b25-tf-04", 2, "Xét phần chân trang.", "Consider the footer.",
       "Chân trang có thể chứa bản quyền, liên hệ và liên kết mạng xã hội; không phải nơi đặt bảng chọn điều hướng chính; nên ghi nguồn ảnh, tư liệu.", "The footer can hold copyright, contact and social-media links; it is not where the main navigation menu goes; sources of images and materials should be credited.",
       ("Chân trang có thể chứa liên kết đến các trang mạng xã hội.", "The footer can hold links to social-media pages.", True),
       ("Thông tin bản quyền và liên hệ phù hợp đặt ở chân trang.", "Copyright and contact information fit in the footer.", True),
       ("Chân trang là nơi bắt buộc đặt bảng chọn điều hướng chính.", "The footer is where the main navigation menu must be placed.", False),
       ("Nên ghi nguồn của ảnh và tư liệu đã dùng ở chân trang.", "The sources of images and materials used should be credited in the footer.", True)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
