# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_15_tin12.py
from generate_tin_common import T, build, configure, mc, tf, web_block

configure(12, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers", "Tin học ứng dụng")

slug = "tao-mau-cho-chu-va-nen-bai-15-tin12"
title_vi = "Bài 15. Tạo màu cho chữ và nền"
title_en = "Lesson 15. Colouring text and backgrounds"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


blocks = [
    T(
        """### Mục tiêu bài học

Sau bài này, bạn có thể:

- biểu diễn màu trong CSS bằng hệ **RGB** (`rgb()`, mã `#rrggbb`), hệ **HSL** (`hsl()`) và **tên màu** có sẵn;
- đặt màu chữ (`color`), màu nền (`background-color`) và khung viền (`border`) cho phần tử;
- dùng các bộ chọn tổ hợp **`E F`**, **`E > F`**, **`E + F`**, **`E ~ F`**;
- thiết kế một trang có màu sắc đọc rõ, nhất quán.""",
        """### Learning goals

After this lesson, you can:

- express colours in CSS with **RGB** (`rgb()`, `#rrggbb`), **HSL** (`hsl()`) and built-in **colour names**;
- set text colour (`color`), background colour (`background-color`) and border (`border`) on an element;
- use the combinator selectors **`E F`**, **`E > F`**, **`E + F`** and **`E ~ F`**;
- design a page with readable, consistent colours.""",
    ),
    T(
        """### 1a. Hệ màu RGB

Hệ **RGB** (Red – Green – Blue) dựa trên nguyên lí **tổng hợp ánh sáng**: ba màu đỏ, xanh lá, xanh dương trộn theo tỉ lệ khác nhau tạo ra màu khác.

- Mỗi màu là bộ ba `(r, g, b)`, mỗi giá trị là số nguyên từ **0 đến 255** (8 bit).
- Tổng số màu: 2⁸ × 2⁸ × 2⁸ = 2²⁴ = **16 777 216** màu.

Ba cách viết:

| Cách | Ví dụ (màu xám) |
|---|---|
| `rgb(r, g, b)` | `rgb(128, 128, 128)` |
| `rgb(r%, g%, b%)` | `rgb(50%, 50%, 50%)` |
| `#rrggbb` (hệ đếm 16) | `#808080` |

Trắng: `rgb(255,255,255)` = `#ffffff`. Đen: `rgb(0,0,0)` = `#000000`. Các màu **xám** (đen – trắng) có `r = g = b`; có 256 màu như vậy.""",
        """### 1a. The RGB colour system

**RGB** (Red – Green – Blue) works by **adding light**: red, green and blue mixed in different proportions create other colours.

- Each colour is a triple `(r, g, b)`, each value an integer from **0 to 255** (8 bits).
- Total colours: 2⁸ × 2⁸ × 2⁸ = 2²⁴ = **16,777,216**.

Three ways to write it:

| Way | Example (grey) |
|---|---|
| `rgb(r, g, b)` | `rgb(128, 128, 128)` |
| `rgb(r%, g%, b%)` | `rgb(50%, 50%, 50%)` |
| `#rrggbb` (base 16) | `#808080` |

White: `rgb(255,255,255)` = `#ffffff`. Black: `rgb(0,0,0)` = `#000000`. **Grey** shades (black–white) have `r = g = b`; there are 256 of them.""",
    ),
    T(
        """### 1b. Hệ màu HSL và tên màu

**HSL** mô tả màu theo cách con người cảm nhận, bằng ba thông số `hsl(hue, saturation, lightness)`:

- **H** (Hue – màu sắc): vị trí trên vòng tròn màu, từ **0 đến 360**; 0 là đỏ, 120 là xanh lá, 240 là xanh dương;
- **S** (Saturation – độ bão hoà): 0% – 100%; 0% chỉ còn **xám**, 100% là màu đầy đủ;
- **L** (Lightness – độ sáng): 0% – 100%; 0% là **đen**, 100% là **trắng**, đặt **50%** để có màu đúng.

Các màu cơ bản: red `hsl(0,100%,50%)`, yellow `hsl(60,100%,50%)`, green `hsl(120,100%,50%)`, cyan `hsl(180,100%,50%)`, blue `hsl(240,100%,50%)`, magenta `hsl(300,100%,50%)`.

**Tên màu có sẵn:** CSS2 có 16 tên màu chuẩn (CSS2.1 thêm `orange`, thành 17), ví dụ `black`, `gray`, `white`, `red`, `green`, `purple`, `blue`, `lime`; CSS3 có **140** tên màu. Tên màu không phân biệt chữ hoa, chữ thường.""",
        """### 1b. The HSL system and colour names

**HSL** describes colour the way people perceive it, with three values `hsl(hue, saturation, lightness)`:

- **H** (Hue): a position on the colour wheel, **0 to 360**; 0 is red, 120 is green, 240 is blue;
- **S** (Saturation): 0% – 100%; 0% leaves only **grey**, 100% is the full colour;
- **L** (Lightness): 0% – 100%; 0% is **black**, 100% is **white**, use **50%** for the true colour.

Basic colours: red `hsl(0,100%,50%)`, yellow `hsl(60,100%,50%)`, green `hsl(120,100%,50%)`, cyan `hsl(180,100%,50%)`, blue `hsl(240,100%,50%)`, magenta `hsl(300,100%,50%)`.

**Built-in colour names:** CSS2 defines 16 standard names (CSS2.1 adds `orange`, making 17), e.g. `black`, `gray`, `white`, `red`, `green`, `purple`, `blue`, `lime`; CSS3 has **140** names. Colour names are not case-sensitive.""",
    ),
    web_block(
        sim("Bốn cách viết cùng một màu tím", "Four ways to write one purple", "Bốn tiêu đề dùng rgb, mã hex, hsl và tên màu nhưng cho ra cùng một màu.", "Four headings use rgb, hex, hsl and a colour name but give the same colour."),
        """<h2>rgb(128, 0, 128)</h2>
<h3>#800080</h3>
<h4>hsl(300, 100%, 25%)</h4>
<h5>purple</h5>""",
        """h2 {
  color: rgb(128, 0, 128);
}
h3 {
  color: #800080;
}
h4 {
  color: hsl(300, 100%, 25%);
}
h5 {
  color: purple;
}""",
        300,
    ),
    web_block(
        sim("Vòng tròn màu HSL", "The HSL colour wheel", "Mỗi dải màu dùng một giá trị hue khác nhau (0, 60, 120, 180, 240, 300), độ bão hoà 100%, độ sáng 50%.", "Each band uses a different hue (0, 60, 120, 180, 240, 300) with 100% saturation and 50% lightness."),
        """<div style="background-color: hsl(0, 100%, 50%)">hsl(0, 100%, 50%) – đỏ</div>
<div style="background-color: hsl(60, 100%, 50%)">hsl(60, 100%, 50%) – vàng</div>
<div style="background-color: hsl(120, 100%, 50%)">hsl(120, 100%, 50%) – xanh lá</div>
<div style="background-color: hsl(180, 100%, 50%)">hsl(180, 100%, 50%) – lục lam</div>
<div style="background-color: hsl(240, 100%, 50%)">hsl(240, 100%, 50%) – xanh dương</div>
<div style="background-color: hsl(300, 100%, 50%)">hsl(300, 100%, 50%) – tím hồng</div>""",
        """div {
  padding: 6px;
  font-weight: bold;
}""",
        340,
    ),
    T(
        """### 2. Màu chữ, màu nền, màu khung viền

| Thuộc tính | Tác dụng |
|---|---|
| `color` | màu chữ |
| `background-color` | màu nền của phần tử |
| `border` | khung viền: `độ dày kiểu màu`, ví dụ `2px solid red` |

```css
h1 { color: white; background-color: navy; border: 3px solid orange; }
```

**Lưu ý về kế thừa:** `color` và `background-color` có kế thừa theo cây HTML, riêng **`border` thì không kế thừa**: phần tử con không tự có khung viền của phần tử cha.""",
        """### 2. Text, background and border colours

| Property | Effect |
|---|---|
| `color` | text colour |
| `background-color` | background colour of the element |
| `border` | the border: `thickness style colour`, e.g. `2px solid red` |

```css
h1 { color: white; background-color: navy; border: 3px solid orange; }
```

**Note on inheritance:** `color` and `background-color` follow inheritance in the HTML tree, but **`border` is not inherited**: a child does not get its parent's border by itself.""",
    ),
    web_block(
        sim("Màu chữ, màu nền và khung viền", "Text, background and border colours", "Tiêu đề có chữ trắng nền xanh đậm; em có nền vàng và viền đỏ riêng; viền của p không truyền xuống em.", "The heading has white text on navy; em has its own yellow background and red border; p's border is not passed to em."),
        """<h1>Lịch sử HTML</h1>
<p>Người phát minh ra Web là <em>Tim Berners-Lee</em>, làm việc tại CERN.</p>""",
        """h1 {
  color: white;
  background-color: navy;
  border: 3px solid orange;
}
p {
  color: darkgreen;
  border: 1px solid gray;
}
em {
  background-color: yellow;
  border: 2px dashed red;
}""",
        300,
    ),
    T(
        """### 3. Bộ chọn là tổ hợp các phần tử có quan hệ

| Bộ chọn | Quan hệ | Áp dụng cho |
|---|---|---|
| `E F` | con cháu | mọi `F` nằm trong `E` (con hoặc cháu, ở bất kì mức nào) |
| `E > F` | cha – con trực tiếp | `F` là **con trực tiếp** của `E` |
| `E + F` | anh em liền kề | `F` **ngay sau** `E`, cùng cha |
| `E ~ F` | anh em | mọi `F` đứng **sau** `E` và cùng cha, không cần liền kề |

Ví dụ: `div p {color: blue;}` chỉ tô xanh các `p` nằm trong `div`; `p > em {color: red;}` chỉ tô đỏ `em` là con trực tiếp của `p`, không tô `em` nằm trong `strong` của `p`.

Khi `F` là con trực tiếp của `E` thì `E F` và `E > F` có tác dụng như nhau.""",
        """### 3. Selectors that combine related elements

| Selector | Relation | Applies to |
|---|---|---|
| `E F` | descendant | every `F` inside `E` (child or deeper, at any level) |
| `E > F` | direct parent–child | an `F` that is a **direct child** of `E` |
| `E + F` | adjacent sibling | the `F` **right after** `E`, same parent |
| `E ~ F` | sibling | every `F` coming **after** `E` with the same parent, not necessarily adjacent |

Example: `div p {color: blue;}` colours only the `p` inside a `div`; `p > em {color: red;}` colours only an `em` that is a direct child of `p`, not an `em` inside a `strong` in the `p`.

When `F` is a direct child of `E`, `E F` and `E > F` have the same effect.""",
    ),
    web_block(
        sim("Bộ chọn E F và E > F", "The selectors E F and E > F", "div p chỉ tô xanh đoạn nằm trong div; p > em chỉ tô đỏ em là con trực tiếp của p.", "div p turns blue only the paragraph inside the div; p > em turns red only the em that is a direct child of p."),
        """<div>
  <p>Đoạn này nằm trong div.</p>
</div>
<p>Đoạn này nằm ngoài div.</p>
<p>Có <strong>strong chứa <em>em là cháu</em></strong> và <em>em là con trực tiếp</em> của p.</p>""",
        """div p {
  color: blue;
}
p > em {
  color: red;
}""",
        340,
    ),
    web_block(
        sim("Bộ chọn E + F và E ~ F", "The selectors E + F and E ~ F", "em + strong chỉ tô đỏ strong liền sau em; em ~ strong tô nền vàng mọi strong đứng sau em.", "em + strong turns red only the strong right after em; em ~ strong gives a yellow background to every strong after em."),
        """<p><strong>strong đứng trước em</strong> <em>em</em> <strong>strong liền sau em</strong> <i>i</i> <strong>strong sau i</strong></p>""",
        """em + strong {
  color: red;
}
em ~ strong {
  background-color: yellow;
}""",
        260,
    ),
    T(
        """### 4. Thực hành: trang “Lợi ích của CSS”

1. Nhập văn bản thành tệp HTML: bốn ý chính trong `<ul><li>`, câu đầu mỗi ý dùng `<strong>`, các cụm từ cần nhấn mạnh dùng `<em>`.
2. Viết yêu cầu trình bày: tiêu đề chữ đỏ; danh sách có chiều cao dòng 1,5; `strong` màu xanh đậm; `em` màu đỏ, chữ nghiêng.
3. Viết các mẫu CSS tương ứng:

```css
h1 { color: red; }
ul { line-height: 1.5; }
li > strong { color: darkblue; }
li em { color: red; font-style: italic; }
```

Chọn màu chữ tương phản với màu nền để dễ đọc, và dùng cùng một bộ màu cho cả trang.""",
        """### 4. Practice: a “Benefits of CSS” page

1. Type the text into an HTML file: four main ideas in `<ul><li>`, the first sentence of each in `<strong>`, key phrases in `<em>`.
2. Write the layout requirements: red title; list with line height 1.5; `strong` dark blue; `em` red and italic.
3. Write the matching CSS rules:

```css
h1 { color: red; }
ul { line-height: 1.5; }
li > strong { color: darkblue; }
li em { color: red; font-style: italic; }
```

Pick text colours that contrast with the background so the page is easy to read, and use one palette across the page.""",
    ),
    web_block(
        sim("Trang Lợi ích của CSS", "The Benefits of CSS page", "Bộ chọn li > strong và li em làm khác màu hai loại nhấn mạnh trong danh sách.", "The selectors li > strong and li em colour the two kinds of emphasis in the list differently."),
        """<h1>Lợi ích của CSS</h1>
<ul>
  <li><strong>Định dạng nhanh.</strong> Viết một lần, <em>áp dụng nhiều lần</em>.</li>
  <li><strong>Thống nhất.</strong> Cả website dùng <em>chung một tệp</em>.</li>
  <li><strong>Dễ sửa.</strong> Đổi màu chỉ cần sửa <em>một chỗ</em>.</li>
  <li><strong>Gọn mã.</strong> Tách <em>nội dung</em> khỏi định dạng.</li>
</ul>""",
        """h1 {
  color: red;
}
ul {
  line-height: 1.5;
}
li > strong {
  color: darkblue;
}
li em {
  color: red;
  font-style: italic;
}""",
        380,
    ),
    T(
        """### Tóm tắt và tự kiểm tra

| Nội dung | Ghi nhớ |
|---|---|
| RGB | `rgb(r,g,b)`, 0–255, `#rrggbb`; 16 777 216 màu; xám khi `r = g = b` |
| HSL | `hsl(hue, saturation, lightness)`; S = 0% là xám; L = 100% là trắng |
| Tên màu | CSS3 có 140 tên |
| Thuộc tính màu | `color`, `background-color`, `border` (`border` không kế thừa) |
| `E F` | con cháu |
| `E > F` | con trực tiếp |
| `E + F` | anh em liền kề |
| `E ~ F` | anh em đứng sau |

**Tự kiểm tra:** `em ~ strong` áp dụng cho `strong` nào trong `<p><strong>1</strong><em>E</em><strong>2</strong><i>x</i><strong>3</strong></p>`? (đáp án: `strong` 2 và `strong` 3).""",
        """### Summary and self-check

| Topic | Remember |
|---|---|
| RGB | `rgb(r,g,b)`, 0–255, `#rrggbb`; 16,777,216 colours; grey when `r = g = b` |
| HSL | `hsl(hue, saturation, lightness)`; S = 0% is grey; L = 100% is white |
| Colour names | CSS3 has 140 names |
| Colour properties | `color`, `background-color`, `border` (`border` is not inherited) |
| `E F` | descendant |
| `E > F` | direct child |
| `E + F` | adjacent sibling |
| `E ~ F` | later siblings |

**Self-check:** which `strong` does `em ~ strong` apply to in `<p><strong>1</strong><em>E</em><strong>2</strong><i>x</i><strong>3</strong></p>`? (answer: `strong` 2 and `strong` 3).""",
    ),
]

questions = [
    mc("tin12-b15-mc-01", 1, "Trong hệ màu RGB, mỗi giá trị r, g, b là số nguyên trong khoảng nào?", "In RGB, each of the values r, g, b is an integer in which range?",
       "Mỗi giá trị là một số 8 bit nên nằm trong khoảng từ 0 đến 255.", "Each value is an 8-bit number, so it lies from 0 to 255.", "A",
       ("0 đến 255", "0 to 255"), ("0 đến 100", "0 to 100"), ("1 đến 256", "1 to 256"), ("0 đến 360", "0 to 360")),
    mc("tin12-b15-mc-02", 1, "Thuộc tính CSS nào đặt màu nền cho phần tử?", "Which CSS property sets the background colour of an element?",
       "Màu nền được đặt bằng background-color; color là màu chữ.", "Background colour is set with background-color; color is the text colour.", "C",
       ("bgcolor", "bgcolor"), ("color", "color"), ("background-color", "background-color"), ("fill-color", "fill-color")),
    mc("tin12-b15-mc-03", 1, "Để định dạng khung viền (độ dày, kiểu, màu) quanh phần tử, em dùng thuộc tính nào?", "Which property formats the border (thickness, style, colour) around an element?",
       "Khung viền được định dạng bằng thuộc tính border.", "The border is formatted with the border property.", "D",
       ("background-color", "background-color"), ("color", "color"), ("bgcolor", "bgcolor"), ("border", "border")),
    mc("tin12-b15-mc-04", 1, "Giá trị nào biểu diễn màu đen trong hệ RGB?", "Which value represents black in RGB?",
       "Màu đen có r = g = b = 0, tức #000000; #ffffff là trắng.", "Black has r = g = b = 0, i.e. #000000; #ffffff is white.", "B",
       ("#ffffff", "#ffffff"), ("#000000", "#000000"), ("rgb(255,255,255)", "rgb(255,255,255)"), ("rgb(100%,100%,100%)", "rgb(100%,100%,100%)")),
    mc("tin12-b15-mc-05", 2, "Trong hsl(hue, saturation, lightness), tham số hue biểu thị điều gì?", "In hsl(hue, saturation, lightness), what does hue represent?",
       "Hue là màu sắc, vị trí trên vòng tròn màu từ 0 đến 360.", "Hue is the colour itself, a position on the colour wheel from 0 to 360.", "A",
       ("Màu sắc trên vòng tròn màu", "The colour on the colour wheel"), ("Độ bão hoà", "The saturation"), ("Độ sáng", "The lightness"), ("Độ trong suốt", "The transparency")),
    mc("tin12-b15-mc-06", 2, "Trong hệ màu HSL, khi độ bão hoà (saturation) bằng 0% thì kết quả là gì?", "In HSL, what is the result when saturation is 0%?",
       "Độ bão hoà 0% làm màu biến mất và chỉ còn màu xám.", "0% saturation removes the colour and leaves only grey.", "C",
       ("Màu đỏ", "Red"), ("Màu đen", "Black"), ("Màu xám", "Grey"), ("Màu trắng", "White")),
    mc("tin12-b15-mc-07", 2, "Trong hệ màu HSL, khi độ sáng (lightness) bằng 100% thì màu là gì?", "In HSL, what colour results when lightness is 100%?",
       "Độ sáng 100% là lớn nhất nên màu trắng; 0% là đen.", "100% lightness is the maximum, giving white; 0% gives black.", "D",
       ("Đen", "Black"), ("Xám", "Grey"), ("Đỏ", "Red"), ("Trắng", "White")),
    mc("tin12-b15-mc-08", 2, "Hệ màu RGB cho phép tối đa bao nhiêu màu?", "How many colours does RGB allow at most?",
       "Có 256 × 256 × 256 = 2²⁴ = 16 777 216 màu.", "There are 256 × 256 × 256 = 2²⁴ = 16,777,216 colours.", "B",
       ("256", "256"), ("16 777 216", "16,777,216"), ("65 536", "65,536"), ("1 000 000", "1,000,000")),
    mc("tin12-b15-mc-09", 2, "Mẫu div p {background-color: lightblue;} áp dụng cho phần tử p nào?", "Which p elements does div p {background-color: lightblue;} apply to?",
       "Bộ chọn E F áp dụng cho mọi p là con hoặc cháu của div.", "The E F selector applies to every p that is a child or deeper descendant of div.", "A",
       ("Mọi p nằm trong div (con hoặc cháu)", "Every p inside a div (child or deeper)"), ("Chỉ p là con trực tiếp của body", "Only p that is a direct child of body"), ("Chỉ p đứng ngay sau div", "Only the p right after a div"), ("Mọi p trong trang", "Every p on the page")),
    mc("tin12-b15-mc-10", 2, "Mẫu p > strong {color: green;} áp dụng cho phần tử strong nào?", "Which strong elements does p > strong {color: green;} apply to?",
       "Bộ chọn E > F chỉ áp dụng cho F là con trực tiếp của E.", "The E > F selector only applies to an F that is a direct child of E.", "C",
       ("Mọi strong đứng sau p", "Every strong after a p"), ("Mọi strong trong trang", "Every strong on the page"), ("strong là con trực tiếp của p", "A strong that is a direct child of p"), ("strong đứng liền trước p", "A strong right before a p")),
    mc("tin12-b15-mc-11", 2, "Bộ chọn em + strong áp dụng cho phần tử nào?", "Which element does the selector em + strong apply to?",
       "Bộ chọn E + F áp dụng cho F liền kề ngay sau E và có cùng phần tử cha.", "E + F applies to the F immediately after E with the same parent.", "D",
       ("Mọi strong nằm trong em", "Every strong inside an em"), ("Mọi strong đứng sau em", "Every strong after an em"), ("strong là con trực tiếp của em", "A strong that is a direct child of em"), ("strong đứng liền ngay sau em, cùng cha", "The strong right after an em, same parent")),
    mc("tin12-b15-mc-12", 3, "Với <p><strong>1</strong><em>E</em><strong>2</strong><i>x</i><strong>3</strong></p>, mẫu em ~ strong áp dụng cho bao nhiêu phần tử strong?", "In <p><strong>1</strong><em>E</em><strong>2</strong><i>x</i><strong>3</strong></p>, how many strong elements does em ~ strong apply to?",
       "Chỉ strong 2 và strong 3 đứng sau em, cùng cha; strong 1 đứng trước em nên không áp dụng, tức 2 phần tử.", "Only strong 2 and strong 3 come after em with the same parent; strong 1 is before em so it is excluded: 2 elements.", "B",
       ("1", "1"), ("2", "2"), ("3", "3"), ("0", "0")),
]

truefalse = [
    tf("tin12-b15-tf-01", 2, "Xét hệ màu RGB và HSL.", "Consider the RGB and HSL systems.",
       "Mỗi giá trị RGB là 8 bit (0–255); có 256 màu xám; S = 0% còn xám; L = 100% là trắng.", "Each RGB value is 8 bits (0–255); there are 256 greys; S = 0% leaves grey; L = 100% is white.",
       ("Mỗi giá trị r, g, b là số nguyên từ 0 đến 255.", "Each of r, g, b is an integer from 0 to 255.", True),
       ("Hệ màu RGB có đúng 255 màu thuộc màu xám.", "RGB has exactly 255 grey shades.", False),
       ("Trong HSL, độ bão hoà 0% làm màu chỉ còn xám.", "In HSL, 0% saturation leaves only grey.", True),
       ("Trong HSL, độ sáng 100% cho màu đen.", "In HSL, 100% lightness gives black.", False)),
    tf("tin12-b15-tf-02", 2, "Xét thuộc tính màu và kế thừa.", "Consider colour properties and inheritance.",
       "color là màu chữ, background-color là màu nền; border không kế thừa nhưng color, background-color có kế thừa.", "color is text colour, background-color is background; border is not inherited while color and background-color are.",
       ("Thuộc tính color đặt màu chữ.", "The color property sets the text colour.", True),
       ("Thuộc tính background-color đặt màu nền.", "The background-color property sets the background colour.", True),
       ("Thuộc tính border có tính kế thừa cho các phần tử con.", "The border property is inherited by child elements.", False),
       ("Cả color và background-color đều không có tính kế thừa.", "Neither color nor background-color is inherited.", False)),
    tf("tin12-b15-tf-03", 2, "Xét các bộ chọn tổ hợp.", "Consider the combinator selectors.",
       "E F là con cháu; E > F là con trực tiếp; E + F là liền kề ngay sau; E ~ F là mọi anh em đứng sau.", "E F is descendant; E > F is direct child; E + F is the immediate next sibling; E ~ F is all later siblings.",
       ("E F áp dụng cho các F là con hoặc cháu của E.", "E F applies to F that are children or deeper descendants of E.", True),
       ("E > F chỉ áp dụng cho F là con trực tiếp của E.", "E > F applies only to F that are direct children of E.", True),
       ("E + F áp dụng cho mọi F đứng sau E dù không liền kề.", "E + F applies to every F after E even if not adjacent.", False),
       ("E ~ F áp dụng cho các F đứng sau E, cùng cha, không cần liền kề.", "E ~ F applies to F after E with the same parent, not necessarily adjacent.", True)),
    tf("tin12-b15-tf-04", 2, "Xét tên màu và hsl.", "Consider colour names and hsl.",
       "CSS3 có 140 tên màu; tên không phân biệt hoa thường; xám dùng r = g = b; hsl(0,100%,50%) là đỏ.", "CSS3 has 140 colour names; names are case-insensitive; greys use r = g = b; hsl(0,100%,50%) is red.",
       ("CSS3 quy định 140 tên màu.", "CSS3 defines 140 colour names.", True),
       ("Tên màu trong CSS phân biệt chữ hoa và chữ thường.", "Colour names in CSS are case-sensitive.", False),
       ("Màu xám có thể viết rgb(x,x,x) với ba tham số bằng nhau.", "A grey can be written rgb(x,x,x) with three equal parameters.", True),
       ("hsl(0, 100%, 50%) là màu đỏ.", "hsl(0, 100%, 50%) is red.", True)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
