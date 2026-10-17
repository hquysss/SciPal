# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_18_tin12.py
from generate_tin_common import T, build, configure, mc, tf, web_block

configure(12, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers", "Tin học ứng dụng")

slug = "thuc-hanh-tong-hop-thiet-ke-trang-web-bai-18-tin12"
title_vi = "Bài 18. Thực hành tổng hợp thiết kế trang web"
title_en = "Lesson 18. Comprehensive web page design practice"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


PAGE = """<div class="header">
  <div class="banner">CÂU LẠC BỘ NGOẠI KHOÁ</div>
  <div class="slogan">
    <div class="row">
      <div class="block_3">Khoẻ để học tốt</div>
      <div class="block_3">Sáng tạo mỗi ngày</div>
      <div class="block_3">Cùng nhau tiến bộ</div>
    </div>
  </div>
</div>
<div class="content">
  <div class="row">
    <div class="block_2">
      <h3>CLB Thể thao</h3>
      <p>Bóng đá, cầu lông, bóng rổ vào chiều thứ ba và thứ năm.</p>
    </div>
    <div class="block_2">
      <h3>CLB Nghệ thuật</h3>
      <p>Hát, vẽ, múa và sân khấu vào chiều thứ tư và thứ sáu.</p>
    </div>
  </div>
</div>
<div class="footer">
  <a href="thethao.html">Thể thao</a> | <a href="nghethuat.html">Nghệ thuật</a> | <a href="dang_ki.html">Đăng kí</a>
</div>"""

CSS_BLUE = """.banner {
  background-color: #1e4d8c;
  color: white;
  font-size: 28px;
  text-align: center;
  padding: 28px 10px;
}
.slogan {
  background-color: #fff3c4;
  padding: 10px 0;
}
.row {
  width: 100%;
}
.block_3 {
  display: inline-block;
  width: 32%;
  text-align: center;
  font-weight: bold;
  color: #7a4b00;
}
.content {
  padding: 10px;
}
.block_2 {
  display: inline-block;
  width: 48%;
  vertical-align: top;
}
h3 {
  color: #1e4d8c;
}
.footer {
  background-color: #333333;
  color: white;
  text-align: center;
  padding: 10px;
}
.footer a {
  color: #ffd54f;
}"""

CSS_RED = CSS_BLUE.replace("#1e4d8c", "#b71c1c").replace("#fff3c4", "#e8f5e9").replace("#7a4b00", "#1b5e20").replace("#333333", "#1b5e20").replace("#ffd54f", "#fff59d")

blocks = [
    T(
        """### Mục tiêu bài học

Sau bài này, bạn có thể:

- trình bày quy trình xây dựng một website nhỏ: xác định mục tiêu, thiết kế bố cục, xây các trang, kiểm tra, cập nhật;
- phân tích bố cục thành các khối `div`, đặt `class` hoặc `id` rồi viết CSS cho từng khối;
- xếp các khối thành hàng ngang, dùng **một tệp CSS** cho nhiều trang HTML;
- đổi diện mạo cả website chỉ bằng cách sửa tệp CSS.""",
        """### Learning goals

After this lesson, you can:

- describe the workflow for a small website: set goals, design the layout, build pages, test, update;
- break a layout into `div` blocks, give them a `class` or `id`, then write CSS for each block;
- place blocks in a row and use **one CSS file** for many HTML pages;
- change the look of a whole website just by editing the CSS file.""",
    ),
    T(
        """### 1. Dự án: website các câu lạc bộ ngoại khoá của trường

**Quy trình tạo website** gồm năm bước:

1. Xác định mục tiêu, nội dung của trang;
2. Thiết kế mẫu, bố cục trang;
3. Xây dựng các trang liên quan;
4. Tổng hợp, kiểm tra và tinh chỉnh;
5. Quản lí và cập nhật thông tin.

**Cấu trúc tối thiểu:** một **trang chủ** (thông tin chung về trường và các câu lạc bộ, có liên kết tới các trang con) và **hai trang con**, mỗi trang giới thiệu một câu lạc bộ (tên, giới thiệu tóm tắt, ảnh minh hoạ, bài viết về hoạt động nổi bật). Có thể thêm trang chứa biểu mẫu đăng kí. Các trang cùng dùng **một tệp CSS** để có phong cách thống nhất.

```text
clb/
├── index.html
├── thethao.html
├── nghethuat.html
├── style.css
└── images/
```

**Tiêu chí đánh giá** (mỗi tiêu chí chấm 1–5):

- **Cấu trúc:** có trang chủ và hai trang con liên kết với nhau;
- **Nội dung:** đúng chủ đề, chính xác; trang chủ có giới thiệu, logo, banner, slogan; trang con có bài viết kèm ảnh;
- **Hình thức:** bố cục khoa học, đẹp mắt; hình ảnh, video chất lượng tốt, phù hợp, **không vi phạm bản quyền** (trích dẫn nguồn khi cần).""",
        """### 1. Project: a website for the school's extracurricular clubs

**The workflow for building a website** has five steps:

1. Set the goals and content of the site;
2. Design the template and page layout;
3. Build the related pages;
4. Put together, test and refine;
5. Manage and update the information.

**Minimum structure:** a **home page** (general information about the school and its clubs, with links to the sub-pages) and **two sub-pages**, each introducing one club (name, short introduction, pictures, articles on highlights). A page with a sign-up form may be added. All pages share **one CSS file** for a consistent style.

```text
clb/
├── index.html
├── thethao.html
├── nghethuat.html
├── style.css
└── images/
```

**Assessment criteria** (each scored 1–5):

- **Structure:** a home page and two linked sub-pages;
- **Content:** on topic and accurate; the home page has an introduction, logo, banner, slogan; sub-pages have articles with pictures;
- **Presentation:** a sound, attractive layout; good pictures and video that fit and **do not break copyright** (cite sources when needed).""",
    ),
    T(
        """### 2. Nhiệm vụ 1: tạo tệp CSS

Phân tích bố cục thành các **khối**. Mỗi khối là một thẻ `<div>` trong HTML; cách trang trí của từng loại khối viết trong CSS.

- Khối có định dạng giống nhau (ví dụ ba ô slogan) dùng **chung một `class`** (ví dụ `block_3`). Nếu một khối có đặc điểm riêng, dùng `id` cho khối đó.
- Mặc định các `div` xếp **từ trên xuống dưới**. Muốn xếp **theo hàng ngang**, đặt các khối nhỏ trong một `div` lớn (lớp `row`) và cho mỗi khối một chiều rộng sao cho **tổng không vượt 100%**, ví dụ 3 ô × 32%. Để khối vừa nằm cùng hàng vừa đặt được chiều rộng, dùng `display: inline-block`.
- Banner: nền màu, chữ to, màu nổi bật. Phần đầu trang gồm banner và slogan; phần giữa là nội dung chính chia hai cột bằng nhau; cuối trang là chân trang chứa liên kết.
- Lưu tệp với tên `style.css`.

Hãy chạy mô phỏng để xem từng khối của trang được dựng và tô màu.""",
        """### 2. Task 1: create the CSS file

Break the layout into **blocks**. Each block is a `<div>` in the HTML; how each kind of block looks is written in CSS.

- Blocks with the same format (for example the three slogan cells) share **one `class`** (e.g. `block_3`). If one block has special features, give it an `id`.
- By default `div` elements stack **from top to bottom**. To place them **in a row**, put the small blocks in a larger `div` (class `row`) and give each a width so that the **total does not exceed 100%**, e.g. 3 cells × 32%. For a block that sits in the row yet accepts a width, use `display: inline-block`.
- Banner: coloured background, large, bright text. The header holds the banner and the slogan; the middle is the main content in two equal columns; the bottom is the footer with links.
- Save the file as `style.css`.

Run the simulation to watch each block of the page being built and coloured.""",
    ),
    web_block(
        sim("Bố cục trang chủ: banner, slogan, nội dung, chân trang", "Home page layout: banner, slogan, content, footer", "Mỗi dòng HTML là một khối div; các quy tắc CSS tô màu, đặt chiều rộng 32% và 48% để xếp thành hàng ngang.", "Each HTML line is a div block; the CSS rules colour them and set 32% and 48% widths to form rows."),
        PAGE,
        CSS_BLUE,
        640,
    ),
    T(
        """### 3. Nhiệm vụ 2: tạo các tệp HTML

- Viết các thẻ `div` lần lượt **từ trên xuống dưới, từ trái sang phải** theo bố cục. Nên viết các khối lớn trước (đầu trang, nội dung chính, cuối trang) rồi thêm chi tiết vào từng khối.
- Mỗi trang nối với tệp CSS bằng một dòng trong phần `<head>`:

```html
<head>
  <meta charset="UTF-8">
  <title>Câu lạc bộ ngoại khoá</title>
  <link href="style.css" rel="stylesheet">
</head>
<body>
  <div class="banner">CÂU LẠC BỘ NGOẠI KHOÁ</div>
  ...
</body>
```

- Làm tương tự cho `index.html`, `thethao.html`, `nghethuat.html`; tạo liên kết từ trang chủ tới hai trang còn lại và đặt liên kết tới các trang khác ở cuối trang.
- Khi chưa có CSS, tệp HTML hiển thị từ trên xuống, chưa có màu; thêm CSS thì trang mới đúng thiết kế.

**Thay đổi thiết kế:** nếu giữ nguyên bố cục, chỉ **sửa `style.css`** (phông, màu, ảnh) còn các tệp HTML giữ nguyên, nhờ vậy cả website đổi diện mạo cùng lúc, ví dụ đổi sang tông đỏ – xanh dịp Tết hoặc Giáng sinh.""",
        """### 3. Task 2: create the HTML files

- Write the `div` tags **top to bottom and left to right** following the layout. Write the large blocks first (header, main content, footer) and add details to each afterwards.
- Link each page to the CSS file with one line in `<head>`:

```html
<head>
  <meta charset="UTF-8">
  <title>Extracurricular clubs</title>
  <link href="style.css" rel="stylesheet">
</head>
<body>
  <div class="banner">EXTRACURRICULAR CLUBS</div>
  ...
</body>
```

- Do the same for `index.html`, `thethao.html`, `nghethuat.html`; link the home page to the other two and put links to the other pages at the bottom.
- Without CSS the HTML file shows top to bottom with no colours; adding CSS gives the intended design.

**Changing the design:** if the layout stays, just **edit `style.css`** (fonts, colours, pictures) and leave the HTML files unchanged, so the whole website changes look at once, for example red and green tones for Tet or Christmas.""",
    ),
    web_block(
        sim("Cùng một HTML, đổi diện mạo chỉ bằng CSS", "Same HTML, new look with CSS only", "Mã HTML giữ nguyên như trang trước; chỉ các giá trị màu trong CSS đổi sang tông đỏ – xanh lá. Bấm Thử sửa để tự chọn màu.", "The HTML is identical to the previous page; only the colour values in the CSS change to red and green. Press Try editing to pick your own colours."),
        PAGE,
        CSS_RED,
        640,
    ),
    T(
        """### 4. Luyện tập: trang đăng kí và hiệu ứng di chuột

1. **Trang đăng kí:** sao chép `index.html` thành `dang_ki.html`, thay phần nội dung chính (`<div class="content">`) bằng biểu mẫu đăng kí (Bài 12) và thêm liên kết tới `dang_ki.html` ở cuối **tất cả** các trang.
2. **Hiệu ứng di chuột:** thêm vào `style.css` quy tắc dùng lớp giả `:hover` cho lớp tương ứng, ví dụ khi di chuột qua slogan thì chữ đổi sang xanh lam:

```css
.block_3:hover {
  color: blue;
}
```

Vì mọi trang dùng chung `style.css` nên chỉ cần thêm một lần.""",
        """### 4. Practice: a sign-up page and a hover effect

1. **Sign-up page:** copy `index.html` to `dang_ki.html`, replace the main content (`<div class="content">`) with a sign-up form (Lesson 12) and add a link to `dang_ki.html` at the bottom of **all** pages.
2. **Hover effect:** add a rule with the `:hover` pseudo-class to `style.css` for the right class, for example turning the slogan text blue on mouse-over:

```css
.block_3:hover {
  color: blue;
}
```

Because every page shares `style.css`, you add it only once.""",
    ),
    web_block(
        sim("Trang đăng kí với biểu mẫu và slogan đổi màu khi di chuột", "A sign-up page with a form and a slogan that recolours on hover", "Biểu mẫu nằm trong khối content; sau khi chạy hết, rê chuột qua slogan để thấy chữ đổi màu.", "The form sits in the content block; when the run ends, hover the slogan to see the text recolour."),
        """<div class="banner">ĐĂNG KÍ THAM GIA CÂU LẠC BỘ</div>
<div class="slogan">
  <div class="row">
    <div class="block_3">Khoẻ để học tốt</div>
    <div class="block_3">Sáng tạo mỗi ngày</div>
    <div class="block_3">Cùng nhau tiến bộ</div>
  </div>
</div>
<div class="content">
  <form>
    <p><label for="hoten">Họ và tên:</label>
    <input type="text" id="hoten" name="ho_ten"></p>
    <p>Câu lạc bộ:
    <input type="radio" id="tt" name="clb" value="the_thao"><label for="tt">Thể thao</label>
    <input type="radio" id="nt" name="clb" value="nghe_thuat"><label for="nt">Nghệ thuật</label></p>
    <p><input type="button" value="Đăng kí"></p>
  </form>
</div>""",
        """.banner {
  background-color: #1e4d8c;
  color: white;
  font-size: 24px;
  text-align: center;
  padding: 22px 10px;
}
.slogan {
  background-color: #fff3c4;
  padding: 10px 0;
}
.row {
  width: 100%;
}
.block_3 {
  display: inline-block;
  width: 32%;
  text-align: center;
  font-weight: bold;
  color: #7a4b00;
}
.block_3:hover {
  color: blue;
}
.content {
  padding: 10px;
}""",
        460,
    ),
    T(
        """### Tóm tắt và tự kiểm tra

| Nội dung | Ghi nhớ |
|---|---|
| Quy trình | mục tiêu → bố cục → xây trang → kiểm tra, tinh chỉnh → quản lí, cập nhật |
| Cấu trúc tối thiểu | trang chủ + hai trang con, có liên kết |
| Khối | mỗi khối là một `div`; khối giống nhau dùng chung `class`, khối riêng dùng `id` |
| Hàng ngang | `div` lớn (`row`) chứa các khối con, tổng chiều rộng ≤ 100% |
| Dùng chung CSS | `<link href="style.css" rel="stylesheet">` trong `<head>` mỗi trang |
| Đổi diện mạo | sửa `style.css`, giữ nguyên HTML |
| Hình ảnh, video | chất lượng tốt, không vi phạm bản quyền |

**Tự kiểm tra:** một hàng có 4 khối, mỗi khối rộng 30%. Tổng chiều rộng là bao nhiêu và có vừa một hàng không? (đáp án: 120%, vượt 100% nên có khối bị đẩy xuống hàng dưới).""",
        """### Summary and self-check

| Topic | Remember |
|---|---|
| Workflow | goals → layout → build pages → test and refine → manage and update |
| Minimum structure | home page + two sub-pages, linked |
| Blocks | each block is a `div`; similar blocks share a `class`, a special one uses an `id` |
| Row | a large `div` (`row`) holds the child blocks, total width ≤ 100% |
| Shared CSS | `<link href="style.css" rel="stylesheet">` in each page's `<head>` |
| Changing the look | edit `style.css`, keep the HTML |
| Pictures, video | good quality, no copyright violations |

**Self-check:** a row has 4 blocks, each 30% wide. What is the total width and does it fit in one row? (answer: 120%, over 100% so one block drops to the next row).""",
    ),
]

questions = [
    mc("tin12-b18-mc-01", 1, "Để mọi trang HTML của website có cùng phong cách trình bày, em nên làm gì?", "To give every HTML page of a website the same style, what should you do?",
       "Viết một tệp CSS dùng chung và đặt thẻ link trỏ tới tệp đó trong phần head của từng trang.", "Write one shared CSS file and put a link tag pointing to it in the head of each page.", "C",
       ("Viết CSS riêng hoàn toàn khác nhau cho mỗi trang", "Write entirely different CSS for each page"), ("Chỉ định dạng trang chủ, các trang còn lại để mặc định", "Format only the home page and leave the rest default"), ("Viết một tệp CSS và liên kết tới tệp đó trong mỗi trang", "Write one CSS file and link it in every page"), ("Dùng thuộc tính style trong từng thẻ", "Use the style attribute in every tag")),
    mc("tin12-b18-mc-02", 1, "Dòng nào trong phần head nối tệp HTML với tệp style.css?", "Which line in head connects the HTML file to style.css?",
       "Thẻ link với rel=\"stylesheet\" và href trỏ tới tệp CSS dùng để nối.", "A link tag with rel=\"stylesheet\" and an href to the CSS file makes the connection.", "A",
       ("<link href=\"style.css\" rel=\"stylesheet\">", "<link href=\"style.css\" rel=\"stylesheet\">"), ("<a href=\"style.css\">CSS</a>", "<a href=\"style.css\">CSS</a>"), ("<img src=\"style.css\">", "<img src=\"style.css\">"), ("<style src=\"style.css\"></style>", "<style src=\"style.css\"></style>")),
    mc("tin12-b18-mc-03", 1, "Cấu trúc tối thiểu của website câu lạc bộ trong dự án gồm những gì?", "What does the minimum structure of the club website in the project include?",
       "Cấu trúc tối thiểu gồm một trang chủ và hai trang con giới thiệu hai câu lạc bộ, có liên kết với nhau.", "The minimum is one home page and two sub-pages introducing two clubs, linked together.", "D",
       ("Chỉ một trang chủ", "Only a home page"), ("Hai trang con, không cần trang chủ", "Two sub-pages with no home page"), ("Một trang chủ và năm trang con", "A home page and five sub-pages"), ("Một trang chủ và hai trang con có liên kết với nhau", "A home page and two linked sub-pages")),
    mc("tin12-b18-mc-04", 1, "Mặc định, các thẻ div trong trang được xếp như thế nào?", "By default, how are div elements arranged on a page?",
       "Các div là khối nên xếp lần lượt từ trên xuống dưới theo phương thẳng đứng.", "div elements are blocks, so they stack from top to bottom vertically.", "B",
       ("Từ trái sang phải trên một hàng", "Left to right in one row"), ("Từ trên xuống dưới theo phương thẳng đứng", "Top to bottom, vertically"), ("Chồng lên nhau tại một vị trí", "Piled on top of each other in one spot"), ("Ngẫu nhiên", "At random")),
    mc("tin12-b18-mc-05", 2, "Muốn ba ô slogan nằm trên cùng một hàng ngang, em cần làm gì?", "To place the three slogan cells in one horizontal row, what must you do?",
       "Đặt các ô trong một div lớn (row) và đặt chiều rộng cho mỗi ô để tổng không quá 100%.", "Put the cells in a larger div (row) and give each a width so the total does not exceed 100%.", "A",
       ("Đặt chúng trong một div lớn và chia chiều rộng sao cho tổng không quá 100%", "Put them in a larger div and set widths totalling no more than 100%"), ("Đặt mỗi ô một id giống nhau", "Give each cell the same id"), ("Đặt display: none cho các ô", "Set display: none on the cells"), ("Xoá thẻ div bao quanh", "Delete the surrounding div")),
    mc("tin12-b18-mc-06", 2, "Nhiều khối có cùng định dạng (ví dụ bốn khối màu vàng) nên được khai báo thế nào?", "How should several blocks with the same format (e.g. four yellow blocks) be declared?",
       "Các khối tương đồng khai báo cùng một class và viết định nghĩa class đó một lần trong tệp CSS.", "Similar blocks share one class, whose definition is written once in the CSS file.", "C",
       ("Mỗi khối một id khác nhau", "A different id for each block"), ("Mỗi khối một tệp CSS", "A CSS file for each block"), ("Cùng một class", "The same class"), ("Dùng thuộc tính style lặp lại", "Repeat the style attribute")),
    mc("tin12-b18-mc-07", 2, "Khi một khối có thêm đặc điểm riêng so với các khối tương đồng, em dùng gì để định dạng riêng khối đó?", "When one block has extra features unlike similar blocks, what do you use to style it alone?",
       "Mã định danh id duy nhất cho phần tử riêng biệt giúp định dạng riêng khối đó.", "A unique id for the single element lets you style that block on its own.", "B",
       ("Thêm một thẻ br", "Add a br tag"), ("Mã định danh id", "An id"), ("Thẻ title", "A title tag"), ("Thẻ hr", "An hr tag")),
    mc("tin12-b18-mc-08", 2, "Thứ tự đúng các bước tạo một website là gì?", "What is the correct order of the steps for building a website?",
       "Xác định mục tiêu, thiết kế bố cục, xây các trang, tổng hợp kiểm tra, rồi quản lí và cập nhật.", "Set goals, design the layout, build pages, put together and test, then manage and update.", "D",
       ("Thiết kế bố cục, xác định mục tiêu, kiểm tra, xây trang, cập nhật", "Design layout, set goals, test, build pages, update"), ("Xây trang, kiểm tra, xác định mục tiêu, thiết kế bố cục, cập nhật", "Build pages, test, set goals, design layout, update"), ("Cập nhật, kiểm tra, xây trang, thiết kế bố cục, xác định mục tiêu", "Update, test, build pages, design layout, set goals"), ("Xác định mục tiêu, thiết kế bố cục, xây trang, kiểm tra, quản lí cập nhật", "Set goals, design layout, build pages, test, manage and update")),
    mc("tin12-b18-mc-09", 2, "Muốn đổi màu chữ và phông chữ cho cả website mà giữ nguyên bố cục, em nên làm gì?", "To change the text colour and font of the whole website while keeping the layout, what should you do?",
       "Chỉ cần sửa giá trị trong tệp style.css và giữ nguyên các tệp HTML; mọi trang cùng đổi.", "Just edit values in style.css and keep the HTML files; every page changes together.", "C",
       ("Viết lại tất cả các tệp HTML", "Rewrite all the HTML files"), ("Thêm thẻ font vào từng trang", "Add a font tag to each page"), ("Sửa tệp style.css, giữ nguyên các tệp HTML", "Edit style.css and keep the HTML files"), ("Xoá thẻ link ở mỗi trang", "Delete the link tag on every page")),
    mc("tin12-b18-mc-10", 2, "Mẫu CSS nào làm chữ trong các khối lớp block_3 đổi sang màu xanh lam khi di chuột qua?", "Which CSS rule turns the text in block_3 blocks blue when the mouse passes over?",
       "Lớp giả :hover gắn sau bộ chọn lớp .block_3 và đặt color: blue.", "The :hover pseudo-class after the class selector .block_3 with color: blue.", "A",
       (".block_3:hover {color: blue;}", ".block_3:hover {color: blue;}"), ("block_3.hover {color: blue;}", "block_3.hover {color: blue;}"), ("#block_3::hover {color: blue;}", "#block_3::hover {color: blue;}"), (".block_3 {hover: blue;}", ".block_3 {hover: blue;}")),
    mc("tin12-b18-mc-11", 2, "Khi chọn hình ảnh và video cho website, em cần đặc biệt lưu ý điều gì?", "When picking pictures and videos for the website, what must you especially note?",
       "Hình ảnh và video cần chất lượng tốt, phù hợp nội dung và không vi phạm bản quyền, trích dẫn nguồn nếu cần.", "Pictures and videos must be good, fit the content and not break copyright, citing sources when needed.", "B",
       ("Chọn ảnh có dung lượng lớn nhất", "Pick the largest files"), ("Không vi phạm bản quyền và có trích dẫn nguồn khi cần", "Respect copyright and cite sources when needed"), ("Chỉ dùng ảnh tải từ mạng, không cần ghi nguồn", "Use only pictures from the Internet with no credit"), ("Dùng càng nhiều ảnh càng tốt", "Use as many pictures as possible")),
    mc("tin12-b18-mc-12", 3, "Một hàng có 4 khối, mỗi khối đặt width: 30%. Kết quả là gì?", "A row has 4 blocks, each with width: 30%. What happens?",
       "Tổng là 4 × 30% = 120% vượt 100% nên không đủ chỗ cho cả bốn khối trên một hàng, một khối bị đẩy xuống dưới.", "The total is 4 × 30% = 120%, over 100%, so the four blocks do not fit in one row and one drops down.", "D",
       ("Tổng 90%, vừa một hàng", "Total 90%, fits in a row"), ("Tổng 100%, vừa một hàng", "Total 100%, fits in a row"), ("Tổng 120%, vẫn vừa một hàng", "Total 120%, still fits in a row"), ("Tổng 120%, vượt 100% nên có khối xuống hàng dưới", "Total 120%, over 100%, so a block drops to the next row")),
]

truefalse = [
    tf("tin12-b18-tf-01", 2, "Xét cấu trúc và việc dùng chung CSS.", "Consider structure and shared CSS.",
       "Website đơn giản có trang chủ và trang con; các trang dùng chung một tệp CSS; chưa có CSS thì HTML hiển thị từ trên xuống, chưa có màu.", "A simple site has a home page and sub-pages; pages share one CSS file; without CSS the HTML shows top to bottom without colours.",
       ("Website ở mức đơn giản gồm một trang chủ và các trang thành viên.", "A simple website has a home page and member pages.", True),
       ("Các trang nên dùng chung một tệp CSS để có phong cách thống nhất.", "The pages should share one CSS file for a consistent style.", True),
       ("Mỗi trang bắt buộc phải có một tệp CSS hoàn toàn khác nhau.", "Each page must have its own completely different CSS file.", False),
       ("Khi chưa có CSS, tệp HTML hiển thị từ trên xuống dưới và chưa có màu trang trí.", "Without CSS the HTML file shows top to bottom with no decorative colours.", True)),
    tf("tin12-b18-tf-02", 2, "Xét khối div, class và id.", "Consider div blocks, class and id.",
       "Mỗi khối là một div; khối giống nhau dùng chung class; id không được trùng; tổng chiều rộng các khối cùng hàng không nên vượt 100%.", "Each block is a div; similar blocks share a class; ids must not repeat; the widths of blocks in one row should not total more than 100%.",
       ("Mỗi khối trong bố cục được tạo bởi một cặp thẻ div.", "Each block in the layout is made by a div pair.", True),
       ("Các khối có nội dung tương đồng khai báo cùng một class.", "Blocks with similar content share one class.", True),
       ("Nhiều khối có thể dùng chung cùng một id.", "Several blocks may share the same id.", False),
       ("Tổng chiều rộng các khối trên cùng một hàng không nên vượt quá 100%.", "The widths of blocks in one row should not total more than 100%.", True)),
    tf("tin12-b18-tf-03", 2, "Xét việc mở rộng và thay đổi website.", "Consider extending and changing the website.",
       "Trang chủ liên kết tới trang con; thêm trang đăng kí cần liên kết ở cuối các trang; :hover đổi màu khi di chuột; đổi diện mạo chỉ cần sửa CSS.", "The home page links to sub-pages; a sign-up page needs links at the bottom of the pages; :hover changes colour on mouse-over; a new look only needs CSS edits.",
       ("Trang chủ cần có liên kết tới các trang con.", "The home page needs links to the sub-pages.", True),
       ("Thêm trang dang_ki.html thì cần đặt liên kết tới nó ở cuối các trang.", "Adding dang_ki.html means placing links to it at the bottom of the pages.", True),
       ("Lớp giả :hover cho phép đổi màu chữ khi di chuột qua một vùng.", "The :hover pseudo-class lets text change colour when the mouse passes over an area.", True),
       ("Muốn đổi diện mạo cả website phải viết lại tất cả các tệp HTML.", "To change the look of the whole website, all HTML files must be rewritten.", False)),
    tf("tin12-b18-tf-04", 2, "Xét tiêu chí đánh giá sản phẩm.", "Consider the assessment criteria.",
       "Tiêu chí gồm cấu trúc, nội dung, hình thức, chấm thang 1–5; ảnh không vi phạm bản quyền; bố cục cũng được đánh giá.", "The criteria are structure, content and presentation, scored 1–5; pictures must not break copyright; layout is also assessed.",
       ("Sản phẩm được đánh giá theo cấu trúc, nội dung và hình thức.", "The product is assessed on structure, content and presentation.", True),
       ("Mỗi tiêu chí được chấm theo thang điểm từ 1 đến 5.", "Each criterion is scored on a scale of 1 to 5.", True),
       ("Chỉ cần nội dung đúng, không cần quan tâm bố cục.", "Only correct content matters; layout does not.", False),
       ("Hình ảnh và video không được vi phạm bản quyền.", "Pictures and videos must not violate copyright.", True)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
