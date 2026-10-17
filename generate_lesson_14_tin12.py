# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_14_tin12.py
from generate_tin_common import T, build, configure, mc, tf, web_block

configure(12, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers", "Tin học ứng dụng")

slug = "dinh-dang-van-ban-bang-css-bai-14-tin12"
title_vi = "Bài 14. Định dạng văn bản bằng CSS"
title_en = "Lesson 14. Formatting text with CSS"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


blocks = [
    T(
        """### Mục tiêu bài học

Sau bài này, bạn có thể:

- dùng CSS để định dạng **phông chữ** (`font-family`, `font-size`, `font-style`, `font-weight`), **màu chữ** (`color`) và **dòng văn bản** (`text-align`, `text-indent`, `text-decoration`, `line-height`);
- giải thích **tính kế thừa** của CSS trong cây HTML;
- xác định mẫu nào được áp dụng khi nhiều mẫu cùng chọn một phần tử: thứ tự viết, kí hiệu `*` và `!important`.""",
        """### Learning goals

After this lesson, you can:

- use CSS to format **fonts** (`font-family`, `font-size`, `font-style`, `font-weight`), **text colour** (`color`) and **text lines** (`text-align`, `text-indent`, `text-decoration`, `line-height`);
- explain **inheritance** of CSS in the HTML tree;
- decide which rule applies when several rules select one element: order of writing, the `*` symbol and `!important`.""",
    ),
    T(
        """### 1a. CSS định dạng phông chữ

| Thuộc tính | Ý nghĩa | Ví dụ giá trị |
|---|---|---|
| `font-family` | chọn phông chữ | `"Times New Roman", serif` |
| `font-size` | cỡ chữ | `18px`, `120%`, `large` |
| `font-style` | kiểu chữ | `normal`, `italic` (nghiêng) |
| `font-weight` | độ dày nét chữ | `normal`, `bold`, `100` đến `900` |

**`font-family`** nhận một hoặc một **danh sách** tên phông, trình duyệt thử lần lượt từ trái sang phải. Tên phông có dấu cách phải đặt trong dấu nháy. Phông chia thành năm loại, nên đặt tên loại ở **cuối** danh sách:

| Loại | Đặc điểm |
|---|---|
| `serif` | chữ có chân |
| `sans-serif` | chữ không chân |
| `monospace` | các chữ có chiều rộng đều nhau |
| `cursive` | chữ viết tay |
| `fantasy` | chữ trừu tượng |

**`font-size`** có thể là:

- đơn vị tuyệt đối: `cm`, `mm`, `in` (1 in = 2,54 cm), `px` (1/96 in), `pt` (1/72 in);
- đơn vị tương đối: `em` (so với cỡ chữ hiện thời), `rem` (so với cỡ chữ của phần tử gốc `html`), `ex`;
- tỉ lệ phần trăm `%` của cỡ chữ phần tử cha;
- các mức `xx-small`, `x-small`, `small`, `medium` (mặc định), `large`, `x-large`, `xx-large`.""",
        """### 1a. Formatting fonts with CSS

| Property | Meaning | Example values |
|---|---|---|
| `font-family` | choose the font | `"Times New Roman", serif` |
| `font-size` | font size | `18px`, `120%`, `large` |
| `font-style` | text style | `normal`, `italic` |
| `font-weight` | stroke thickness | `normal`, `bold`, `100` to `900` |

**`font-family`** takes one font or a **list**, and the browser tries them from left to right. A font name with spaces must be quoted. Fonts fall into five kinds, so put the kind **last** in the list:

| Kind | Feature |
|---|---|
| `serif` | letters with serifs |
| `sans-serif` | letters without serifs |
| `monospace` | all letters have the same width |
| `cursive` | handwriting style |
| `fantasy` | decorative style |

**`font-size`** may be:

- an absolute unit: `cm`, `mm`, `in` (1 in = 2.54 cm), `px` (1/96 in), `pt` (1/72 in);
- a relative unit: `em` (relative to the current font size), `rem` (relative to the root `html` font size), `ex`;
- a percentage `%` of the parent's font size;
- the levels `xx-small`, `x-small`, `small`, `medium` (default), `large`, `x-large`, `xx-large`.""",
    ),
    web_block(
        sim("Năm loại phông và các thuộc tính font", "Five kinds of fonts and the font properties", "Mỗi quy tắc CSS làm một dòng đổi phông, cỡ, kiểu hoặc độ đậm.", "Each CSS rule changes the font, size, style or weight of one line."),
        """<p>Phông có chân (serif)</p>
<h3>Phông không chân (sans-serif)</h3>
<h4>Phông đều nét (monospace)</h4>
<h5>Phông viết tay (cursive)</h5>
<h6>Phông trừu tượng (fantasy)</h6>
<div>Chữ nghiêng và đậm</div>""",
        """p {
  font-family: "Times New Roman", serif;
  font-size: 22px;
}
h3 {
  font-family: Arial, sans-serif;
}
h4 {
  font-family: "Courier New", monospace;
}
h5 {
  font-family: cursive;
  font-size: 20px;
}
h6 {
  font-family: fantasy;
  font-size: 20px;
}
div {
  font-style: italic;
  font-weight: bold;
}""",
        420,
    ),
    T(
        """### 1b. Màu chữ và dòng văn bản

- **`color`** đặt màu chữ. Giá trị cơ bản: `black` (đen), `white` (trắng), `purple` (tím), `blue` (xanh dương), `orange` (cam), `red` (đỏ), `green` (xanh lá), `yellow` (vàng), hoặc giá trị RGB.
- Bộ chọn **`*`** nghĩa là *mọi phần tử* của trang.

Định dạng **dòng văn bản**:

| Thuộc tính | Tác dụng | Giá trị thường dùng |
|---|---|---|
| `text-align` | căn lề | `left`, `right`, `center`, `justify` |
| `text-indent` | thụt đầu dòng đầu tiên | `20px`, `2em` |
| `text-decoration` | gạch trang trí (mở rộng của thẻ `<u>`) | `underline`, `overline`, `line-through`, `none` |
| `line-height` | chiều cao dòng | số (ví dụ `1.5`), `em`, `px`, `%` |""",
        """### 1b. Text colour and text lines

- **`color`** sets the text colour. Basic values: `black`, `white`, `purple`, `blue`, `orange`, `red`, `green`, `yellow`, or an RGB value.
- The **`*`** selector means *every element* on the page.

Formatting **text lines**:

| Property | Effect | Common values |
|---|---|---|
| `text-align` | alignment | `left`, `right`, `center`, `justify` |
| `text-indent` | indents the first line | `20px`, `2em` |
| `text-decoration` | decorative line (extends the `<u>` tag) | `underline`, `overline`, `line-through`, `none` |
| `line-height` | height of a line | a number (e.g. `1.5`), `em`, `px`, `%` |""",
    ),
    web_block(
        sim("Màu chữ và định dạng dòng", "Text colour and line formatting", "Mỗi quy tắc CSS chọn một thẻ: tiêu đề căn giữa, đoạn thụt lề và giãn dòng, chữ có gạch.", "Each CSS rule picks one tag: centred heading, an indented and spaced paragraph, decorated text."),
        """<h2>Bài thơ</h2>
<p>Muốn sang thì bắc cầu kiều, muốn con hay chữ phải yêu lấy thầy. Công cha như núi Thái Sơn, nghĩa mẹ như nước trong nguồn chảy ra.</p>
<h4>Chú thích</h4>
<h5>Giá cũ: 100 nghìn</h5>""",
        """h2 {
  color: red;
  text-align: center;
}
p {
  color: darkgreen;
  text-indent: 30px;
  line-height: 1.8;
  text-align: justify;
}
h4 {
  text-decoration: underline;
}
h5 {
  text-decoration: line-through;
  color: gray;
}""",
        420,
    ),
    T(
        """### 2a. Tính kế thừa của CSS

Nếu một mẫu CSS áp dụng cho một phần tử, nó **tự động áp dụng cho các phần tử con, cháu** của phần tử đó trong cây HTML (trừ trường hợp phần tử con có mẫu định dạng riêng).

Ví dụ: `body { color: blue; }` làm mọi phần tử trong `<body>` có chữ xanh. Nếu thêm `h1 { color: red; }` thì chỉ `h1` đổi sang đỏ, còn `h2`, `p` vẫn **kế thừa** màu xanh từ `body`.""",
        """### 2a. Inheritance in CSS

If a CSS rule applies to an element, it **automatically applies to the children and grandchildren** of that element in the HTML tree (unless a child has a rule of its own).

Example: `body { color: blue; }` makes all text inside `<body>` blue. If you add `h1 { color: red; }`, only `h1` turns red, while `h2` and `p` still **inherit** blue from `body`.""",
    ),
    web_block(
        sim("Kế thừa từ phần tử cha", "Inheriting from the parent", "Quy tắc body làm chữ xanh cho cả trang; quy tắc h1 chỉ ghi đè riêng tiêu đề h1.", "The body rule makes the whole page blue; the h1 rule overrides only the h1 heading."),
        """<h1>Tiêu đề h1 (màu riêng)</h1>
<h2>Tiêu đề h2 (kế thừa)</h2>
<p>Đoạn văn p cũng kế thừa màu từ body.</p>""",
        """body {
  color: blue;
}
h1 {
  color: red;
}""",
        320,
    ),
    T(
        """### 2b. Thứ tự ưu tiên khi nhiều mẫu cùng chọn một phần tử

- Khi nhiều mẫu CSS có cùng bộ chọn cùng áp dụng cho một phần tử, mẫu **viết sau cùng** được thực hiện.
- Bộ chọn **`*`** áp dụng cho mọi phần tử chưa có trong mẫu nào khác; mức ưu tiên của nó **thấp nhất**, dù viết ở vị trí cuối.
- Kí hiệu **`!important`**, viết ngay sau giá trị của thuộc tính, làm thuộc tính đó có mức ưu tiên **cao nhất**, không phụ thuộc vị trí viết. Chỉ thuộc tính được đánh dấu mới có ưu tiên này.

```css
h1 { text-align: center !important; }
h1 { text-align: left; color: red; }
* { color: green; text-align: right; }
```

Với thẻ `h1`: `text-align` là **center** (nhờ `!important`), `color` là **red** (mẫu `h1` thắng `*`). Các thẻ khác như `p` chỉ khớp `*` nên màu xanh lá và căn phải.""",
        """### 2b. Priority when several rules select one element

- When several CSS rules with the same selector apply to an element, the rule **written last** takes effect.
- The **`*`** selector applies to every element not already in another rule; its priority is **the lowest**, even if written last.
- The **`!important`** symbol, written right after a property's value, gives that property **the highest** priority regardless of position. Only the marked property gets it.

```css
h1 { text-align: center !important; }
h1 { text-align: left; color: red; }
* { color: green; text-align: right; }
```

For an `h1`: `text-align` is **center** (thanks to `!important`), `color` is **red** (the `h1` rule beats `*`). Other tags such as `p` only match `*`, so they are green and right-aligned.""",
    ),
    web_block(
        sim("Viết sau thắng, ! important và dấu *", "Last wins, !important and *", "Hai mẫu h1: mẫu sau căn trái nhưng !important giữ căn giữa; mẫu * có ưu tiên thấp nhất.", "Two h1 rules: the later one aligns left but !important keeps it centred; the * rule has the lowest priority."),
        """<h1>Tiêu đề h1</h1>
<p>Đoạn văn p chỉ khớp bộ chọn *.</p>
<h2>Tiêu đề h2 cũng chỉ khớp *</h2>""",
        """h1 {
  text-align: center !important;
}
h1 {
  text-align: left;
  color: red;
}
* {
  color: green;
  text-align: right;
}""",
        340,
    ),
    T(
        """### Tóm tắt và tự kiểm tra

| Nội dung | Ghi nhớ |
|---|---|
| Phông | `font-family` (5 loại), `font-size`, `font-style`, `font-weight` |
| Màu chữ | `color` |
| Dòng văn bản | `text-align`, `text-indent`, `text-decoration`, `line-height` |
| Kế thừa | mẫu của phần tử cha áp dụng cho con, cháu |
| Cùng bộ chọn | mẫu viết **sau cùng** thắng |
| `*` | mọi phần tử, ưu tiên **thấp nhất** |
| `!important` | thuộc tính có ưu tiên **cao nhất** |

**Tự kiểm tra:** với `body {color: blue;} h1 {color: red;}`, các thẻ `h1`, `h2`, `p` có màu gì? (đáp án: h1 đỏ; h2 và p xanh dương nhờ kế thừa).""",
        """### Summary and self-check

| Topic | Remember |
|---|---|
| Fonts | `font-family` (5 kinds), `font-size`, `font-style`, `font-weight` |
| Text colour | `color` |
| Text lines | `text-align`, `text-indent`, `text-decoration`, `line-height` |
| Inheritance | a parent's rule applies to children and grandchildren |
| Same selector | the rule **written last** wins |
| `*` | every element, **lowest** priority |
| `!important` | that property gets **highest** priority |

**Self-check:** with `body {color: blue;} h1 {color: red;}`, what colour are `h1`, `h2` and `p`? (answer: h1 is red; h2 and p are blue by inheritance).""",
    ),
]

questions = [
    mc("tin12-b14-mc-01", 1, "Thuộc tính CSS nào dùng để chọn phông chữ?", "Which CSS property chooses the font?",
       "font-family chọn phông; font-size là cỡ, font-style là kiểu, font-weight là độ dày nét chữ.", "font-family chooses the font; font-size is the size, font-style the style, font-weight the thickness.", "A",
       ("font-family", "font-family"), ("font-style", "font-style"), ("font-weight", "font-weight"), ("font-size", "font-size")),
    mc("tin12-b14-mc-02", 1, "Để thiết lập kiểu chữ nghiêng, em dùng thuộc tính CSS nào?", "Which CSS property sets italic text?",
       "font-style: italic cho chữ nghiêng.", "font-style: italic gives italic text.", "D",
       ("font-size", "font-size"), ("font-weight", "font-weight"), ("font-family", "font-family"), ("font-style", "font-style")),
    mc("tin12-b14-mc-03", 1, "Thuộc tính CSS nào đặt màu chữ?", "Which CSS property sets the text colour?",
       "Màu chữ được đặt bằng thuộc tính color.", "Text colour is set with the color property.", "B",
       ("text-color", "text-color"), ("color", "color"), ("font-color", "font-color"), ("text-style", "text-style")),
    mc("tin12-b14-mc-04", 1, "Loại phông nào là phông chữ không chân?", "Which kind of font has no serifs?",
       "sans-serif là chữ không chân; serif là chữ có chân.", "sans-serif has no serifs; serif has them.", "C",
       ("serif", "serif"), ("monospace", "monospace"), ("sans-serif", "sans-serif"), ("cursive", "cursive")),
    mc("tin12-b14-mc-05", 2, "Mẫu CSS nào đặt phông Courier cho mọi phần tử của trang?", "Which CSS rule sets the Courier font for every element on the page?",
       "Bộ chọn * chọn mọi phần tử và font-family là thuộc tính chọn phông.", "The * selector picks every element and font-family is the font property.", "A",
       ("* {font-family: Courier;}", "* {font-family: Courier;}"), ("all {font-style: Courier;}", "all {font-style: Courier;}"), ("* {font-weight: Courier;}", "* {font-weight: Courier;}"), ("font {family: Courier;}", "font {family: Courier;}")),
    mc("tin12-b14-mc-06", 2, "Khi tên phông chữ có chứa dấu cách (ví dụ Times New Roman) thì cần làm gì?", "What must you do when a font name contains spaces (e.g. Times New Roman)?",
       "Tên phông có dấu cách phải đặt trong dấu nháy kép hoặc nháy đơn.", "A font name with spaces must be put in double or single quotes.", "C",
       ("Đặt trong dấu ngoặc đơn ( )", "Put it in parentheses ( )"), ("Đặt trong dấu ngoặc vuông [ ]", "Put it in square brackets [ ]"), ("Đặt trong dấu nháy kép hoặc nháy đơn", "Put it in double or single quotes"), ("Đặt trong dấu < >", "Put it in < >")),
    mc("tin12-b14-mc-07", 2, "Cỡ chữ mặc định trong CSS là mức nào?", "What is the default font-size level in CSS?",
       "Trong các mức cỡ chữ theo tên, mức mặc định là medium.", "Among the named size levels, the default is medium.", "B",
       ("small", "small"), ("medium", "medium"), ("large", "large"), ("x-large", "x-large")),
    mc("tin12-b14-mc-08", 2, "Nhiều mẫu CSS có cùng bộ chọn cùng áp dụng cho một phần tử. Mẫu nào được thực hiện?", "Several CSS rules with the same selector apply to one element. Which one takes effect?",
       "Theo thứ tự ưu tiên, mẫu được viết sau cùng sẽ được thực hiện.", "By priority order, the rule written last takes effect.", "D",
       ("Mẫu viết đầu tiên", "The first rule written"), ("Mẫu dài nhất", "The longest rule"), ("Mẫu ngắn nhất", "The shortest rule"), ("Mẫu viết sau cùng", "The rule written last")),
    mc("tin12-b14-mc-09", 2, "Kí hiệu !important đặt sau một thuộc tính có tác dụng gì?", "What does !important after a property do?",
       "!important cho thuộc tính đó mức ưu tiên cao nhất, không phụ thuộc vị trí của mẫu trong CSS.", "!important gives that property the highest priority regardless of the rule's position in the CSS.", "A",
       ("Thuộc tính đó có ưu tiên cao nhất, không phụ thuộc vị trí", "That property gets the highest priority regardless of position"), ("Thuộc tính đó bị bỏ qua", "That property is ignored"), ("Thuộc tính đó chỉ dùng cho thẻ h1", "That property is used for h1 only"), ("Thuộc tính đó có ưu tiên thấp nhất", "That property gets the lowest priority")),
    mc("tin12-b14-mc-10", 2, "Mẫu CSS có bộ chọn * có mức ưu tiên như thế nào so với các mẫu khác?", "How does the priority of a rule with the * selector compare to other rules?",
       "Bộ chọn * áp dụng cho mọi phần tử chưa có mẫu khác và có mức ưu tiên thấp nhất.", "The * selector applies to elements not in other rules and has the lowest priority.", "B",
       ("Cao nhất", "The highest"), ("Thấp nhất", "The lowest"), ("Bằng !important", "Equal to !important"), ("Phụ thuộc vị trí, luôn cao hơn h1", "Depends on position, always above h1")),
    mc("tin12-b14-mc-11", 2, "Thuộc tính CSS nào dùng để căn lề trái, phải hoặc giữa cho văn bản?", "Which CSS property aligns text left, right or centre?",
       "text-align nhận left, right, center hoặc justify.", "text-align takes left, right, center or justify.", "D",
       ("text-indent", "text-indent"), ("text-decoration", "text-decoration"), ("line-height", "line-height"), ("text-align", "text-align")),
    mc("tin12-b14-mc-12", 3, "Với body {color: blue;} và h1 {color: red;}, trong ba phần tử h1, h2, p có bao nhiêu phần tử hiển thị chữ xanh dương?", "With body {color: blue;} and h1 {color: red;}, how many of the three elements h1, h2, p show blue text?",
       "h1 có mẫu riêng nên đỏ; h2 và p kế thừa xanh dương từ body, tức 2 phần tử.", "h1 has its own rule so it is red; h2 and p inherit blue from body, so 2 elements.", "C",
       ("0", "0"), ("1", "1"), ("2", "2"), ("3", "3")),
]

truefalse = [
    tf("tin12-b14-tf-01", 2, "Xét kế thừa và thứ tự ưu tiên.", "Consider inheritance and priority.",
       "Mẫu của phần tử cha áp dụng cho con, cháu; mẫu viết sau thắng; * có ưu tiên thấp nhất; !important cao nhất.", "A parent's rule applies to children; the later rule wins; * is lowest; !important is highest.",
       ("Mẫu CSS áp dụng cho một phần tử cũng áp dụng cho các phần tử con, cháu của nó (trừ ngoại lệ).", "A CSS rule for an element also applies to its children and grandchildren (with exceptions).", True),
       ("Nhiều mẫu cùng bộ chọn thì mẫu viết đầu tiên được áp dụng.", "With several rules of one selector, the first one written applies.", False),
       ("Mức ưu tiên của bộ chọn * là cao nhất.", "The priority of the * selector is the highest.", False),
       ("Thuộc tính có !important có mức ưu tiên cao nhất.", "A property with !important has the highest priority.", True)),
    tf("tin12-b14-tf-02", 2, "Xét định dạng phông chữ.", "Consider font formatting.",
       "font-family là danh sách thử từ trái sang phải; tên có dấu cách phải để trong nháy; mặc định medium; px, cm tuyệt đối còn em, rem tương đối.", "font-family is a list tried left to right; names with spaces need quotes; the default is medium; px and cm are absolute while em and rem are relative.",
       ("font-family có thể là một danh sách phông, trình duyệt thử lần lượt từ trái sang phải.", "font-family can be a list of fonts that the browser tries from left to right.", True),
       ("Tên phông chữ có dấu cách phải đặt trong dấu nháy.", "A font name with spaces must be quoted.", True),
       ("Cỡ chữ mặc định theo tên là large.", "The default named font size is large.", False),
       ("px và cm là đơn vị tuyệt đối còn em và rem là đơn vị tương đối.", "px and cm are absolute units while em and rem are relative units.", True)),
    tf("tin12-b14-tf-03", 2, "Xét màu chữ và dòng văn bản.", "Consider text colour and text lines.",
       "color là màu chữ; text-align: center căn giữa; underline gạch chân; line-height là chiều cao dòng chứ không phải độ rộng chữ.", "color is the text colour; text-align: center centres; underline underlines; line-height is the height of a line, not the width of letters.",
       ("Thuộc tính color đặt màu chữ.", "The color property sets the text colour.", True),
       ("text-align: center căn giữa văn bản.", "text-align: center centres the text.", True),
       ("text-decoration: underline gạch chân văn bản.", "text-decoration: underline underlines the text.", True),
       ("line-height quy định độ rộng của mỗi chữ cái.", "line-height sets the width of each letter.", False)),
    tf("tin12-b14-tf-04", 2, "Cho CSS: body {color: blue;} h1 {color: red;} và sau đó h1 {color: green;}. Xét kết quả.", "Given CSS: body {color: blue;} h1 {color: red;} and then h1 {color: green;}. Consider the result.",
       "Mẫu h1 viết sau cùng (green) thắng nên h1 xanh lá; h2 và p kế thừa xanh dương từ body.", "The h1 rule written last (green) wins so h1 is green; h2 and p inherit blue from body.",
       ("Thẻ h1 hiển thị chữ màu xanh lá.", "The h1 tag is shown in green.", True),
       ("Thẻ h2 kế thừa chữ xanh dương từ body.", "The h2 tag inherits blue from body.", True),
       ("Thẻ p không kế thừa được màu từ body.", "The p tag cannot inherit a colour from body.", False),
       ("Thẻ h1 hiển thị chữ màu đỏ vì mẫu đỏ viết trước.", "The h1 tag is red because the red rule was written first.", False)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
