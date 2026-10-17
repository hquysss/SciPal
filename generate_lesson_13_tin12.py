# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_13_tin12.py
from generate_tin_common import T, build, configure, mc, tf, web_block

configure(12, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers", "Tin học ứng dụng")

slug = "khai-niem-vai-tro-cua-css-bai-13-tin12"
title_vi = "Bài 13. Khái niệm, vai trò của CSS"
title_en = "Lesson 13. The concept and role of CSS"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


blocks = [
    T(
        """### Mục tiêu bài học

Sau bài này, bạn có thể:

- nêu **CSS** (*Cascading Style Sheets*) là gì và vì sao cần dùng CSS;
- đọc và viết một **mẫu định dạng CSS** gồm bộ chọn và vùng mô tả;
- phân biệt ba cách thiết lập CSS: trong, ngoài và nội tuyến;
- nêu vai trò của CSS trong việc tách nội dung khỏi định dạng.""",
        """### Learning goals

After this lesson, you can:

- say what **CSS** (*Cascading Style Sheets*) is and why we use it;
- read and write a **CSS style rule** made of a selector and a declaration block;
- tell the three ways to add CSS: internal, external and inline;
- state the role of CSS in separating content from formatting.""",
    ),
    T(
        """### 1. Khái niệm mẫu định dạng CSS

Trong một trang web, nhiều phần tử HTML thường được định dạng giống nhau (ví dụ mọi đoạn văn cùng màu chữ). Nếu phải đặt thuộc tính `style` cho từng phần tử thì rất mất công. **CSS** giúp *định nghĩa mẫu một lần, dùng nhiều lần*.

- **CSS** (*Cascading Style Sheets*) là ngôn ngữ định dạng **độc lập với HTML**, dùng để thiết lập các mẫu định dạng cho trang web.
- CSS có cú pháp mô tả riêng, **không phải HTML**.
- Chỉ cần viết mẫu định dạng một lần, nó được áp dụng đồng thời cho tất cả các phần tử được chọn.
- Một mẫu CSS có thể viết trên **nhiều dòng**.""",
        """### 1. The idea of CSS style rules

On a page many HTML elements are often formatted the same way (for example every paragraph has the same text colour). Setting a `style` attribute on each one is tiresome. **CSS** lets you *define a pattern once and use it many times*.

- **CSS** (*Cascading Style Sheets*) is a formatting language **independent of HTML**, used to set style patterns for a web page.
- CSS has its own description syntax; it is **not HTML**.
- Write a style pattern once and it applies to all the chosen elements at the same time.
- A CSS rule may span **several lines**.""",
    ),
    T(
        """### 2a. Cấu trúc của mẫu CSS

Một mẫu định dạng CSS có hai phần:

- **Bộ chọn** (*selector*): quy định những thẻ HTML nào được áp dụng định dạng;
- **Vùng mô tả** (*declaration block*): đặt trong cặp `{ }`, gồm một hay nhiều quy định dạng `thuộc_tính: giá_trị`, các quy định cách nhau bởi dấu **`;`**.

```css
bộ_chọn {
  thuộc_tính_1: giá_trị_1;
  thuộc_tính_2: giá_trị_2;
}
```

Ví dụ:

```css
h1 { color: red; }                         /* 1 quy định, chọn các thẻ h1 */
p  { text-indent: 20px; color: blue; }     /* 2 quy định, chọn các thẻ p */
h1, h2, h3 { color: red; }                 /* chọn đồng thời h1, h2, h3 */
```

Bộ chọn có thể là **một thẻ** hoặc **nhiều thẻ** cách nhau bởi **dấu phẩy**.""",
        """### 2a. Structure of a CSS rule

A CSS style rule has two parts:

- **Selector**: says which HTML tags the formatting applies to;
- **Declaration block**: inside `{ }`, with one or more declarations `property: value`, separated by **`;`**.

```css
selector {
  property_1: value_1;
  property_2: value_2;
}
```

Examples:

```css
h1 { color: red; }                         /* 1 declaration, picks h1 tags */
p  { text-indent: 20px; color: blue; }     /* 2 declarations, picks p tags */
h1, h2, h3 { color: red; }                 /* picks h1, h2 and h3 together */
```

A selector can be **one tag** or **several tags** separated by **commas**.""",
    ),
    web_block(
        sim("Mẫu CSS định dạng một lần cho nhiều phần tử", "One CSS rule formats many elements", "Hai đoạn p cùng nhận một mẫu định dạng; mỗi quy tắc CSS là một bước làm sáng các phần tử được chọn.", "Both p elements receive the same rule; each CSS rule is a step that lights the elements it picks."),
        """<h1>Giới thiệu CSS</h1>
<p>CSS là ngôn ngữ định dạng độc lập với HTML.</p>
<p>Mẫu viết một lần được dùng cho mọi đoạn văn.</p>""",
        """h1 {
  color: red;
}
p {
  text-indent: 20px;
  color: blue;
}""",
        340,
    ),
    web_block(
        sim("Bộ chọn gồm nhiều thẻ", "A selector with several tags", "Ba thẻ tiêu đề cách nhau bởi dấu phẩy nhận cùng khung viền đỏ 2 pixel.", "Three heading tags separated by commas share the same 2 pixel red border."),
        """<h1>Tiêu đề 1</h1>
<h2>Tiêu đề 2</h2>
<h3>Tiêu đề 3</h3>
<p>Đoạn văn không thuộc bộ chọn nên không có khung.</p>""",
        """h1, h2, h3 {
  border: 2px solid red;
}""",
        340,
    ),
    T(
        """### 2b. Ba cách thiết lập CSS

| Cách | Vị trí viết mẫu CSS |
|---|---|
| **CSS trong** (internal) | trong cặp thẻ `<style>…</style>` đặt ở phần `<head>` của trang |
| **CSS ngoài** (external) | trong một **tệp CSS** riêng, bên ngoài tệp HTML |
| **CSS nội tuyến** (inline) | thuộc tính `style` ngay trong thẻ HTML (đã dùng ở các bài trước) |

```html
<head>
  <style>
    h1 { color: red; }
  </style>
</head>
```

**CSS ngoài** viết trong tệp, ví dụ `kieu.css`:

```css
h1 { color: red; }
p  { color: blue; }
```

Có hai cách nối tệp HTML với tệp CSS, đặt trong `<head>`:

```html
<link rel="stylesheet" href="kieu.css">
```

hoặc

```html
<style>
  @import url("kieu.css");
</style>
```

Một tệp CSS có thể áp dụng cho **nhiều trang** (thậm chí cả website), nên định dạng thống nhất và muốn đổi chỉ cần sửa một lần trong tệp CSS.""",
        """### 2b. Three ways to add CSS

| Way | Where the CSS rule is written |
|---|---|
| **Internal CSS** | inside `<style>…</style>` in the page's `<head>` |
| **External CSS** | in a separate **CSS file**, outside the HTML file |
| **Inline CSS** | the `style` attribute right in the HTML tag (used in earlier lessons) |

```html
<head>
  <style>
    h1 { color: red; }
  </style>
</head>
```

**External CSS** is written in a file, for example `kieu.css`:

```css
h1 { color: red; }
p  { color: blue; }
```

There are two ways to link the HTML file to the CSS file, placed in `<head>`:

```html
<link rel="stylesheet" href="kieu.css">
```

or

```html
<style>
  @import url("kieu.css");
</style>
```

One CSS file can serve **many pages** (even a whole website), so formatting stays consistent and changing it takes one edit in the CSS file.""",
    ),
    web_block(
        sim("Một tệp CSS dùng cho nhiều trang", "One CSS file for many pages", "Hai trang giống nhau cùng dùng một bộ quy tắc; bấm Thử sửa, đổi màu trong CSS và cả hai trang đổi theo.", "Two similar pages share one set of rules; press Try editing, change a colour in the CSS and both pages change."),
        """<div>
  <h2>Trang 1: Giới thiệu</h2>
  <p>Đây là nội dung của trang thứ nhất.</p>
</div>
<div>
  <h2>Trang 2: Liên hệ</h2>
  <p>Đây là nội dung của trang thứ hai.</p>
</div>""",
        """/* nội dung tệp kieu.css */
h2 {
  color: darkgreen;
}
p {
  color: gray;
  font-size: 18px;
}""",
        360,
    ),
    T(
        """### 3. Vai trò và ý nghĩa của CSS

- **Nếu không dùng CSS**, muốn định dạng nội dung ta phải đặt thuộc tính cho **từng** phần tử HTML.
- CSS **tách** việc nhập nội dung trang web bằng thẻ HTML và việc định dạng thành **hai công việc độc lập**: giảm nhẹ công việc nhập nội dung và tăng tính chuyên nghiệp của định dạng.
- Mẫu định dạng viết trong **tệp CSS ngoài** có thể kết nối vào bất kì trang nào: định dạng một lần, dùng cho nhiều trang, sửa một lần là đổi hết.
- Ý tưởng giống mẫu *Style Sheet* trong phần mềm soạn thảo văn bản: thiết lập mẫu tại một nơi rồi áp dụng cho nhiều vị trí.""",
        """### 3. Role and meaning of CSS

- **Without CSS**, formatting content means setting attributes on **each** HTML element.
- CSS **separates** entering page content with HTML tags from formatting it into **two independent jobs**: it eases content entry and makes formatting more professional.
- Rules written in an **external CSS file** can be linked to any page: format once, use on many pages, change everything with one edit.
- The idea resembles *Style Sheets* in word processors: set a pattern in one place and apply it in many.""",
    ),
    T(
        """### Tóm tắt và tự kiểm tra

| Nội dung | Ghi nhớ |
|---|---|
| CSS | Cascading Style Sheets, độc lập với HTML |
| Mẫu CSS | `bộ_chọn { thuộc_tính: giá_trị; … }` |
| Nhiều bộ chọn | cách nhau bởi dấu phẩy |
| Ba cách | trong (`<style>`), ngoài (tệp `.css`), nội tuyến (`style`) |
| Nối tệp ngoài | `<link rel="stylesheet" href="…">` hoặc `@import` |
| Vai trò | tách nội dung và định dạng; định dạng một lần dùng nhiều lần |

**Tự kiểm tra:** `h1, h2, h3 { border: 2px solid red; }` áp dụng cho mấy loại thẻ và có mấy quy định? (đáp án: 3 loại thẻ, 1 quy định).""",
        """### Summary and self-check

| Topic | Remember |
|---|---|
| CSS | Cascading Style Sheets, independent of HTML |
| CSS rule | `selector { property: value; … }` |
| Several selectors | separated by commas |
| Three ways | internal (`<style>`), external (`.css` file), inline (`style`) |
| Linking a file | `<link rel="stylesheet" href="…">` or `@import` |
| Role | separate content and formatting; format once, use often |

**Self-check:** how many kinds of tags does `h1, h2, h3 { border: 2px solid red; }` cover, and how many declarations does it have? (answer: 3 kinds of tags, 1 declaration).""",
    ),
]

questions = [
    mc("tin12-b13-mc-01", 1, "Các mẫu định dạng CSS trong (internal CSS) được đặt trong cặp thẻ nào của tệp HTML?", "Inside which pair of tags of the HTML file does internal CSS go?",
       "CSS trong được viết trong cặp thẻ style đặt ở phần head của trang.", "Internal CSS is written inside the style tag placed in the page's head.", "B",
       ("<title></title>", "<title></title>"), ("<style></style>", "<style></style>"), ("<body></body>", "<body></body>"), ("<meta></meta>", "<meta></meta>")),
    mc("tin12-b13-mc-02", 1, "CSS là viết tắt của cụm từ nào?", "What does CSS stand for?",
       "CSS là Cascading Style Sheets, tức các mẫu định dạng.", "CSS is Cascading Style Sheets, a set of style patterns.", "A",
       ("Cascading Style Sheets", "Cascading Style Sheets"), ("Computer Style System", "Computer Style System"), ("Creative Site Syntax", "Creative Site Syntax"), ("Colour and Shape Styles", "Colour and Shape Styles")),
    mc("tin12-b13-mc-03", 1, "Phương án nào sau đây KHÔNG phải một cách thiết lập CSS?", "Which of the following is NOT a way to add CSS?",
       "Ba cách là CSS trong, CSS ngoài và CSS nội tuyến; không có CSS ngoại tuyến.", "The three ways are internal, external and inline CSS; there is no \"offline\" CSS.", "D",
       ("CSS trong", "Internal CSS"), ("CSS ngoài", "External CSS"), ("CSS nội tuyến", "Inline CSS"), ("CSS ngoại tuyến", "Offline CSS")),
    mc("tin12-b13-mc-04", 1, "Vùng mô tả (declaration block) của một mẫu CSS có dạng nào?", "What form does the declaration block of a CSS rule take?",
       "Vùng mô tả đặt trong cặp ngoặc nhọn, mỗi quy định có dạng thuộc tính: giá trị và kết thúc bằng dấu chấm phẩy.", "The declaration block sits in curly braces and each declaration is property: value ending with a semicolon.", "C",
       ("{thuộc tính = giá trị;}", "{property = value;}"), ("{thuộc tính: giá trị,}", "{property: value,}"), ("{thuộc tính: giá trị;}", "{property: value;}"), ("{thuộc tính - giá trị,}", "{property - value,}")),
    mc("tin12-b13-mc-05", 2, "Mẫu CSS nào căn lề giữa cho tất cả các thẻ h1?", "Which CSS rule centres every h1?",
       "Thuộc tính căn lề là text-align; các tên text-index, text-position, text-indent=center đều sai.", "The alignment property is text-align; text-index, text-position and text-indent: center are wrong.", "B",
       ("h1 {text-index: center;}", "h1 {text-index: center;}"), ("h1 {text-align: center;}", "h1 {text-align: center;}"), ("h1 {text-position: center;}", "h1 {text-position: center;}"), ("h1 {text-indent: center;}", "h1 {text-indent: center;}")),
    mc("tin12-b13-mc-06", 2, "Mẫu CSS nào đặt chữ màu nâu và cỡ chữ 12px cho tất cả các thẻ p?", "Which CSS rule gives all p tags brown text at 12px?",
       "Thuộc tính màu chữ là color và cỡ chữ là font-size; font-color và text-size không có.", "The text colour property is color and the size is font-size; font-color and text-size do not exist.", "D",
       ("p {font-color: brown; font-size: 12px;}", "p {font-color: brown; font-size: 12px;}"), ("p {color: brown; text-size: 12px;}", "p {color: brown; text-size: 12px;}"), ("p {text-color: brown; font-size: 12px;}", "p {text-color: brown; font-size: 12px;}"), ("p {color: brown; font-size: 12px;}", "p {color: brown; font-size: 12px;}")),
    mc("tin12-b13-mc-07", 2, "Trong mẫu CSS, bộ chọn (selector) có tác dụng gì?", "In a CSS rule, what does the selector do?",
       "Bộ chọn quy định những thẻ HTML nào được áp dụng định dạng; vùng mô tả quy định định dạng gì.", "The selector says which HTML tags get the formatting; the declaration block says what the formatting is.", "A",
       ("Quy định những thẻ HTML nào được áp dụng định dạng", "Says which HTML tags get the formatting"), ("Quy định giá trị của thuộc tính", "Sets the value of a property"), ("Kết nối tệp HTML với CSS", "Links the HTML file to CSS"), ("Đặt tên cho tệp CSS", "Names the CSS file")),
    mc("tin12-b13-mc-08", 2, "Muốn bộ chọn gồm đồng thời các thẻ h1, h2, h3, các thẻ được viết cách nhau bởi dấu nào?", "To select h1, h2 and h3 together, which sign separates the tags?",
       "Các thẻ trong bộ chọn cách nhau bởi dấu phẩy, ví dụ h1, h2, h3.", "Tags in a selector are separated by commas, e.g. h1, h2, h3.", "C",
       (";", ";"), (".", "."), (",", ","), (":", ":")),
    mc("tin12-b13-mc-09", 2, "Thẻ nào dùng trong phần head để kết nối tệp HTML với tệp CSS ngoài?", "Which tag in head links the HTML file to an external CSS file?",
       "Thẻ link với rel=\"stylesheet\" và href tới tệp CSS dùng để kết nối.", "link with rel=\"stylesheet\" and an href to the CSS file makes the connection.", "D",
       ("<css>", "<css>"), ("<import>", "<import>"), ("<script>", "<script>"), ("<link>", "<link>")),
    mc("tin12-b13-mc-10", 2, "Vai trò quan trọng của CSS đối với trang web là gì?", "What is an important role of CSS for a web page?",
       "CSS tách việc nhập nội dung bằng thẻ HTML và việc định dạng thành hai công việc độc lập.", "CSS separates entering content with HTML tags from formatting into two independent jobs.", "B",
       ("Tạo ra nội dung văn bản cho trang", "Creates the text content of the page"), ("Tách nội dung HTML và định dạng thành hai công việc độc lập", "Separates HTML content and formatting into two independent jobs"), ("Thay thế hoàn toàn HTML", "Replaces HTML entirely"), ("Gửi dữ liệu biểu mẫu lên máy chủ", "Sends form data to the server")),
    mc("tin12-b13-mc-11", 2, "Mẫu CSS nào làm tất cả các đoạn văn p có chữ màu xanh dương (blue)?", "Which CSS rule makes every p paragraph blue?",
       "Bộ chọn p cùng vùng mô tả {color: blue;} áp dụng màu xanh cho mọi đoạn văn.", "Selector p with {color: blue;} makes every paragraph blue.", "C",
       ("p (color: blue;)", "p (color: blue;)"), ("p {blue: color;}", "p {blue: color;}"), ("p {color: blue;}", "p {color: blue;}"), ("color {p: blue;}", "color {p: blue;}")),
    mc("tin12-b13-mc-12", 3, "Mẫu h1, h2, h3 {border: 2px solid red;} áp dụng cho mấy loại thẻ và gồm mấy quy định?", "How many kinds of tags does h1, h2, h3 {border: 2px solid red;} apply to, and how many declarations does it have?",
       "Bộ chọn có ba thẻ h1, h2, h3 và vùng mô tả chỉ có một quy định là border.", "The selector has three tags h1, h2, h3 and the block has only one declaration, border.", "A",
       ("3 loại thẻ, 1 quy định", "3 kinds of tags, 1 declaration"), ("1 loại thẻ, 3 quy định", "1 kind of tag, 3 declarations"), ("3 loại thẻ, 3 quy định", "3 kinds of tags, 3 declarations"), ("1 loại thẻ, 1 quy định", "1 kind of tag, 1 declaration")),
]

truefalse = [
    tf("tin12-b13-tf-01", 2, "Xét khái niệm CSS.", "Consider the concept of CSS.",
       "CSS là ngôn ngữ riêng, độc lập với HTML, giúp tách nội dung với định dạng; mẫu CSS trong viết ở head chứ không ở body.", "CSS is a separate language independent of HTML that separates content from formatting; internal CSS goes in head, not body.",
       ("CSS là ngôn ngữ định dạng độc lập với HTML.", "CSS is a formatting language independent of HTML.", True),
       ("CSS dùng chung một ngôn ngữ mô tả với HTML.", "CSS shares one description language with HTML.", False),
       ("CSS giúp tách việc nhập nội dung bằng thẻ HTML và việc định dạng thành hai công việc độc lập.", "CSS splits entering content with HTML tags and formatting into two independent jobs.", True),
       ("Các mẫu CSS trong được viết trong phần body của trang HTML.", "Internal CSS rules are written in the body of the HTML page.", False)),
    tf("tin12-b13-tf-02", 2, "Xét cấu trúc mẫu CSS.", "Consider the structure of a CSS rule.",
       "Mẫu CSS có bộ chọn và vùng mô tả; các quy định cách nhau bằng dấu chấm phẩy; bộ chọn có thể gồm nhiều thẻ cách nhau bởi dấu phẩy.", "A rule has a selector and a declaration block; declarations are separated by semicolons; a selector may list several tags separated by commas.",
       ("Một mẫu CSS gồm bộ chọn và vùng mô tả.", "A CSS rule consists of a selector and a declaration block.", True),
       ("Các quy định trong vùng mô tả cách nhau bởi dấu chấm phẩy.", "Declarations in the block are separated by semicolons.", True),
       ("Bộ chọn chỉ có thể là đúng một thẻ HTML.", "A selector can only be exactly one HTML tag.", False),
       ("Các thẻ trong bộ chọn nhiều thẻ cách nhau bởi dấu phẩy.", "Tags in a multi-tag selector are separated by commas.", True)),
    tf("tin12-b13-tf-03", 2, "Xét các cách thiết lập CSS.", "Consider the ways of adding CSS.",
       "Có ba cách; CSS ngoài viết trong tệp .css; một tệp CSS dùng cho nhiều trang; nối bằng link hoặc @import.", "There are three ways; external CSS lives in a .css file; one CSS file can serve many pages; link or @import joins it.",
       ("Có ba cách thiết lập CSS: trong, ngoài và nội tuyến.", "There are three ways to add CSS: internal, external and inline.", True),
       ("CSS ngoài được viết trong một tệp CSS riêng, bên ngoài tệp HTML.", "External CSS is written in a separate CSS file outside the HTML file.", True),
       ("Một tệp CSS chỉ áp dụng được cho đúng một trang web.", "A CSS file can apply to exactly one web page only.", False),
       ("Có thể nối tệp CSS bằng thẻ link hoặc lệnh @import trong phần head.", "A CSS file can be linked with the link tag or the @import command in head.", True)),
    tf("tin12-b13-tf-04", 2, "Xét vai trò của CSS.", "Consider the role of CSS.",
       "CSS cho phép định dạng một lần dùng nhiều lần; không dùng CSS thì đặt thuộc tính cho từng phần tử; sửa tệp CSS ngoài là đổi cả website; Style Sheet trong phần mềm soạn thảo có ý tưởng tương tự.", "CSS formats once for many uses; without CSS you set attributes per element; editing the external file changes the whole site; word-processor Style Sheets work on a similar idea.",
       ("CSS cho phép viết mẫu định dạng một lần và dùng nhiều lần.", "CSS lets you write a style pattern once and use it many times.", True),
       ("Khi không dùng CSS, phải thiết lập thuộc tính cho từng phần tử HTML.", "Without CSS, attributes must be set on each HTML element.", True),
       ("Muốn đổi định dạng cả website phải sửa lần lượt từng trang.", "To change the formatting of a whole website, each page must be edited one by one.", False),
       ("Style Sheet trong phần mềm soạn thảo văn bản có ý tưởng giống CSS.", "Style Sheets in word processors share the idea of CSS.", True)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
