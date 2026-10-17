# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_16_tin12.py
from generate_tin_common import T, build, configure, mc, tf, web_block

configure(12, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers", "Tin học ứng dụng")

slug = "dinh-dang-khung-bai-16-tin12"
title_vi = "Bài 16. Định dạng khung"
title_en = "Lesson 16. Formatting boxes"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


blocks = [
    T(
        """### Mục tiêu bài học

Sau bài này, bạn có thể:

- phân biệt phần tử **khối** (block) và phần tử **nội tuyến** (inline), đổi loại bằng `display`;
- định dạng **khung** của phần tử: nội dung, vùng đệm (`padding`), viền (`border`), lề (`margin`);
- dùng bộ chọn **lớp** (`.ten`), **định danh** (`#ten`) và **thuộc tính** (`[thuoc_tinh]`) để định dạng riêng cho từng nhóm phần tử.""",
        """### Learning goals

After this lesson, you can:

- tell **block** elements from **inline** elements and switch them with `display`;
- format an element's **box**: content, padding (`padding`), border (`border`), margin (`margin`);
- use **class** (`.name`), **id** (`#name`) and **attribute** (`[attribute]`) selectors to style groups of elements differently.""",
    ),
    T(
        """### 1. Phần tử khối và phần tử nội tuyến

Mặc định, mọi phần tử HTML thuộc một trong hai loại:

| Loại | Đặc điểm | Ví dụ |
|---|---|---|
| **Khối** (block) | bắt đầu từ **đầu hàng**, kéo dài **suốt chiều rộng** trang | `div`, `p`, `h1`–`h6`, `ul`, `li`, `table`, `form` |
| **Nội tuyến** (inline) | nằm **bên trong** phần tử khác, chiều rộng chỉ bằng phần chữ của nó | `span`, `a`, `b`, `i`, `em`, `strong`, `img`, `input`, `label` |

Có thể đổi loại bằng thuộc tính **`display`**:

- `display: block` – thành phần tử khối;
- `display: inline` – thành phần tử nội tuyến;
- `display: none` – **ẩn** phần tử, không hiển thị trên trang.

Chiều rộng của phần tử nội tuyến chỉ phụ thuộc phần chữ của nó, **không** phụ thuộc cửa sổ trình duyệt; còn phần tử khối mặc định rộng theo cửa sổ.""",
        """### 1. Block and inline elements

By default every HTML element is one of two kinds:

| Kind | Feature | Examples |
|---|---|---|
| **Block** | starts at the **beginning of a line** and stretches over the **full width** of the page | `div`, `p`, `h1`–`h6`, `ul`, `li`, `table`, `form` |
| **Inline** | sits **inside** another element, as wide as its own text | `span`, `a`, `b`, `i`, `em`, `strong`, `img`, `input`, `label` |

The kind can be changed with the **`display`** property:

- `display: block` – becomes a block element;
- `display: inline` – becomes an inline element;
- `display: none` – **hides** the element so it is not shown.

An inline element's width depends only on its text, **not** on the browser window; a block element by default is as wide as the window.""",
    ),
    web_block(
        sim("Phần tử khối và nội tuyến", "Block and inline elements", "Nền xanh của h3 trải suốt chiều rộng (khối); nền cam của span chỉ bao quanh cụm chữ (nội tuyến).", "The blue background of h3 spans the full width (block); the orange background of span wraps only its text (inline)."),
        """<h3>Thư Bác Hồ gửi học sinh</h3>
<p>Nước <span>Việt Nam</span> Dân chủ Cộng hoà.</p>
<div>Phần tử div là khối</div>""",
        """h3 {
  background-color: lightblue;
}
span {
  background-color: orange;
}
div {
  background-color: lightgreen;
}""",
        300,
    ),
    web_block(
        sim("Đổi loại phần tử bằng display", "Switching element kind with display", "span thành khối, div thành nội tuyến, h6 bị ẩn hoàn toàn bằng display: none.", "span becomes block, div becomes inline, and h6 is hidden completely with display: none."),
        """<span>Span 1</span>
<span>Span 2</span>
<div>Div 1</div>
<div>Div 2</div>
<h6>Dòng này bị ẩn khỏi trang</h6>
<p>Dòng cuối cùng còn hiển thị.</p>""",
        """span {
  background-color: orange;
}
div {
  background-color: lightgreen;
}
span {
  display: block;
}
div {
  display: inline;
}
h6 {
  display: none;
}""",
        320,
    ),
    T(
        """### 2. Định dạng khung bằng CSS

Mỗi phần tử có một **khung** gồm bốn lớp, từ trong ra ngoài:

1. **Nội dung** (content) – có `width`, `height`;
2. **Vùng đệm** (`padding`) – khoảng cách từ nội dung tới đường viền;
3. **Đường viền** (`border`) – khung quanh phần tử;
4. **Lề** (`margin`) – khoảng cách từ đường viền tới các phần tử bên ngoài.

| Thuộc tính | Ý nghĩa |
|---|---|
| `width`, `height` | chiều rộng, chiều cao vùng nội dung (**chỉ phần tử khối**) |
| `padding` (và `padding-top/right/bottom/left`) | vùng đệm trong khung |
| `margin` (và `margin-top/right/bottom/left`) | lề ngoài khung |
| `border-width`, `border-style`, `border-color` | độ dày, kiểu (`solid`, `dotted`, `dashed`, `double`, `groove`, `ridge`, `none`,...), màu viền |
| `border` | viết gộp: `2px solid red` |
| `border-top`, `border-right`, `border-bottom`, `border-left` | viền riêng từng cạnh |

Phần tử nội tuyến có thể đặt viền, đệm, lề nhưng **không có** chiều rộng, chiều cao riêng. Các thuộc tính khung **đều không kế thừa**.

Tính nhanh: với `width: 100px; padding: 20px; border: 5px solid` (lề 0), bề rộng khung chiếm chỗ là 100 + 2 × 20 + 2 × 5 = **150px**.""",
        """### 2. Formatting boxes with CSS

Every element has a **box** with four layers, from inside out:

1. **Content** – has `width`, `height`;
2. **Padding** (`padding`) – the gap between the content and the border;
3. **Border** (`border`) – the frame around the element;
4. **Margin** (`margin`) – the gap between the border and outside elements.

| Property | Meaning |
|---|---|
| `width`, `height` | width and height of the content area (**block elements only**) |
| `padding` (and `padding-top/right/bottom/left`) | padding inside the box |
| `margin` (and `margin-top/right/bottom/left`) | margin outside the box |
| `border-width`, `border-style`, `border-color` | thickness, style (`solid`, `dotted`, `dashed`, `double`, `groove`, `ridge`, `none`,...), colour |
| `border` | shorthand: `2px solid red` |
| `border-top`, `border-right`, `border-bottom`, `border-left` | border of one side |

An inline element can have a border, padding and margin but **no** own width or height. Box properties are **not inherited**.

Quick sum: with `width: 100px; padding: 20px; border: 5px solid` (margin 0), the box takes 100 + 2 × 20 + 2 × 5 = **150px** of width.""",
    ),
    web_block(
        sim("Khung của phần tử khối và nội tuyến", "The box of block and inline elements", "div có chiều rộng, vùng đệm, viền và lề; span chỉ có viền và đệm; p chỉ viền hai cạnh.", "div has width, padding, border and margin; span has only border and padding; p has a border on two sides only."),
        """<div>Khối div có khung đầy đủ</div>
<p>Chữ <span>nội tuyến</span> có viền riêng.</p>""",
        """div {
  width: 200px;
  padding: 20px;
  border: 5px solid navy;
  margin: 20px;
  background-color: lightyellow;
}
span {
  border: 2px dotted red;
  padding: 4px;
}
p {
  border-left: 6px solid green;
  border-bottom: 2px dashed gray;
  padding-left: 8px;
}""",
        340,
    ),
    T(
        """### 3. Một số bộ chọn đặc biệt

Muốn định dạng **khác nhau** cho các phần tử cùng loại (ví dụ nhiều thẻ `p`), ta dùng:

| Bộ chọn | Cách viết | Ý nghĩa |
|---|---|---|
| **Lớp** (class) | `.test`, `p.test` | mọi phần tử (hoặc mọi `p`) có `class="test"` |
| Nhiều lớp | `.test.warning` | phần tử có **đồng thời** hai lớp `test` và `warning` |
| **Định danh** (id) | `#p1`, `div#bat_dau` | **một** phần tử có `id="p1"` |
| **Thuộc tính** | `a[target]` | mọi thẻ `a` có thuộc tính `target` |

- `class` có thể gán cho **nhiều** phần tử; `id` chỉ gán cho **một** phần tử trong trang.
- Một phần tử có thể thuộc nhiều lớp, các tên lớp cách nhau bởi dấu cách: `class="test more once"`.
- Tên `id` và `class` **phân biệt chữ hoa, chữ thường**, không bắt đầu bằng số, không chứa dấu cách hay kí tự đặc biệt.
- Có thể kết hợp: `div#bat_dau > p` là các `p` là con trực tiếp của `div` có id `bat_dau`; `p.test em#p123` là `em` có id `p123` nằm trong `p` thuộc lớp `test`.""",
        """### 3. Some special selectors

To style **differently** elements of the same kind (for example many `p` tags), use:

| Selector | Written | Meaning |
|---|---|---|
| **Class** | `.test`, `p.test` | every element (or every `p`) with `class="test"` |
| Several classes | `.test.warning` | an element with **both** classes `test` and `warning` |
| **Id** | `#p1`, `div#bat_dau` | the **one** element with `id="p1"` |
| **Attribute** | `a[target]` | every `a` tag that has a `target` attribute |

- A `class` may be given to **many** elements; an `id` belongs to **one** element on the page.
- An element can have several classes separated by spaces: `class="test more once"`.
- `id` and `class` names are **case-sensitive**, do not start with a digit and contain no spaces or special characters.
- They can be combined: `div#bat_dau > p` is the `p` elements that are direct children of the `div` with id `bat_dau`; `p.test em#p123` is the `em` with id `p123` inside a `p` of class `test`.""",
    ),
    web_block(
        sim("Bộ chọn lớp, định danh và thuộc tính", "Class, id and attribute selectors", "Hai đoạn cùng lớp quan-trong đổi chung một kiểu; đoạn có id p1 được tô riêng; a[target] chỉ chọn liên kết có thuộc tính target.", "Two paragraphs of the class quan-trong change together; the paragraph with id p1 is styled alone; a[target] picks only links that have a target attribute."),
        """<p>Đoạn bình thường.</p>
<p class="quan-trong">Đoạn quan trọng thứ nhất (lớp).</p>
<p class="quan-trong">Đoạn quan trọng thứ hai (lớp).</p>
<p id="p1">Đoạn đặc biệt có id p1.</p>
<p><a href="a.html">Liên kết thường</a> | <a href="b.html" target="_blank">Liên kết có target</a></p>""",
        """p {
  color: #333333;
}
.quan-trong {
  color: red;
  font-weight: bold;
}
#p1 {
  background-color: yellow;
}
a[target] {
  color: green;
  text-decoration: none;
}""",
        340,
    ),
    web_block(
        sim("Kết hợp id, lớp và quan hệ cha con", "Combining id, class and parent-child", "div#bat_dau > p chỉ chọn p trong div có id bat_dau; p.test em#p123 chọn đúng một em.", "div#bat_dau > p picks only the p inside the div with id bat_dau; p.test em#p123 picks exactly one em."),
        """<div id="bat_dau">
  <p>Đoạn con của div#bat_dau.</p>
</div>
<p>Đoạn nằm ngoài div.</p>
<p class="test">Trong p.test có <em id="p123">em#p123</em> và <em>em thường</em>.</p>""",
        """div#bat_dau > p {
  background-color: lightblue;
}
p.test em#p123 {
  color: red;
  font-weight: bold;
}""",
        300,
    ),
    T(
        """### 4. Thực hành: bảng các tên màu cơ bản

Tạo trang mô tả bảng tên màu: (1) lập bảng bằng `<table>`, `<caption>`, `<tr>`, `<th>`, `<td>`; (2) gán mỗi ô màu một **lớp** riêng, ví dụ `class="do"`; (3) viết CSS đặt viền, vùng đệm cho bảng và `background-color` cho từng lớp.

Cách dùng lớp giúp một mẫu CSS tô đúng các ô cần tô mà không đụng tới ô khác.""",
        """### 4. Practice: a table of basic colour names

Build a page with a colour-name table: (1) make the table with `<table>`, `<caption>`, `<tr>`, `<th>`, `<td>`; (2) give each colour cell its own **class**, e.g. `class="do"`; (3) write CSS that sets the border and padding of the table and the `background-color` of each class.

Using classes lets one CSS rule colour exactly the cells you need without touching others.""",
    ),
    web_block(
        sim("Bảng tên màu cơ bản", "A table of basic colour names", "Mỗi ô màu có một lớp riêng; các quy tắc CSS tô nền từng lớp.", "Each colour cell has its own class; the CSS rules colour the background of each class."),
        """<table>
  <caption>Tên màu cơ bản</caption>
  <tr><th>Tên màu</th><th>Mã hex</th><th>Màu</th></tr>
  <tr><td>black</td><td>#000000</td><td class="den"></td></tr>
  <tr><td>gray</td><td>#808080</td><td class="xam"></td></tr>
  <tr><td>red</td><td>#ff0000</td><td class="do"></td></tr>
  <tr><td>green</td><td>#008000</td><td class="luc"></td></tr>
  <tr><td>blue</td><td>#0000ff</td><td class="lam"></td></tr>
  <tr><td>yellow</td><td>#ffff00</td><td class="vang"></td></tr>
</table>""",
        """table {
  border: 2px solid gray;
}
th, td {
  border: 1px solid gray;
  padding: 6px 14px;
}
.den {
  background-color: black;
}
.xam {
  background-color: gray;
}
.do {
  background-color: red;
}
.luc {
  background-color: green;
}
.lam {
  background-color: blue;
}
.vang {
  background-color: yellow;
}""",
        460,
    ),
    T(
        """### Tóm tắt và tự kiểm tra

| Nội dung | Ghi nhớ |
|---|---|
| Khối / nội tuyến | khối: từ đầu hàng, suốt chiều rộng; nội tuyến: chỉ rộng bằng chữ |
| `display` | `block`, `inline`, `none` (ẩn) |
| Khung | nội dung → `padding` → `border` → `margin`; không kế thừa |
| `width`, `height` | chỉ cho phần tử khối |
| Lớp | `.ten`, gán cho nhiều phần tử |
| Định danh | `#ten`, duy nhất trong trang |
| Thuộc tính | `a[target]` |

**Tự kiểm tra:** `width: 100px; padding: 20px; border: 5px solid; margin: 0` thì khung chiếm bao nhiêu chiều rộng? (đáp án: 150px).""",
        """### Summary and self-check

| Topic | Remember |
|---|---|
| Block / inline | block: from line start, full width; inline: as wide as its text |
| `display` | `block`, `inline`, `none` (hide) |
| Box | content → `padding` → `border` → `margin`; not inherited |
| `width`, `height` | block elements only |
| Class | `.name`, given to many elements |
| Id | `#name`, unique on the page |
| Attribute | `a[target]` |

**Self-check:** with `width: 100px; padding: 20px; border: 5px solid; margin: 0`, how much width does the box take? (answer: 150px).""",
    ),
]

questions = [
    mc("tin12-b16-mc-01", 1, "Mặc định, một phần tử dạng khối (block) hiển thị như thế nào?", "By default, how is a block element shown?",
       "Phần tử khối bắt đầu từ đầu hàng và kéo dài suốt chiều rộng của trang web.", "A block element starts at the beginning of a line and stretches over the full width of the page.", "A",
       ("Bắt đầu ở đầu hàng, kéo dài suốt chiều rộng trang", "Starts at the beginning of a line and spans the full page width"), ("Chỉ rộng bằng phần chữ của nó", "Only as wide as its own text"), ("Luôn nằm cùng dòng với phần tử trước", "Always on the same line as the previous element"), ("Bị ẩn đi", "Hidden")),
    mc("tin12-b16-mc-02", 1, "Phần tử nào sau đây mặc định là phần tử nội tuyến?", "Which of these is an inline element by default?",
       "span là phần tử nội tuyến; div, p, h1 là phần tử khối.", "span is inline; div, p and h1 are block elements.", "B",
       ("<div>", "<div>"), ("<span>", "<span>"), ("<p>", "<p>"), ("<h1>", "<h1>")),
    mc("tin12-b16-mc-03", 1, "Khai báo CSS nào làm ẩn hoàn toàn một phần tử khỏi trang?", "Which CSS declaration hides an element from the page completely?",
       "display: none làm phần tử không hiển thị; hide, off không phải giá trị hợp lệ.", "display: none removes the element from view; hide and off are not valid values.", "C",
       ("display: hide", "display: hide"), ("display: inline", "display: inline"), ("display: none", "display: none"), ("display: off", "display: off")),
    mc("tin12-b16-mc-04", 1, "Khoảng cách từ vùng nội dung tới đường viền của khung gọi là gì?", "What is the gap between the content area and the border of the box called?",
       "Khoảng cách từ nội dung đến đường viền là vùng đệm (padding); lề (margin) nằm ngoài viền.", "The gap from content to border is padding; the margin lies outside the border.", "D",
       ("margin", "margin"), ("spacing", "spacing"), ("border-width", "border-width"), ("padding", "padding")),
    mc("tin12-b16-mc-05", 2, "Thuộc tính nào định dạng lề, tức khoảng cách từ đường viền khung tới các phần tử bên ngoài?", "Which property sets the margin, the gap from the border to outside elements?",
       "margin là lề ngoài khung, còn padding là vùng đệm trong khung.", "margin is the outside gap while padding is the gap inside the box.", "B",
       ("padding", "padding"), ("margin", "margin"), ("spacing", "spacing"), ("border-space", "border-space")),
    mc("tin12-b16-mc-06", 2, "Các thuộc tính khung như margin, padding, border có tính kế thừa không?", "Are box properties such as margin, padding and border inherited?",
       "Các thuộc tính liên quan đến khung đều không có tính kế thừa.", "None of the box-related properties are inherited.", "A",
       ("Không, đều không kế thừa", "No, none is inherited"), ("Có, đều kế thừa", "Yes, all are inherited"), ("Chỉ margin kế thừa", "Only margin is inherited"), ("Chỉ border kế thừa", "Only border is inherited")),
    mc("tin12-b16-mc-07", 2, "Thuộc tính nào sau đây chỉ áp dụng cho phần tử dạng khối?", "Which of these properties applies only to block elements?",
       "Chiều rộng và chiều cao (width, height) chỉ thiết lập được cho phần tử khối.", "Width and height can only be set for block elements.", "D",
       ("border-style", "border-style"), ("padding", "padding"), ("border-color", "border-color"), ("width", "width")),
    mc("tin12-b16-mc-08", 2, "Thuộc tính border-style KHÔNG nhận giá trị nào sau đây?", "Which value does border-style NOT accept?",
       "border-style nhận solid, dotted, dashed, double, groove, ridge, none,... nhưng không có shadow.", "border-style takes solid, dotted, dashed, double, groove, ridge, none,... but not shadow.", "C",
       ("dashed", "dashed"), ("groove", "groove"), ("shadow", "shadow"), ("double", "double")),
    mc("tin12-b16-mc-09", 2, "Cách viết bộ chọn nào áp dụng cho phần tử có id là idname?", "Which selector applies to the element whose id is idname?",
       "Bộ chọn định danh dùng dấu # đặt trước tên id; dấu chấm dành cho lớp.", "An id selector puts # before the id name; the dot is for classes.", "B",
       (".idname {…}", ".idname {…}"), ("#idname {…}", "#idname {…}"), ("idname {…}", "idname {…}"), ("id[idname] {…}", "id[idname] {…}")),
    mc("tin12-b16-mc-10", 2, "Bộ chọn p.test áp dụng cho phần tử nào?", "Which elements does the selector p.test apply to?",
       "p.test áp dụng cho các phần tử p có gắn lớp tên test.", "p.test applies to p elements that carry the class test.", "D",
       ("Mọi phần tử p và mọi phần tử thuộc lớp test", "Every p and every element of class test"), ("p là con của phần tử thuộc lớp test", "A p that is a child of an element of class test"), ("Phần tử có id là test", "The element whose id is test"), ("Mọi phần tử p thuộc lớp test", "Every p element of class test")),
    mc("tin12-b16-mc-11", 2, "Sự khác biệt cơ bản giữa id và class là gì?", "What is the main difference between id and class?",
       "Mỗi id chỉ gán cho một phần tử trong trang, còn một class có thể gán cho nhiều phần tử.", "Each id belongs to one element on the page, while a class may be given to many elements.", "A",
       ("id chỉ gán cho một phần tử, class gán được cho nhiều phần tử", "An id belongs to one element, a class can be given to many"), ("id gán được cho nhiều phần tử, class chỉ gán cho một", "An id can go to many elements, a class to one"), ("id chỉ dùng với thẻ p", "An id is only used with p"), ("class phân biệt hoa thường còn id thì không", "class is case-sensitive but id is not")),
    mc("tin12-b16-mc-12", 3, "Một div có width: 100px; padding: 20px; border: 5px solid; margin: 0. Chiều rộng khung chiếm chỗ (gồm nội dung, đệm hai bên và viền hai bên) là bao nhiêu?", "A div has width: 100px; padding: 20px; border: 5px solid; margin: 0. How wide is the box overall (content, padding on both sides and border on both sides)?",
       "Chiều rộng là 100 + 2 × 20 + 2 × 5 = 150 pixel.", "The width is 100 + 2 × 20 + 2 × 5 = 150 pixels.", "C",
       ("125px", "125px"), ("140px", "140px"), ("150px", "150px"), ("160px", "160px")),
]

truefalse = [
    tf("tin12-b16-tf-01", 2, "Xét phần tử khối và nội tuyến.", "Consider block and inline elements.",
       "label là phần tử nội tuyến; ẩn phần tử dùng display: none; height chỉ cho phần tử khối; margin là khoảng cách ngoài viền.", "label is inline; hiding uses display: none; height is for block elements only; margin is the gap outside the border.",
       ("Phần tử label là phần tử loại khối.", "The label element is a block element.", False),
       ("Để ẩn một phần tử bằng CSS, dùng display với giá trị hide.", "To hide an element with CSS, use display with the value hide.", False),
       ("Thuộc tính height chỉ áp dụng được cho phần tử dạng khối.", "The height property only works for block elements.", True),
       ("margin là khoảng cách từ đường viền khung tới văn bản xung quanh.", "margin is the gap from the box border to surrounding text.", True)),
    tf("tin12-b16-tf-02", 2, "Xét thuộc tính khung.", "Consider box properties.",
       "Thuộc tính khung không kế thừa; padding là khoảng cách trong khung; border-left chỉ viền trái; shadow không phải kiểu viền.", "Box properties are not inherited; padding is the inner gap; border-left is the left border only; shadow is not a border style.",
       ("Các thuộc tính margin, padding, border không có tính kế thừa.", "margin, padding and border are not inherited.", True),
       ("padding là khoảng cách giữa nội dung và đường viền.", "padding is the gap between content and border.", True),
       ("border-left chỉ định dạng đường viền bên trái của khung.", "border-left formats only the left border of the box.", True),
       ("border-style có thể nhận giá trị shadow.", "border-style can take the value shadow.", False)),
    tf("tin12-b16-tf-03", 2, "Xét id và class.", "Consider id and class.",
       "class gán cho nhiều phần tử; id duy nhất; tên phân biệt hoa thường; một phần tử có nhiều lớp cách nhau dấu cách.", "A class goes to many elements; an id is unique; names are case-sensitive; an element can have several classes separated by spaces.",
       ("Một class có thể gán cho nhiều phần tử HTML.", "One class can be given to many HTML elements.", True),
       ("Mỗi id chỉ gán cho một phần tử trong trang.", "Each id belongs to only one element on the page.", True),
       ("Tên id và class không phân biệt chữ hoa, chữ thường.", "id and class names are not case-sensitive.", False),
       ("Một phần tử có thể thuộc nhiều lớp, tên lớp cách nhau bởi dấu cách.", "An element can have several classes, with names separated by spaces.", True)),
    tf("tin12-b16-tf-04", 2, "Xét các bộ chọn đặc biệt.", "Consider special selectors.",
       "div#bat_dau > p là p con trực tiếp của div id bat_dau; .test.warning cần cả hai lớp; a[target] chọn thẻ a có thuộc tính target; #p1 là id chứ không phải lớp.", "div#bat_dau > p is a p directly under the div with id bat_dau; .test.warning needs both classes; a[target] picks a tags with a target attribute; #p1 is an id, not a class.",
       ("div#bat_dau > p áp dụng cho p là con trực tiếp của div có id bat_dau.", "div#bat_dau > p applies to a p directly under the div with id bat_dau.", True),
       ("Bộ chọn .test.warning áp dụng cho phần tử có đồng thời hai lớp test và warning.", "The selector .test.warning applies to an element with both classes test and warning.", True),
       ("a[target] chọn mọi thẻ a có thuộc tính target.", "a[target] picks every a tag that has a target attribute.", True),
       ("#p1 chọn các phần tử có class là p1.", "#p1 picks elements whose class is p1.", False)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
