# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_10_tin12.py
from generate_tin_common import T, build, configure, mc, tf, web_block

configure(12, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers", "Tin học ứng dụng")

slug = "tao-lien-ket-bai-10-tin12"
title_vi = "Bài 10. Tạo liên kết"
title_en = "Lesson 10. Creating links"

# A small orange "sun" picture, inline so the preview needs no file.
SUN = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Ccircle cx='40' cy='40' r='28' fill='orange'/%3E%3C/svg%3E"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


blocks = [
    T(
        """### Mục tiêu bài học

Sau bài này, bạn có thể:

- giải thích **siêu văn bản**, **siêu liên kết**, đường dẫn **tuyệt đối** và **tương đối**;
- tạo liên kết ngoài tới trang web khác bằng thẻ `<a>` và thuộc tính `href`;
- tạo liên kết trong: tới trang cùng thư mục, thư mục khác, thư mục mức trên (`../`) và vị trí khác trong cùng trang (`id`);
- tạo liên kết từ hình ảnh.""",
        """### Learning goals

After this lesson, you can:

- explain **hypertext**, **hyperlinks**, **absolute** and **relative** paths;
- create an external link to another website with the `<a>` tag and the `href` attribute;
- create internal links: to a page in the same folder, in another folder, in a parent folder (`../`) and to another place on the same page (`id`);
- turn a picture into a link.""",
    ),
    T(
        """### 1. Siêu văn bản và đường dẫn

- **Siêu văn bản** (hypertext) là văn bản không chỉ có chữ mà còn có thể chứa âm thanh, hình ảnh,... và đặc biệt là các **siêu liên kết** tới siêu văn bản khác. Người đọc không cần xem tuần tự từ đầu đến cuối mà dùng liên kết để nhảy tới vị trí cần xem.
- **Siêu liên kết** (liên kết) là một tham chiếu tới siêu văn bản khác; nháy chuột vào vị trí đặt liên kết để truy cập.
- Trong HTML, liên kết được tạo bằng thẻ **`<a>`**, địa chỉ đích đặt trong thuộc tính **`href`**.

Có hai loại đường dẫn:

| Loại | Đặc điểm | Ví dụ |
|---|---|---|
| **Tuyệt đối** | đầy đủ giao thức và tên miền | `https://www.nxbgd.vn/` |
| **Tương đối** | không có giao thức hay tên miền, tính từ vị trí tệp hiện tại | `thong_tin.html`, `bai_tap/bai_tap_1.html` |""",
        """### 1. Hypertext and paths

- **Hypertext** is text that holds not only words but also sound, pictures,... and, above all, **hyperlinks** to other hypertext. Readers need not go from start to end; they jump to what they want through links.
- A **hyperlink** (link) is a reference to other hypertext; click where the link sits to reach it.
- In HTML a link is made with the **`<a>`** tag, and the target address goes in the **`href`** attribute.

There are two kinds of paths:

| Kind | Feature | Example |
|---|---|---|
| **Absolute** | full protocol and domain | `https://www.nxbgd.vn/` |
| **Relative** | no protocol or domain, counted from the current file's location | `thong_tin.html`, `bai_tap/bai_tap_1.html` |""",
    ),
    T(
        """### 2a. Liên kết ngoài

Liên kết từ trang web này tới một trang web khác trên Internet gọi là **liên kết ngoài**. Dùng thẻ `<a>` và đặt **đường dẫn tuyệt đối** vào `href`:

```html
<a href="https://www.nxbgd.vn/">Nhà xuất bản Giáo dục Việt Nam</a>
```

Nội dung giữa `<a>` và `</a>` là phần người dùng thấy và nháy vào (thường hiện màu xanh, có gạch chân).""",
        """### 2a. External links

A link from one website to another website on the Internet is an **external link**. Use the `<a>` tag and put an **absolute path** in `href`:

```html
<a href="https://www.nxbgd.vn/">Vietnam Education Publishing House</a>
```

The content between `<a>` and `</a>` is what users see and click (usually blue and underlined).""",
    ),
    web_block(
        sim("Liên kết ngoài", "External links", "Mỗi thẻ a có href là một đường dẫn tuyệt đối đầy đủ giao thức.", "Each a tag has an absolute path with a full protocol in href."),
        """<h3>Trang web hữu ích</h3>
<p>Sách điện tử: <a href="https://www.nxbgd.vn/">Nhà xuất bản Giáo dục Việt Nam</a></p>
<p>Tìm kiếm: <a href="https://www.google.com/">Google</a></p>
<p>Tin tức: <a href="https://vnexpress.net/">VnExpress</a></p>""",
        "",
        280,
    ),
    T(
        """### 2b. Liên kết trong – giữa các trang của cùng website

**Liên kết trong** là liên kết tới vị trí khác trong cùng website. Dùng thẻ `<a>` với **đường dẫn tương đối** (không có `http://` hay `https://`, trình duyệt tìm tệp trên máy chủ hiện tại). Xét website có cấu trúc:

```text
web/
├── index.html
├── thong_tin.html
├── anh/
│   └── mat_troi.png
└── bai_tap/
    ├── bai_tap_1.html
    └── on_tap/
        └── bai_tap_on_tap.html
```

Các trường hợp, viết trong `index.html` (ba dòng đầu) và trong tệp sâu hơn (hai dòng cuối):

| Trường hợp | Mã |
|---|---|
| Cùng thư mục | `<a href="thong_tin.html">Thông tin</a>` |
| Thư mục con, dưới 1 cấp | `<a href="bai_tap/bai_tap_1.html">Bài tập 1</a>` |
| Dưới 2 cấp: các thư mục từ trên xuống, ngăn bởi `/` | `<a href="bai_tap/on_tap/bai_tap_on_tap.html">Ôn tập</a>` |
| Về thư mục mẹ 1 mức: dùng `../` (trong `bai_tap_1.html`) | `<a href="../index.html">Trang chủ</a>` |
| Về 2 mức: lặp `../` (trong `bai_tap_on_tap.html`) | `<a href="../../index.html">Trang chủ</a>` |

Mỗi cụm `../` nghĩa là *quay trở lại thư mục trên một mức*.""",
        """### 2b. Internal links – between pages of one website

An **internal link** points elsewhere in the same website. Use `<a>` with a **relative path** (no `http://` or `https://`; the browser looks for the file on the current server). Take a website with this structure:

```text
web/
├── index.html
├── thong_tin.html
├── anh/
│   └── mat_troi.png
└── bai_tap/
    ├── bai_tap_1.html
    └── on_tap/
        └── bai_tap_on_tap.html
```

The cases, written in `index.html` (first three) and in deeper files (last two):

| Case | Code |
|---|---|
| Same folder | `<a href="thong_tin.html">Info</a>` |
| Sub-folder, 1 level down | `<a href="bai_tap/bai_tap_1.html">Exercise 1</a>` |
| 2 levels down: folder names from top to bottom, split by `/` | `<a href="bai_tap/on_tap/bai_tap_on_tap.html">Revision</a>` |
| Up 1 level: use `../` (inside `bai_tap_1.html`) | `<a href="../index.html">Home</a>` |
| Up 2 levels: repeat `../` (inside `bai_tap_on_tap.html`) | `<a href="../../index.html">Home</a>` |

Each `../` means *go back up one folder*.""",
    ),
    web_block(
        sim("Danh sách liên kết trong", "A list of internal links", "Ba mục danh sách, mỗi mục là một liên kết tới tệp tương ứng bằng đường dẫn tương đối.", "Three list items, each a link to its file by a relative path."),
        """<h3>Menu của trang chủ (index.html)</h3>
<ul>
  <li><a href="bai_tap/bai_tap_1.html">Bài tập 1</a></li>
  <li><a href="bai_tap/bai_tap_2.html">Bài tập 2</a></li>
  <li><a href="bai_tap/bai_tap_on_tap.html">Ôn tập</a></li>
</ul>""",
        "",
        260,
    ),
    T(
        """### 2c. Liên kết tới vị trí trong cùng trang

Hai bước:

1. Đặt thuộc tính **`id`** vào phần tử tại vị trí cần tới. `id` phải **duy nhất** trong toàn trang (gọi là mã định danh đoạn).
2. Tạo liên kết `href="#mã_định_danh"`.

```html
<a href="#Thong_tin">Xem thông tin</a>
...
<h2 id="Thong_tin">Thông tin</h2>
```

### 2d. Liên kết từ hình ảnh

Thẻ `<img src="đường_dẫn_ảnh" alt="mô tả">` hiển thị ảnh; đường dẫn ảnh cũng có thể tuyệt đối hoặc tương đối. Đặt `<img>` **bên trong** thẻ `<a>` thì ảnh trở thành liên kết:

```html
<a href="thong_tin.html"><img src="anh/mat_troi.png" alt="Mặt Trời"></a>
```""",
        """### 2c. Links to a place on the same page

Two steps:

1. Give the element at the target place an **`id`** attribute. The `id` must be **unique** on the whole page (the anchor name).
2. Create a link with `href="#anchor_name"`.

```html
<a href="#Thong_tin">See the info</a>
...
<h2 id="Thong_tin">Information</h2>
```

### 2d. Links from pictures

`<img src="image_path" alt="description">` shows a picture; the image path may also be absolute or relative. Put `<img>` **inside** an `<a>` tag and the picture becomes a link:

```html
<a href="thong_tin.html"><img src="anh/mat_troi.png" alt="Sun"></a>
```""",
    ),
    web_block(
        sim("Liên kết nhảy tới vị trí trong cùng trang", "Jump links inside one page", "Mỗi liên kết # trỏ tới phần tử có id trùng tên; thử bấm sau khi chạy hết.", "Each # link points to the element with the same id; try clicking after the run ends."),
        """<p><a href="#mot">Phần 1</a> | <a href="#hai">Phần 2</a> | <a href="#ba">Phần 3</a></p>
<h3 id="mot">Phần 1. Thẻ</h3>
<p>Thẻ nằm trong cặp dấu &lt; và &gt;.</p>
<h3 id="hai">Phần 2. Thuộc tính</h3>
<p>Thuộc tính đặt trong thẻ bắt đầu.</p>
<h3 id="ba">Phần 3. Liên kết</h3>
<p>Thẻ a và thuộc tính href tạo liên kết.</p>""",
        "",
        360,
    ),
    web_block(
        sim("Hình ảnh làm liên kết", "A picture as a link", "Thẻ img nằm trong thẻ a nên bấm vào ảnh sẽ đi tới thong_tin.html.", "img sits inside a, so clicking the picture goes to thong_tin.html."),
        f"""<h3>Hệ Mặt Trời</h3>
<a href="thong_tin.html"><img src="{SUN}" alt="Mặt Trời"></a>
<p>Bấm vào ảnh để xem trang <a href="thong_tin.html">thong_tin.html</a>.</p>""",
        "",
        300,
    ),
    T(
        """### Tóm tắt và tự kiểm tra

| Nội dung | Ghi nhớ |
|---|---|
| Siêu văn bản | chứa nhiều loại dữ liệu và siêu liên kết |
| Thẻ liên kết | `<a href="…">nội dung</a>` |
| Liên kết ngoài | đường dẫn **tuyệt đối** (có `https://`) |
| Liên kết trong | đường dẫn **tương đối** |
| Cùng thư mục | `tên_tệp.html` |
| Thư mục con | `thư_mục/tên_tệp.html` |
| Thư mục mẹ | `../tên_tệp.html` |
| Trong cùng trang | phần tử có `id`, liên kết `href="#id"` |
| Ảnh làm liên kết | `<a href="…"><img src="…"></a>` |

**Tự kiểm tra:** từ `bai_tap/bai_tap_1.html` muốn về `index.html` ở thư mục mẹ, viết `href` thế nào? (đáp án: `../index.html`).""",
        """### Summary and self-check

| Topic | Remember |
|---|---|
| Hypertext | holds many kinds of data and hyperlinks |
| Link tag | `<a href="…">content</a>` |
| External link | **absolute** path (with `https://`) |
| Internal link | **relative** path |
| Same folder | `file_name.html` |
| Sub-folder | `folder/file_name.html` |
| Parent folder | `../file_name.html` |
| Same page | element with `id`, link `href="#id"` |
| Picture as a link | `<a href="…"><img src="…"></a>` |

**Self-check:** from `bai_tap/bai_tap_1.html`, how do you link back to `index.html` in the parent folder? (answer: `../index.html`).""",
    ),
]

questions = [
    mc("tin12-b10-mc-01", 1, "Siêu văn bản là gì?", "What is hypertext?",
       "Siêu văn bản chứa nhiều dạng dữ liệu và đặc biệt là các siêu liên kết tới siêu văn bản khác.", "Hypertext holds many kinds of data and, above all, hyperlinks to other hypertext.", "A",
       ("Văn bản chứa nhiều loại dữ liệu và các liên kết tới siêu văn bản khác", "Text that holds many kinds of data and links to other hypertext"), ("Văn bản chỉ gồm chữ, không có hình", "Text with words only and no pictures"), ("Văn bản có cỡ chữ rất lớn", "Text with a very large font size"), ("Văn bản được mã hoá để không đọc được", "Text encoded so that it cannot be read")),
    mc("tin12-b10-mc-02", 1, "Trong HTML, thẻ nào dùng để tạo siêu liên kết?", "In HTML, which tag creates a hyperlink?",
       "Liên kết được tạo bằng thẻ a; href là thuộc tính, không phải thẻ.", "A link is made with the a tag; href is an attribute, not a tag.", "D",
       ("<link>", "<link>"), ("<href>", "<href>"), ("<url>", "<url>"), ("<a>", "<a>")),
    mc("tin12-b10-mc-03", 1, "Thuộc tính nào của thẻ <a> chứa đường dẫn tới địa chỉ đích?", "Which attribute of <a> holds the path to the target?",
       "Thuộc tính href cung cấp đường dẫn tuyệt đối hoặc tương đối tới đích.", "The href attribute provides the absolute or relative path to the target.", "B",
       ("src", "src"), ("href", "href"), ("id", "id"), ("name", "name")),
    mc("tin12-b10-mc-04", 1, "Liên kết từ một trang web tới một trang web khác trên Internet được gọi là gì?", "What is a link from one web page to another on the Internet called?",
       "Liên kết tới trang web khác trên Internet là liên kết ngoài và dùng đường dẫn tuyệt đối.", "A link to another website on the Internet is an external link and uses an absolute path.", "C",
       ("Liên kết trong", "Internal link"), ("Liên kết nội tuyến", "Inline link"), ("Liên kết ngoài", "External link"), ("Liên kết cục bộ", "Local link")),
    mc("tin12-b10-mc-05", 2, "Đoạn mã nào tạo liên kết tới trang https://www.google.com/?", "Which code creates a link to https://www.google.com/?",
       "Phải dùng thẻ a với thuộc tính href; url, link, domain không phải thuộc tính của thẻ a.", "Use the a tag with the href attribute; url, link and domain are not attributes of a.", "A",
       ("<a href=\"https://www.google.com/\">Google</a>", "<a href=\"https://www.google.com/\">Google</a>"), ("<a url=\"https://www.google.com/\">Google</a>", "<a url=\"https://www.google.com/\">Google</a>"), ("<a link=\"https://www.google.com/\">Google</a>", "<a link=\"https://www.google.com/\">Google</a>"), ("<a domain=\"https://www.google.com/\">Google</a>", "<a domain=\"https://www.google.com/\">Google</a>")),
    mc("tin12-b10-mc-06", 2, "Từ trang homepage.html liên kết tới product.html nằm trong thư mục project, ta viết thế nào?", "From homepage.html, how do you link to product.html inside the folder project?",
       "Thư mục con dưới một cấp: viết tên thư mục, dấu / rồi tên tệp, trong thẻ a với href.", "A folder one level down: write the folder name, a slash, then the file name, in an a tag with href.", "C",
       ("<a href=\"project/homepage.html\">Product List</a>", "<a href=\"project/homepage.html\">Product List</a>"), ("<a url=\"project/product\">Product List</a>", "<a url=\"project/product\">Product List</a>"), ("<a href=\"project/product.html\">Product List</a>", "<a href=\"project/product.html\">Product List</a>"), ("<a link=\"project/product.html\">Product List</a>", "<a link=\"project/product.html\">Product List</a>")),
    mc("tin12-b10-mc-07", 2, "Để liên kết tới một vị trí cụ thể trong cùng trang, tại vị trí đó cần có phần tử với thuộc tính nào?", "To link to a specific place on the same page, which attribute must the element at that place have?",
       "Phần tử đích cần có thuộc tính id duy nhất để liên kết href=\"#id\" trỏ tới.", "The target element needs a unique id so that href=\"#id\" can point to it.", "B",
       ("src", "src"), ("id", "id"), ("target", "target"), ("class", "class")),
    mc("tin12-b10-mc-08", 2, "Khi trang liên kết tới nằm ở thư mục mức trên, đường dẫn dùng kí tự nào để quay lại một mức?", "When the target is in a parent folder, which characters go back one level in the path?",
       "Cụm ../ chỉ định quay trở lại thư mục trên một mức.", "The ../ sequence means go back up one folder.", "D",
       ("..", ".."), ("./", "./"), ("/..", "/.."), ("../", "../")),
    mc("tin12-b10-mc-09", 2, "Đường dẫn nào sau đây là đường dẫn tuyệt đối?", "Which of these paths is absolute?",
       "Đường dẫn tuyệt đối có đầy đủ giao thức và tên miền, như https://google.com; các đường dẫn còn lại tính từ vị trí tệp.", "An absolute path has a full protocol and domain, like https://google.com; the others count from the file's location.", "C",
       ("html/cach_tao_lien_ket.html", "html/cach_tao_lien_ket.html"), ("../index.html", "../index.html"), ("https://google.com", "https://google.com"), ("bai_tap/bai_tap_1.html", "bai_tap/bai_tap_1.html")),
    mc("tin12-b10-mc-10", 2, "Liên kết href=\"#Thong_tin\" dẫn tới đâu?", "Where does the link href=\"#Thong_tin\" lead?",
       "Dấu # cho biết đích là phần tử có id là Thong_tin trong chính trang đang xem.", "The # shows the target is the element whose id is Thong_tin on the same page.", "B",
       ("Tệp có tên Thong_tin trong cùng thư mục", "A file named Thong_tin in the same folder"), ("Phần tử có id là Thong_tin trong cùng trang", "The element with id Thong_tin on the same page"), ("Trang web có tên miền Thong_tin", "A website with the domain Thong_tin"), ("Thư mục mẹ của trang", "The parent folder of the page")),
    mc("tin12-b10-mc-11", 2, "Trong website có bai_tap/on_tap/bai_tap_on_tap.html và index.html ở thư mục gốc, muốn từ bai_tap_on_tap.html về index.html thì href là gì?", "A site has bai_tap/on_tap/bai_tap_on_tap.html and index.html in the root. From bai_tap_on_tap.html, what is the href to index.html?",
       "Tệp nằm sâu hai cấp nên cần quay lên hai mức: ../../index.html.", "The file is two levels deep, so go up two levels: ../../index.html.", "A",
       ("../../index.html", "../../index.html"), ("../index.html", "../index.html"), ("bai_tap/index.html", "bai_tap/index.html"), ("index.html", "index.html")),
    mc("tin12-b10-mc-12", 3, "Trong các href: a.html, https://x.vn, anh/b.html, ../c.html, http://y.com/z.html, bai_tap/on_tap/d.html, ../../e.html, có bao nhiêu đường dẫn tương đối?", "Among the hrefs a.html, https://x.vn, anh/b.html, ../c.html, http://y.com/z.html, bai_tap/on_tap/d.html, ../../e.html, how many are relative paths?",
       "Hai đường dẫn có http hoặc https là tuyệt đối; còn lại 7 − 2 = 5 đường dẫn là tương đối.", "The two with http or https are absolute; the remaining 7 − 2 = 5 are relative.", "D",
       ("2", "2"), ("3", "3"), ("4", "4"), ("5", "5")),
]

truefalse = [
    tf("tin12-b10-tf-01", 2, "Xét siêu văn bản và đường dẫn.", "Consider hypertext and paths.",
       "Tệp .txt chỉ có chữ nên không phải siêu văn bản; liên kết dùng thẻ a chứ không phải thẻ href; có hai loại đường dẫn.", "A .txt file holds only text so it is not hypertext; links use the a tag, not an href tag; there are two kinds of paths.",
       ("Mọi tệp .txt đều là siêu văn bản.", "Every .txt file is hypertext.", False),
       ("Trong HTML, thẻ <href> được dùng để tạo siêu liên kết.", "In HTML the <href> tag is used to create hyperlinks.", False),
       ("Có hai loại đường dẫn là đường dẫn tuyệt đối và đường dẫn tương đối.", "There are two kinds of path: absolute and relative.", True),
       ("Đường dẫn tương đối không cần giao thức hay tên miền.", "A relative path needs no protocol or domain.", True)),
    tf("tin12-b10-tf-02", 2, "Xét liên kết ngoài và liên kết trong.", "Consider external and internal links.",
       "Liên kết ngoài dùng đường dẫn tuyệt đối có giao thức; liên kết trong dùng đường dẫn tương đối.", "External links use absolute paths with a protocol; internal links use relative paths.",
       ("Liên kết ngoài dùng thẻ <a> với đường dẫn tuyệt đối trong href.", "An external link uses <a> with an absolute path in href.", True),
       ("Liên kết trong dùng đường dẫn tương đối.", "An internal link uses a relative path.", True),
       ("Đường dẫn tuyệt đối không bao gồm http:// hoặc https://.", "An absolute path does not include http:// or https://.", False),
       ("Liên kết ngoài chỉ trỏ được tới trang cùng máy chủ.", "An external link can only point to a page on the same server.", False)),
    tf("tin12-b10-tf-03", 2, "Xét liên kết tới vị trí trong cùng trang và thư mục mẹ.", "Consider links within a page and to a parent folder.",
       "id phải duy nhất; dùng href=\"#id\"; không được trùng id; ../ quay lại thư mục trên một mức.", "id must be unique; use href=\"#id\"; ids must not repeat; ../ goes up one folder.",
       ("Thuộc tính id trong một trang phải có giá trị duy nhất.", "The id attribute must have a unique value within a page.", True),
       ("Liên kết trong cùng trang có dạng href=\"#mã_định_danh\".", "A same-page link has the form href=\"#anchor_name\".", True),
       ("Nhiều phần tử trong cùng trang được đặt chung một id.", "Several elements on a page may share one id.", False),
       ("Cụm ../ trong đường dẫn nghĩa là quay lại thư mục trên một mức.", "../ in a path means go back up one folder.", True)),
    tf("tin12-b10-tf-04", 2, "Xét liên kết từ hình ảnh.", "Consider links made from pictures.",
       "img hiển thị ảnh, src chứa đường dẫn ảnh (tuyệt đối hoặc tương đối), đặt img trong a để thành liên kết.", "img shows a picture, src holds the image path (absolute or relative), and img inside a makes it a link.",
       ("Thẻ <img> dùng để hiển thị hình ảnh trong trang web.", "<img> is used to show a picture on a web page.", True),
       ("Đặt <img> bên trong thẻ <a> thì hình ảnh trở thành liên kết.", "Placing <img> inside <a> makes the picture a link.", True),
       ("Đường dẫn của tệp ảnh chỉ được viết dưới dạng đường dẫn tương đối.", "The image file path can only be written as a relative path.", False),
       ("Thuộc tính src của <img> chứa đường dẫn tới tệp ảnh.", "The src attribute of <img> holds the path to the image file.", True)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
