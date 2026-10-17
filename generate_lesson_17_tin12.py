# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_17_tin12.py
from generate_tin_common import T, build, configure, mc, tf, web_block

configure(12, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers", "Tin học ứng dụng")

slug = "cac-muc-uu-tien-cua-bo-chon-bai-17-tin12"
title_vi = "Bài 17. Các mức ưu tiên của bộ chọn"
title_en = "Lesson 17. Selector priority levels"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


blocks = [
    T(
        """### Mục tiêu bài học

Sau bài này, bạn có thể:

- dùng **lớp giả** (pseudo-class) như `:hover`, `:link`, `:visited`, `:active` và **phần tử giả** (pseudo-element) như `::first-line`, `::first-letter`, `::before`, `::after`;
- nêu thứ tự các **mức ưu tiên** khi nhiều mẫu CSS cùng áp dụng cho một phần tử;
- **tính trọng số** (specificity) của một bộ chọn và so sánh hai bộ chọn.""",
        """### Learning goals

After this lesson, you can:

- use **pseudo-classes** such as `:hover`, `:link`, `:visited`, `:active` and **pseudo-elements** such as `::first-line`, `::first-letter`, `::before`, `::after`;
- list the **priority levels** applied when several CSS rules match one element;
- **compute the specificity** of a selector and compare two selectors.""",
    ),
    T(
        """### 1a. Lớp giả (pseudo-class)

**Lớp giả** chỉ các **trạng thái đặc biệt** của phần tử HTML. Các trạng thái này có sẵn trong CSS, không cần tự định nghĩa. Lớp giả viết sau dấu **`:`**.

| Lớp giả | Áp dụng khi |
|---|---|
| `a:link` | liên kết chưa được truy cập |
| `a:visited` | liên kết đã được truy cập |
| `a:hover` | di chuyển con trỏ chuột lên phần tử |
| `a:active` | đang nháy chuột vào phần tử |
| `p:first-child` | phần tử là con đầu tiên của phần tử cha |

Khai báo lớp giả giúp thay đổi giá trị mặc định khi người dùng tác động, nhằm gây chú ý. Ví dụ muốn tăng cỡ chữ khi chuột đi qua đoạn văn: `p:hover { font-size: 150%; }`; muốn đổi màu khi nháy chuột: `a:active { color: green; }`.""",
        """### 1a. Pseudo-classes

A **pseudo-class** names a **special state** of an HTML element. These states are built into CSS and need no definition. A pseudo-class is written after a **`:`**.

| Pseudo-class | Applies when |
|---|---|
| `a:link` | a link that has not been visited |
| `a:visited` | a link that has been visited |
| `a:hover` | the mouse pointer moves over the element |
| `a:active` | the element is being clicked |
| `p:first-child` | the element is the first child of its parent |

Declaring a pseudo-class changes default values when the user interacts, to draw attention. For example, to enlarge text when the mouse passes over a paragraph: `p:hover { font-size: 150%; }`; to change colour on click: `a:active { color: green; }`.""",
    ),
    web_block(
        sim("Lớp giả của liên kết và :hover", "Link pseudo-classes and :hover", "Liên kết đỏ khi chưa thăm, xanh lá khi đã thăm, hồng khi rê chuột. Sau khi chạy hết, rê chuột lên liên kết và đoạn văn để thử.", "The link is red when unvisited, green when visited and pink on hover. When the run ends, move the mouse over the link and the paragraph to try."),
        """<p><a href="https://www.w3schools.com/css/">Tự học nhanh CSS</a></p>
<p>Rê chuột lên đoạn này để thấy chữ to ra.</p>""",
        """a:link {
  color: red;
}
a:visited {
  color: green;
}
a:hover {
  color: hotpink;
}
p:hover {
  font-size: 150%;
  background-color: lightyellow;
}""",
        300,
    ),
    T(
        """### 1b. Phần tử giả (pseudo-element)

**Phần tử giả** chỉ **một phần** của phần tử bình thường, có thể định dạng riêng mà không đổi cấu trúc HTML. Phần tử giả viết sau dấu **`::`**.

| Phần tử giả | Chọn |
|---|---|
| `p::first-line` | dòng đầu tiên của phần tử (phụ thuộc độ rộng cửa sổ, không phụ thuộc văn bản) |
| `p::first-letter` | kí tự đầu tiên |
| `p::before` | chèn nội dung **trước** phần tử (dùng với `content`) |
| `p::after` | chèn nội dung **sau** phần tử (dùng với `content`) |
| `::selection` | phần được người dùng bôi đen bằng chuột |

Tóm lại: *lớp giả* mô tả **trạng thái** (một dấu `:`), *phần tử giả* mô tả **thành phần nhỏ hơn** của phần tử (hai dấu `::`).""",
        """### 1b. Pseudo-elements

A **pseudo-element** names **part of** an ordinary element and can be styled separately without changing the HTML structure. It is written after **`::`**.

| Pseudo-element | Selects |
|---|---|
| `p::first-line` | the first line of the element (depends on window width, not on the text) |
| `p::first-letter` | the first character |
| `p::before` | inserts content **before** the element (used with `content`) |
| `p::after` | inserts content **after** the element (used with `content`) |
| `::selection` | the part the user highlights with the mouse |

In short: a *pseudo-class* describes a **state** (one `:`), a *pseudo-element* describes a **smaller part** of an element (two `::`).""",
    ),
    web_block(
        sim("Phần tử giả ::first-line, ::first-letter, ::before, ::after", "The pseudo-elements ::first-line, ::first-letter, ::before, ::after", "Dòng đầu của đoạn đỏ và to hơn, chữ cái đầu đậm, nội dung được chèn thêm trước và sau; thử bôi đen chữ để thấy ::selection.", "The first line of the paragraph is red and larger, the first letter is bold, content is inserted before and after; select some text to see ::selection."),
        """<p>CSS cho phép định dạng riêng dòng đầu tiên hoặc chữ cái đầu tiên của một đoạn văn bản mà không cần thêm thẻ HTML nào, giúp trang web trình bày đẹp và gọn mã hơn.</p>""",
        """p::first-line {
  color: red;
  font-family: monospace;
  font-size: 1.2em;
}
p::first-letter {
  font-size: 200%;
  font-weight: bold;
}
p::before {
  content: "Hãy đọc: ";
  color: green;
}
p::after {
  content: " – Rất quan trọng!";
  color: blue;
}
::selection {
  background-color: yellow;
}""",
        320,
    ),
    T(
        """### 2. Mức độ ưu tiên khi áp dụng CSS

Khi nhiều mẫu CSS cùng có thể áp dụng cho một phần tử, CSS chọn theo thứ tự ưu tiên **từ cao xuống thấp** (theo SGK):

1. **`!important`** – thuộc tính có từ khoá này ưu tiên cao nhất;
2. **CSS trực tiếp** (inline): thuộc tính `style` ngay trong thẻ;
3. **CSS theo kích thước thiết bị** (media), ví dụ `@media only screen and (max-width: 600px) {…}` (mức này chỉ cần biết, không đi sâu);
4. **Trọng số** (specificity): mẫu có trọng số cao hơn được áp dụng;
5. **Thứ tự cuối cùng**: cùng trọng số thì mẫu **viết sau** thắng;
6. **Kế thừa** từ phần tử cha;
7. **Mặc định** của trình duyệt.

Vì vậy kế thừa và thứ tự viết nằm **dưới** trọng số: trước hết CSS so trọng số, bằng nhau mới xét thứ tự viết.""",
        """### 2. Priority levels when applying CSS

When several CSS rules can apply to one element, CSS chooses in this priority order **from high to low** (as in the textbook):

1. **`!important`** – a property with this keyword has the highest priority;
2. **Inline CSS**: the `style` attribute in the tag itself;
3. **Device-size CSS** (media), e.g. `@media only screen and (max-width: 600px) {…}` (just to know, not in depth);
4. **Specificity**: the rule with the higher weight wins;
5. **Last-rule order**: with equal weight the rule **written later** wins;
6. **Inheritance** from the parent element;
7. The browser **default**.

So inheritance and writing order rank **below** specificity: CSS first compares weights and only if they tie does it look at the order.""",
    ),
    T(
        """### 3. Cách tính trọng số

Trọng số của một mẫu bằng **tổng** giá trị các thành phần trong bộ chọn:

| Thành phần của bộ chọn | Giá trị |
|---|---|
| Phần tử (`p`, `em`), phần tử giả (`::first-line`) | **1** |
| Lớp (`.test`), lớp giả (`:hover`), thuộc tính (`[target]`) | **10** |
| Định danh (`#p123`) | **100** |
| Kí hiệu `*` | 0 |

| Bộ chọn | Cách tính | Trọng số |
|---|---|---|
| `p > em` | 1 + 1 | **2** |
| `.test #p11` | 10 + 100 | **110** |
| `p.test em.more` | 1 + 10 + 1 + 10 | **22** |
| `p > em#p123` | 1 + 1 + 100 | **102** |
| `a:link ~ p#info` | 1 + 10 + 1 + 100 | **112** |
| `#n12 > .test` | 100 + 10 | **110** |

Ví dụ: `p:first-child {color: green;}` (1 + 10 = 11) thắng `p {color: red;}` (1) dù mẫu `p` viết sau.""",
        """### 3. Computing specificity

The specificity of a rule is the **sum** of the values of the parts of its selector:

| Part of the selector | Value |
|---|---|
| Element (`p`, `em`), pseudo-element (`::first-line`) | **1** |
| Class (`.test`), pseudo-class (`:hover`), attribute (`[target]`) | **10** |
| Id (`#p123`) | **100** |
| The `*` symbol | 0 |

| Selector | Calculation | Specificity |
|---|---|---|
| `p > em` | 1 + 1 | **2** |
| `.test #p11` | 10 + 100 | **110** |
| `p.test em.more` | 1 + 10 + 1 + 10 | **22** |
| `p > em#p123` | 1 + 1 + 100 | **102** |
| `a:link ~ p#info` | 1 + 10 + 1 + 100 | **112** |
| `#n12 > .test` | 100 + 10 | **110** |

Example: `p:first-child {color: green;}` (1 + 10 = 11) beats `p {color: red;}` (1) even though the `p` rule is written later.""",
    ),
    web_block(
        sim("Trọng số quyết định, không phải thứ tự viết", "Specificity decides, not writing order", "p:first-child (trọng số 11) viết trước nhưng vẫn thắng p (trọng số 1) viết sau, nên chữ xanh lá.", "p:first-child (specificity 11) written first still beats p (specificity 1) written later, so the text is green."),
        """<p>Tin học 12 (đoạn p đầu tiên)</p>
<p>Đoạn p thứ hai chỉ khớp bộ chọn p</p>""",
        """p:first-child {
  color: green;
}
p {
  color: red;
}""",
        260,
    ),
    web_block(
        sim("Bộ chọn id, lớp và phần tử cùng chọn một đoạn", "Id, class and element selectors on one paragraph", "Ba mẫu cùng chọn đoạn p: p (1), .test (10), #n12 (100). Mẫu p viết cuối nhưng id thắng nên chữ đỏ.", "Three rules select one paragraph: p (1), .test (10), #n12 (100). The p rule is last but the id wins, so the text is red."),
        """<p id="n12" class="test">Tin học 12</p>""",
        """#n12 {
  color: red;
}
.test {
  color: blue;
}
p {
  color: black;
}""",
        200,
    ),
    web_block(
        sim("Thứ tự viết, inline và !important", "Writing order, inline and !important", "Đoạn 1: cùng trọng số thì mẫu sau thắng (đỏ); đoạn 2: inline thắng id (xanh lá); đoạn 3: !important thắng cả inline (tím).", "Paragraph 1: equal weight, the later rule wins (red); paragraph 2: inline beats id (green); paragraph 3: !important beats even inline (purple)."),
        """<p class="a">1. Cùng trọng số: viết sau thắng</p>
<p id="b" style="color: green">2. Inline thắng bộ chọn id</p>
<p id="c" style="color: green">3. !important thắng cả inline</p>""",
        """.a {
  color: blue;
}
.a {
  color: red;
}
#b {
  color: black;
}
#c {
  color: purple !important;
}""",
        300,
    ),
    T(
        """### 4. Thực hành: định dạng trang HTML và CSS

Yêu cầu của Nhiệm vụ: tiêu đề chính màu đỏ, căn giữa; tiêu đề nhỏ màu xanh, đậm; phần liên kết đầu trang nằm trên một hàng ngang, căn phải, liên kết có nền xanh lá và đổi chữ sang đỏ khi di chuột; **đoạn đầu tiên dưới mỗi tiêu đề** màu đỏ, các đoạn khác giữ mặc định.

Gợi ý bộ chọn: `nav li {display: inline;}` (đưa các mục về một hàng), `nav a:hover {color: red;}` (lớp giả) và `h2 + p {color: red;}` (đoạn liền sau tiêu đề `h2`). Muốn các tên riêng được đóng khung và in nghiêng, đặt chúng trong thẻ `<em>` rồi định dạng `em` một lần.""",
        """### 4. Practice: styling an HTML page with CSS

The task asks for: a red, centred main title; blue bold sub-titles; a header link bar on one horizontal row, right-aligned, links with a green background that turn red on hover; **the first paragraph under each heading** red, other paragraphs left default.

Selector hints: `nav li {display: inline;}` (put the items on one row), `nav a:hover {color: red;}` (pseudo-class) and `h2 + p {color: red;}` (the paragraph right after an `h2`). To frame proper names in italics, wrap them in `<em>` and style `em` once.""",
    ),
    web_block(
        sim("Trang HTML và CSS hoàn chỉnh", "A complete HTML and CSS page", "nav a:hover đổi chữ khi rê chuột; h2 + p chỉ tô đỏ đoạn đầu dưới mỗi tiêu đề; em được đóng khung và in nghiêng.", "nav a:hover recolours text on hover; h2 + p reddens only the first paragraph under each heading; em is framed and italic."),
        """<nav>
  <ul>
    <li><a href="#html">HTML</a></li>
    <li><a href="#css">CSS</a></li>
  </ul>
</nav>
<h1>Tìm hiểu HTML và CSS</h1>
<h2 id="html">HTML</h2>
<p>Do <em>Tim Berners-Lee</em> phát minh tại CERN.</p>
<p>HTML mô tả cấu trúc trang web.</p>
<h2 id="css">CSS</h2>
<p>CSS do <em>Håkon Wium Lie</em> đề xuất.</p>
<p>CSS định dạng trang web.</p>""",
        """h1 {
  color: red;
  text-align: center;
}
h2 {
  color: blue;
  font-weight: bold;
}
nav ul {
  list-style-type: none;
  text-align: right;
}
nav li {
  display: inline;
}
nav a {
  background-color: green;
  color: white;
  padding: 4px 10px;
  text-decoration: none;
}
nav a:hover {
  color: red;
}
h2 + p {
  color: red;
}
em {
  border: 1px solid gray;
  font-style: italic;
}""",
        520,
    ),
    T(
        """### Tóm tắt và tự kiểm tra

| Nội dung | Ghi nhớ |
|---|---|
| Lớp giả | `:` + trạng thái: `:link`, `:visited`, `:hover`, `:active`, `:first-child` |
| Phần tử giả | `::` + thành phần: `::first-line`, `::first-letter`, `::before`, `::after`, `::selection` |
| Thứ tự ưu tiên | `!important` → inline → media → trọng số → thứ tự viết → kế thừa → mặc định |
| Trọng số | phần tử / phần tử giả = 1; lớp / lớp giả / thuộc tính = 10; id = 100 |

**Tự kiểm tra:** trọng số của `p.test em.more` là bao nhiêu? (đáp án: 22).""",
        """### Summary and self-check

| Topic | Remember |
|---|---|
| Pseudo-class | `:` + state: `:link`, `:visited`, `:hover`, `:active`, `:first-child` |
| Pseudo-element | `::` + part: `::first-line`, `::first-letter`, `::before`, `::after`, `::selection` |
| Priority order | `!important` → inline → media → specificity → writing order → inheritance → default |
| Specificity | element / pseudo-element = 1; class / pseudo-class / attribute = 10; id = 100 |

**Self-check:** what is the specificity of `p.test em.more`? (answer: 22).""",
    ),
]

questions = [
    mc("tin12-b17-mc-01", 1, "Trong CSS, các lớp giả (pseudo-class) được viết sau dấu nào?", "In CSS, after which sign is a pseudo-class written?",
       "Lớp giả viết sau một dấu hai chấm, còn phần tử giả viết sau hai dấu hai chấm.", "A pseudo-class follows a single colon, while a pseudo-element follows a double colon.", "B",
       ("#", "#"), (":", ":"), (".", "."), ("::", "::")),
    mc("tin12-b17-mc-02", 1, "Trong CSS, các phần tử giả (pseudo-element) được viết sau dấu nào?", "In CSS, after which sign is a pseudo-element written?",
       "Phần tử giả viết sau hai dấu hai chấm (::), ví dụ ::first-line.", "A pseudo-element follows a double colon (::), e.g. ::first-line.", "D",
       (":", ":"), ("#", "#"), (".", "."), ("::", "::")),
    mc("tin12-b17-mc-03", 1, "Mẫu a:hover áp dụng cho liên kết trong trường hợp nào?", "When does the rule a:hover apply to a link?",
       "Lớp giả :hover áp dụng khi di chuyển con trỏ chuột lên phần tử.", "The :hover pseudo-class applies when the mouse pointer moves over the element.", "A",
       ("Khi di chuyển con trỏ chuột lên liên kết", "When the mouse pointer moves over the link"), ("Khi liên kết chưa được truy cập", "When the link has not been visited"), ("Khi trang vừa tải xong", "When the page has just loaded"), ("Khi liên kết bị xoá", "When the link is deleted")),
    mc("tin12-b17-mc-04", 1, "Phần tử giả ::first-line chọn phần nào của phần tử?", "What part of an element does the pseudo-element ::first-line select?",
       "::first-line chọn dòng đầu tiên của phần tử; dòng này phụ thuộc độ rộng cửa sổ.", "::first-line selects the first line of the element, which depends on the window width.", "C",
       ("Kí tự đầu tiên", "The first character"), ("Từ đầu tiên", "The first word"), ("Dòng đầu tiên", "The first line"), ("Phần được bôi đen", "The highlighted part")),
    mc("tin12-b17-mc-05", 2, "Mẫu CSS nào làm chữ đậm khi di chuyển chuột lên phần tử có id=\"title\"?", "Which CSS rule makes the text bold when the mouse moves over the element with id=\"title\"?",
       "Id dùng bộ chọn #title, trạng thái di chuột là :hover và chữ đậm là font-weight: bold.", "An id uses #title, the hover state is :hover and bold text is font-weight: bold.", "B",
       ("#title:hover {font-style: bold}", "#title:hover {font-style: bold}"), ("#title:hover {font-weight: bold}", "#title:hover {font-weight: bold}"), (".title:hover {font-weight: bold}", ".title:hover {font-weight: bold}"), ("title:hover {font-weight: bold}", "title:hover {font-weight: bold}")),
    mc("tin12-b17-mc-06", 2, "Thành phần id (ví dụ #p123) trong bộ chọn có giá trị trọng số là bao nhiêu?", "What specificity value does an id part (e.g. #p123) of a selector have?",
       "Id có giá trị 100; lớp, lớp giả, thuộc tính là 10; phần tử là 1.", "An id is worth 100; a class, pseudo-class or attribute is 10; an element is 1.", "D",
       ("1", "1"), ("10", "10"), ("50", "50"), ("100", "100")),
    mc("tin12-b17-mc-07", 2, "Bộ chọn p.test em.more có trọng số là bao nhiêu?", "What is the specificity of the selector p.test em.more?",
       "Có hai phần tử (p, em) và hai lớp (test, more): 2 + 20 = 22.", "It has two elements (p, em) and two classes (test, more): 2 + 20 = 22.", "A",
       ("22", "22"), ("4", "4"), ("40", "40"), ("202", "202")),
    mc("tin12-b17-mc-08", 2, "Bộ chọn p > em#p123 có trọng số là bao nhiêu?", "What is the specificity of the selector p > em#p123?",
       "Có hai phần tử (p, em) và một id: 1 + 1 + 100 = 102.", "It has two elements (p, em) and one id: 1 + 1 + 100 = 102.", "C",
       ("3", "3"), ("12", "12"), ("102", "102"), ("111", "111")),
    mc("tin12-b17-mc-09", 2, "Theo SGK, thành phần nào có mức ưu tiên cao nhất khi áp dụng CSS?", "According to the textbook, which has the highest priority when applying CSS?",
       "Thuộc tính có từ khoá !important có mức ưu tiên cao nhất, trên cả CSS trực tiếp.", "A property with !important has the highest priority, above even inline CSS.", "B",
       ("CSS trực tiếp (inline)", "Inline CSS"), ("Từ khoá !important", "The !important keyword"), ("Trọng số CSS", "CSS specificity"), ("Kế thừa từ phần tử cha", "Inheritance from the parent")),
    mc("tin12-b17-mc-10", 2, "Hai mẫu CSS có cùng trọng số cùng áp dụng cho một phần tử thì mẫu nào được áp dụng?", "Two CSS rules of equal specificity apply to one element. Which one is used?",
       "Khi trọng số bằng nhau, nguyên tắc thứ tự cuối cùng cho mẫu được viết sau cùng thắng.", "When specificity ties, the last-rule principle lets the rule written last win.", "A",
       ("Mẫu được viết sau cùng", "The rule written last"), ("Mẫu được viết đầu tiên", "The rule written first"), ("Mẫu có tên bộ chọn dài hơn", "The rule with the longer selector name"), ("Không mẫu nào được áp dụng", "Neither rule is applied")),
    mc("tin12-b17-mc-11", 2, "Một thẻ p có thuộc tính style=\"color: green\", còn trong CSS có #b {color: black;} chọn đúng thẻ đó (không có !important). Chữ có màu gì?", "A p tag has style=\"color: green\" and the CSS has #b {color: black;} selecting the same tag (no !important). What colour is the text?",
       "CSS trực tiếp (inline) có mức ưu tiên cao hơn trọng số của bộ chọn nên chữ màu xanh lá.", "Inline CSS ranks above selector specificity, so the text is green.", "D",
       ("Đen", "Black"), ("Trắng", "White"), ("Tím", "Purple"), ("Xanh lá", "Green")),
    mc("tin12-b17-mc-12", 3, "Bộ chọn a:link ~ p#info có trọng số là bao nhiêu?", "What is the specificity of the selector a:link ~ p#info?",
       "Gồm a (1), :link (10), p (1) và #info (100): 1 + 10 + 1 + 100 = 112.", "It has a (1), :link (10), p (1) and #info (100): 1 + 10 + 1 + 100 = 112.", "C",
       ("12", "12"), ("102", "102"), ("112", "112"), ("121", "121")),
]

truefalse = [
    tf("tin12-b17-tf-01", 2, "Xét các mức ưu tiên và trọng số.", "Consider priority levels and specificity.",
       "Kí hiệu * có mức ưu tiên thấp nhất; cùng trọng số thì mẫu cuối thắng; bộ chọn thuộc tính là 10; a:link ~ p#info là 112.", "The * symbol has the lowest priority; with equal weight the last rule wins; an attribute selector is 10; a:link ~ p#info is 112.",
       ("Bộ chọn có kí tự * có mức ưu tiên cao nhất.", "A selector with the * symbol has the highest priority.", False),
       ("Cùng trọng số thì định dạng ở vị trí cuối cùng được áp dụng.", "With equal specificity the rule in the last position applies.", True),
       ("Bộ chọn kiểu thuộc tính có trọng số bằng 100.", "An attribute selector has specificity 100.", False),
       ("Bộ chọn a:link ~ p#info có trọng số bằng 112.", "The selector a:link ~ p#info has specificity 112.", True)),
    tf("tin12-b17-tf-02", 2, "Xét lớp giả và phần tử giả.", "Consider pseudo-classes and pseudo-elements.",
       "Lớp giả là trạng thái viết sau ':'; phần tử giả là một phần viết sau '::'; :hover là khi di chuột chứ không phải nháy chuột; ::first-line phụ thuộc độ rộng cửa sổ.", "A pseudo-class is a state after ':'; a pseudo-element is a part after '::'; :hover is mouse-over, not click; ::first-line depends on window width.",
       ("Lớp giả mô tả trạng thái đặc biệt của phần tử và viết sau dấu hai chấm.", "A pseudo-class describes a special state of an element and is written after a colon.", True),
       ("Phần tử giả mô tả một phần của phần tử và viết sau hai dấu hai chấm.", "A pseudo-element describes part of an element and is written after a double colon.", True),
       ("Lớp giả :hover áp dụng khi người dùng nháy chuột vào phần tử.", "The :hover pseudo-class applies when the user clicks the element.", False),
       ("Dòng đầu tiên của ::first-line phụ thuộc độ rộng cửa sổ trình duyệt.", "The first line of ::first-line depends on the width of the browser window.", True)),
    tf("tin12-b17-tf-03", 2, "Xét cách tính trọng số.", "Consider how specificity is computed.",
       "Phần tử và phần tử giả là 1; lớp, lớp giả, thuộc tính là 10; id là 100 (không phải 10); #n12 > .test là 110.", "Elements and pseudo-elements are 1; classes, pseudo-classes and attributes are 10; ids are 100 (not 10); #n12 > .test is 110.",
       ("Phần tử và phần tử giả có giá trị trọng số là 1.", "Elements and pseudo-elements are worth 1.", True),
       ("Lớp, lớp giả và thuộc tính có giá trị trọng số là 10.", "Classes, pseudo-classes and attributes are worth 10.", True),
       ("Mã định danh id có giá trị trọng số là 10.", "An id is worth 10.", False),
       ("Bộ chọn #n12 > .test có trọng số 110.", "The selector #n12 > .test has specificity 110.", True)),
    tf("tin12-b17-tf-04", 2, "Cho p:first-child {color: green;} viết trước p {color: red;}. Xét kết quả.", "Given p:first-child {color: green;} written before p {color: red;}. Consider the result.",
       "p:first-child có trọng số 11, p có trọng số 1 nên đoạn p đầu tiên màu xanh lá dù mẫu p viết sau; inline thắng id; !important thắng inline.", "p:first-child weighs 11 and p weighs 1, so the first p is green even though the p rule is later; inline beats id; !important beats inline.",
       ("Đoạn p đầu tiên có chữ xanh lá.", "The first p paragraph has green text.", True),
       ("Đoạn p đầu tiên có chữ đỏ vì mẫu p được viết sau.", "The first p paragraph is red because the p rule is written later.", False),
       ("Thuộc tính style trong thẻ thắng bộ chọn id khi không có !important.", "A style attribute in the tag beats an id selector without !important.", True),
       ("Thuộc tính có !important thắng cả CSS trực tiếp (inline).", "A property with !important beats even inline CSS.", True)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
