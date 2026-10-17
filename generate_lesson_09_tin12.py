# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_09_tin12.py
from generate_tin_common import T, build, configure, mc, tf, web_block

configure(12, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers", "Tin học ứng dụng")

slug = "tao-danh-sach-bang-bai-9-tin12"
title_vi = "Bài 9. Tạo danh sách, bảng"
title_en = "Lesson 9. Creating lists and tables"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


blocks = [
    T(
        """### Mục tiêu bài học

Sau bài này, bạn có thể:

- chọn danh sách hoặc bảng để trình bày thông tin cho rõ ràng, khoa học;
- tạo danh sách có thứ tự (`<ol>`), không có thứ tự (`<ul>`) và danh sách mô tả (`<dl>`), kể cả danh sách lồng nhau;
- tạo bảng bằng `<table>`, `<tr>`, `<td>`, `<th>`, `<caption>`;
- kẻ viền, chỉnh kích thước và gộp ô cho bảng.""",
        """### Learning goals

After this lesson, you can:

- choose a list or a table to present information clearly and logically;
- create ordered (`<ol>`), unordered (`<ul>`) and description (`<dl>`) lists, including nested lists;
- build a table with `<table>`, `<tr>`, `<td>`, `<th>`, `<caption>`;
- add borders, set sizes and merge cells in a table.""",
    ),
    T(
        """### 1a. Danh sách có thứ tự và không có thứ tự

Khi nhiều ý ngang hàng được viết dàn trải thành đoạn văn, người đọc khó theo dõi. Trình bày bằng **danh sách** thì rõ ràng hơn: các mục hiển thị tuần tự, kí tự đầu dòng có thể là số, chữ, dấu, kí hiệu hoặc hình.

| Kiểu | Thẻ | Mục con |
|---|---|---|
| Không có thứ tự | `<ul>…</ul>` | `<li>…</li>` |
| Có thứ tự | `<ol>…</ol>` | `<li>…</li>` |

- Với `<ul>`, chọn kí tự đầu dòng bằng `list-style-type` trong `style`: `disc` (chấm đặc), `circle` (vòng tròn), `square` (ô vuông) hoặc `none` (không có).
- Với `<ol>`, thuộc tính `type` chọn kiểu đánh số: `"1"`, `"A"`, `"a"`, `"I"`, `"i"`.""",
        """### 1a. Ordered and unordered lists

When several equal ideas are written as one long paragraph, readers struggle to follow. A **list** is clearer: items appear in sequence, and the marker can be a number, letter, sign, symbol or picture.

| Kind | Tag | Item tag |
|---|---|---|
| Unordered | `<ul>…</ul>` | `<li>…</li>` |
| Ordered | `<ol>…</ol>` | `<li>…</li>` |

- For `<ul>`, choose the bullet with `list-style-type` in `style`: `disc` (filled dot), `circle`, `square` or `none`.
- For `<ol>`, the `type` attribute picks the numbering style: `"1"`, `"A"`, `"a"`, `"I"`, `"i"`.""",
    ),
    web_block(
        sim("Danh sách có và không có thứ tự", "Ordered and unordered lists", "ul dùng kí tự đầu dòng, ol đánh số; chỉnh list-style-type và type để đổi kí tự.", "ul uses bullets, ol numbers the items; change list-style-type and type to change the markers."),
        """<h3>Các môn học</h3>
<ul style="list-style-type:square">
  <li>Toán</li>
  <li>Vật lí</li>
  <li>Tin học</li>
</ul>
<h3>Các bước soạn trang web</h3>
<ol type="1">
  <li>Mở trình soạn thảo</li>
  <li>Gõ mã HTML</li>
  <li>Lưu tệp .html</li>
  <li>Mở bằng trình duyệt</li>
</ol>""",
        "",
        460,
    ),
    T(
        """### 1b. Danh sách mô tả và danh sách lồng nhau

**Danh sách mô tả** liệt kê các mục kèm mô tả cho từng mục, tạo bằng ba thẻ:

- `<dl>`: toàn bộ danh sách;
- `<dt>`: tên mục (thuật ngữ);
- `<dd>`: phần mô tả của mục đó.

**Danh sách lồng nhau:** đặt một danh sách con **bên trong cặp `<li>…</li>`** của mục tương ứng. Ví dụ danh sách mức 1 đánh số `1, 2, 3` còn mức 2 đánh số `a, b, c`: dùng `<ol type="1">` cho danh sách ngoài và `<ol type="a">` cho danh sách trong.""",
        """### 1b. Description lists and nested lists

A **description list** lists items together with a description of each, built with three tags:

- `<dl>`: the whole list;
- `<dt>`: the item name (term);
- `<dd>`: the description of that item.

**Nested lists:** put a child list **inside the `<li>…</li>`** of its parent item. For example, level 1 numbered `1, 2, 3` and level 2 numbered `a, b, c`: use `<ol type="1">` for the outer list and `<ol type="a">` for the inner one.""",
    ),
    web_block(
        sim("Danh sách mô tả", "A description list", "dt là tên mục, dd là mô tả đi kèm.", "dt is the item name and dd is its description."),
        """<h3>Thuật ngữ HTML</h3>
<dl>
  <dt>Thẻ</dt>
  <dd>Kí tự đánh dấu nằm trong cặp dấu &lt; và &gt;.</dd>
  <dt>Phần tử</dt>
  <dd>Gồm thẻ bắt đầu, nội dung và thẻ kết thúc.</dd>
  <dt>Thuộc tính</dt>
  <dd>Thông tin thêm đặt trong thẻ bắt đầu.</dd>
</dl>""",
        "",
        340,
    ),
    web_block(
        sim("Danh sách lồng nhau", "Nested lists", "Danh sách trong nằm bên trong thẻ li của mục cha; ngoài đánh số 1, 2, trong đánh số a, b.", "The inner list sits inside the parent's li; outer numbered 1, 2, inner numbered a, b."),
        """<ol type="1">
  <li>Danh sách
    <ol type="a">
      <li>Có thứ tự (ol)</li>
      <li>Không có thứ tự (ul)</li>
      <li>Mô tả (dl)</li>
    </ol>
  </li>
  <li>Bảng
    <ol type="a">
      <li>Hàng (tr)</li>
      <li>Ô dữ liệu (td)</li>
    </ol>
  </li>
</ol>""",
        "",
        400,
    ),
    T(
        """### 2a. Thiết lập bảng

Khi dữ liệu có thể xếp theo **hàng và cột** (ví dụ món ăn, đơn giá, số lượng, thành tiền) nên dùng **bảng** vì dễ so sánh các mục. Các thẻ chính:

| Thẻ | Tác dụng |
|---|---|
| `<table>` | tạo bảng |
| `<tr>` | tạo một hàng |
| `<td>` | tạo ô dữ liệu |
| `<th>` | tạo ô tiêu đề (thường ở hàng đầu) |
| `<caption>` | tiêu đề cả bảng, đặt **ngay sau** `<table>` và trước `<tr>` đầu tiên |

Bảng chưa định dạng có các cột không đều và chữ sát nhau, khó nhìn; ta cải thiện bằng thuộc tính `style`.""",
        """### 2a. Setting up a table

When data fits **rows and columns** (for example dish, unit price, quantity, total) a **table** is better because items are easy to compare. The main tags:

| Tag | Effect |
|---|---|
| `<table>` | creates the table |
| `<tr>` | creates a row |
| `<td>` | creates a data cell |
| `<th>` | creates a header cell (usually in the first row) |
| `<caption>` | the title of the whole table, placed **right after** `<table>` and before the first `<tr>` |

An unformatted table has uneven columns and cramped text; we improve it with the `style` attribute.""",
    ),
    web_block(
        sim("Bảng đơn giản", "A simple table", "table chứa các hàng tr; th là ô tiêu đề, td là ô dữ liệu.", "table holds tr rows; th is a header cell, td a data cell."),
        """<table>
  <caption>Gian hàng của lớp 12E</caption>
  <tr><th>Món ăn</th><th>Đơn giá</th><th>Số lượng</th></tr>
  <tr><td>Bánh mì</td><td>15.000</td><td>40</td></tr>
  <tr><td>Trà đào</td><td>20.000</td><td>30</td></tr>
</table>""",
        "",
        300,
    ),
    T(
        """### 2b. Định dạng bảng

- **Khung bảng:** thuộc tính con `border` trong `style` gồm ba phần cách nhau bởi dấu cách: **độ dày – kiểu viền – màu viền**, ví dụ `border: 1px solid green`. Hai phần đầu bắt buộc; kiểu viền là `solid`, `dotted`, `double` hoặc `none`; màu mặc định là đen và có thể bỏ.
- **Kích thước:** `width` và `height` trong `style`, theo tỉ lệ `%` hoặc số điểm ảnh `px`. Nên dùng `%`, vì các thiết bị khác nhau về kích thước màn hình và số điểm ảnh nên bảng đặt theo `px` có thể hiển thị lệch.
- Viền chỉ có tác dụng với phần tử mang nó; muốn kẻ viền từng ô phải đặt `border` trong từng `<td>` (hoặc `<th>`).""",
        """### 2b. Formatting a table

- **Table border:** the `border` sub-property of `style` has three parts separated by spaces: **thickness – border style – colour**, e.g. `border: 1px solid green`. The first two are required; the style is `solid`, `dotted`, `double` or `none`; the colour defaults to black and may be left out.
- **Size:** `width` and `height` in `style`, as a percentage `%` or a pixel count `px`. Prefer `%`: devices differ in screen size and pixel count, so a table sized in `px` may display incorrectly.
- A border only affects the element that carries it; to outline every cell, put `border` in each `<td>` (or `<th>`).""",
    ),
    web_block(
        sim("Kẻ viền và chỉnh độ rộng bảng", "Borders and table width", "style đặt viền xanh và độ rộng 80% cho bảng và từng ô.", "style sets a green border and an 80% width on the table and on each cell."),
        """<table style="width:80%; border:1px solid green">
  <caption>Điểm kiểm tra</caption>
  <tr><th style="border:1px solid green">Họ tên</th><th style="border:1px solid green">Điểm</th></tr>
  <tr><td style="border:1px solid green">Lan</td><td style="border:1px solid green">9</td></tr>
  <tr><td style="border:1px solid green">Minh</td><td style="border:1px solid green">8</td></tr>
</table>""",
        "",
        300,
    ),
    T(
        """### 2c. Gộp ô

- `colspan="n"`: ô trải rộng qua **n cột**.
- `rowspan="n"`: ô trải qua **n hàng**. Đặt thuộc tính trong `<th>` hoặc `<td>` của hàng đầu tiên cần gộp; ở các hàng tiếp theo **bỏ qua** cặp thẻ tại vị trí tương ứng (đặt `rowspan="3"` thì bỏ qua ô đó ở hai hàng sau).

Ví dụ bảng điểm: ô “Họ tên” gộp 2 hàng (`rowspan="2"`), ô “Điểm” gộp 3 cột (`colspan="3"`), hàng dưới ghi Toán, Vật lí, Hoá học.""",
        """### 2c. Merging cells

- `colspan="n"`: a cell spans **n columns**.
- `rowspan="n"`: a cell spans **n rows**. Put the attribute on the `<th>` or `<td>` in the first row to merge; in the following rows **leave out** the tag at the matching position (with `rowspan="3"`, skip that cell in the next two rows).

Example score table: the “Name” cell spans 2 rows (`rowspan="2"`), the “Score” cell spans 3 columns (`colspan="3"`), and the row below lists Maths, Physics, Chemistry.""",
    ),
    web_block(
        sim("Bảng điểm gộp hàng và cột", "A score table with merged rows and columns", "rowspan gộp ô Họ tên qua 2 hàng; colspan gộp ô Điểm qua 3 cột; ba môn dùng ba màu.", "rowspan merges the Name cell over 2 rows; colspan merges Score over 3 columns; three subjects get three colours."),
        """<table style="width:90%; border:1px solid green">
  <tr><th rowspan="2" style="border:1px solid green">Họ tên</th><th colspan="3" style="border:1px solid green">Điểm</th></tr>
  <tr><th style="border:1px solid green; color:red">Toán</th><th style="border:1px solid green; color:orange">Vật lí</th><th style="border:1px solid green; color:blue">Hoá học</th></tr>
  <tr><td style="border:1px solid green">Lan</td><td style="border:1px solid green">9</td><td style="border:1px solid green">8</td><td style="border:1px solid green">10</td></tr>
  <tr><td style="border:1px solid green">Minh</td><td style="border:1px solid green">7</td><td style="border:1px solid green">9</td><td style="border:1px solid green">8</td></tr>
</table>""",
        "",
        340,
    ),
    T(
        """### Tóm tắt và tự kiểm tra

| Nội dung | Ghi nhớ |
|---|---|
| Danh sách | `ul` (không thứ tự), `ol` (có thứ tự), `dl` + `dt` + `dd` (mô tả); mục là `li` |
| Kí tự đầu dòng | `list-style-type`: disc, circle, square, none |
| Kiểu đánh số | `type` của `ol`: "1", "A", "a", "I", "i" |
| Bảng | `table` → `tr` → `td` / `th`; tiêu đề bảng `caption` |
| Viền | `border: độ dày kiểu màu` |
| Gộp ô | `rowspan` (hàng), `colspan` (cột) |

**Tự kiểm tra:** một ô cần trải qua 3 cột thì viết thuộc tính nào? (đáp án: `colspan="3"`).""",
        """### Summary and self-check

| Topic | Remember |
|---|---|
| Lists | `ul` (unordered), `ol` (ordered), `dl` + `dt` + `dd` (description); items are `li` |
| Bullets | `list-style-type`: disc, circle, square, none |
| Numbering | `type` of `ol`: "1", "A", "a", "I", "i" |
| Table | `table` → `tr` → `td` / `th`; table title `caption` |
| Border | `border: thickness style colour` |
| Merging | `rowspan` (rows), `colspan` (columns) |

**Self-check:** which attribute makes a cell span 3 columns? (answer: `colspan="3"`).""",
    ),
]

questions = [
    mc("tin12-b09-mc-01", 1, "Thẻ HTML nào dùng để tạo các ô dữ liệu trong bảng?", "Which HTML tag creates data cells in a table?",
       "Thẻ td tạo ô dữ liệu; th tạo ô tiêu đề, tr tạo hàng, table tạo cả bảng.", "td creates data cells; th makes header cells, tr makes rows, table makes the whole table.", "A",
       ("<td>", "<td>"), ("<th>", "<th>"), ("<table>", "<table>"), ("<tr>", "<tr>")),
    mc("tin12-b09-mc-02", 1, "Cặp thẻ nào tạo danh sách có thứ tự?", "Which pair of tags creates an ordered list?",
       "Thẻ ol tạo danh sách có thứ tự; ul không thứ tự; dl là danh sách mô tả.", "ol makes an ordered list; ul is unordered; dl is a description list.", "C",
       ("<ul></ul>", "<ul></ul>"), ("<dl></dl>", "<dl></dl>"), ("<ol></ol>", "<ol></ol>"), ("<il></il>", "<il></il>")),
    mc("tin12-b09-mc-03", 1, "Với danh sách <ol>, thuộc tính type dùng để làm gì?", "For an <ol> list, what is the type attribute for?",
       "Thuộc tính type của ol chọn kiểu đánh số: \"1\", \"A\", \"a\", \"I\" hoặc \"i\".", "The type attribute of ol picks the numbering style: \"1\", \"A\", \"a\", \"I\" or \"i\".", "B",
       ("Xác định số bắt đầu của danh sách", "Sets the starting number of the list"), ("Xác định kiểu đánh số", "Sets the numbering style"), ("Xác định kí tự đầu dòng của ul", "Sets the bullet of a ul"), ("Xác định kiểu viền của bảng", "Sets the border style of a table")),
    mc("tin12-b09-mc-04", 1, "Giá trị nào sau đây KHÔNG dùng được cho list-style-type của danh sách ul?", "Which value can NOT be used for list-style-type of a ul list?",
       "list-style-type của ul nhận disc, circle, square hoặc none; shadow không phải giá trị hợp lệ.", "list-style-type of ul takes disc, circle, square or none; shadow is not valid.", "D",
       ("disc", "disc"), ("circle", "circle"), ("none", "none"), ("shadow", "shadow")),
    mc("tin12-b09-mc-05", 2, "Muốn một ô trải rộng qua 3 cột, ta đặt thuộc tính nào cho ô đó?", "Which attribute makes a cell span 3 columns?",
       "Thuộc tính colspan=\"3\" gộp ô qua 3 cột; rowspan là gộp theo hàng.", "colspan=\"3\" merges a cell across 3 columns; rowspan merges rows.", "C",
       ("rowspan=\"3\"", "rowspan=\"3\""), ("colframe=\"3\"", "colframe=\"3\""), ("colspan=\"3\"", "colspan=\"3\""), ("rowsize=\"3\"", "rowsize=\"3\"")),
    mc("tin12-b09-mc-06", 2, "Thẻ nào tạo tiêu đề cho cả bảng?", "Which tag creates the title of a whole table?",
       "Thẻ caption đặt ngay sau thẻ table tạo tiêu đề cho cả bảng; th chỉ là ô tiêu đề của cột hoặc hàng.", "caption, placed right after table, is the title of the whole table; th is only a column or row header cell.", "A",
       ("<caption>", "<caption>"), ("<th>", "<th>"), ("<title>", "<title>"), ("<head>", "<head>")),
    mc("tin12-b09-mc-07", 2, "Danh sách mô tả được tạo bằng bộ thẻ nào?", "Which set of tags builds a description list?",
       "Danh sách mô tả dùng dl cho cả danh sách, dt cho tên mục và dd cho phần mô tả.", "A description list uses dl for the list, dt for the item name and dd for its description.", "B",
       ("<ul>, <li>", "<ul>, <li>"), ("<dl>, <dt>, <dd>", "<dl>, <dt>, <dd>"), ("<ol>, <li>", "<ol>, <li>"), ("<table>, <tr>, <td>", "<table>, <tr>, <td>")),
    mc("tin12-b09-mc-08", 2, "Ý nghĩa của style=\"border: 1px solid green\" là gì?", "What does style=\"border: 1px solid green\" mean?",
       "Ba phần theo thứ tự là độ dày 1 pixel, kiểu viền nét liền, màu xanh lục.", "The three parts are a 1 pixel thickness, a solid line style and a green colour.", "D",
       ("Viền nét đứt dày 1 cm, màu xanh", "A dotted border 1 cm thick, green"), ("Chữ màu xanh, cỡ 1 pixel", "Green text of 1 pixel"), ("Bỏ viền của bảng", "Removes the table border"), ("Viền dày 1 pixel, nét liền, màu xanh lục", "A solid border 1 pixel thick, green")),
    mc("tin12-b09-mc-09", 2, "Ô đầu hàng có rowspan=\"3\". Ở hai hàng tiếp theo cần làm gì?", "The first-row cell has rowspan=\"3\". What must be done in the next two rows?",
       "Ô đã trải qua ba hàng nên ở hai hàng sau phải bỏ qua cặp thẻ td hoặc th tại vị trí tương ứng.", "The cell already covers three rows, so the two following rows must skip the td or th at that position.", "B",
       ("Viết lại đầy đủ ô đó", "Write that cell again in full"), ("Bỏ qua ô ở vị trí tương ứng", "Skip the cell at the matching position"), ("Thêm thuộc tính colspan", "Add a colspan attribute"), ("Xoá cả hai hàng", "Delete both rows")),
    mc("tin12-b09-mc-10", 2, "Vì sao nên đặt độ rộng bảng theo % thay vì px?", "Why set the table width in % rather than px?",
       "Thiết bị khác nhau về kích thước màn hình và số điểm ảnh, bảng đặt theo % co giãn theo khối chứa nên ít bị lệch.", "Devices differ in screen size and pixel count; a % width scales with its container so it is less likely to break.", "A",
       ("Vì thiết bị có kích thước và số điểm ảnh khác nhau", "Because devices differ in size and pixel count"), ("Vì px không dùng được trong HTML", "Because px cannot be used in HTML"), ("Vì % làm bảng có viền", "Because % adds a border"), ("Vì % làm chữ to hơn", "Because % enlarges the text")),
    mc("tin12-b09-mc-11", 2, "Lớp 12E muốn đăng món ăn, đơn giá, số lượng và thành tiền. Nên dùng dạng biểu diễn nào?", "Class 12E wants to post dish, unit price, quantity and total. Which form fits best?",
       "Dữ liệu có nhiều thuộc tính cho mỗi mục, xếp theo hàng và cột, nên dùng bảng để dễ so sánh.", "Each item has several attributes arranged in rows and columns, so a table makes comparison easy.", "D",
       ("Danh sách không có thứ tự", "An unordered list"), ("Danh sách có thứ tự", "An ordered list"), ("Danh sách mô tả", "A description list"), ("Bảng", "A table")),
    mc("tin12-b09-mc-12", 3, "Bảng <table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table> có bao nhiêu phần tử HTML (tính cả table)?", "How many HTML elements does <table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table> have (counting table)?",
       "Gồm 1 table, 2 tr, 2 th và 2 td, tức 1 + 2 + 2 + 2 = 7 phần tử.", "It has 1 table, 2 tr, 2 th and 2 td, so 1 + 2 + 2 + 2 = 7 elements.", "C",
       ("5", "5"), ("6", "6"), ("7", "7"), ("8", "8")),
]

truefalse = [
    tf("tin12-b09-tf-01", 2, "Xét các kiểu danh sách trong HTML.", "Consider the list types in HTML.",
       "HTML có ba kiểu danh sách ol, ul, dl; list-style-type nhận bốn giá trị; danh sách lồng nhau đặt trong li.", "HTML has three list types ol, ul, dl; list-style-type takes four values; nested lists go inside li.",
       ("HTML chỉ có hai kiểu danh sách: có thứ tự và không có thứ tự.", "HTML has only two list types: ordered and unordered.", False),
       ("list-style-type nhận một trong các giá trị disc, circle, square, none.", "list-style-type takes one of disc, circle, square, none.", True),
       ("Danh sách lồng nhau được tạo bằng cách đặt danh sách con bên trong cặp <li></li>.", "A nested list is made by putting the child list inside <li></li>.", True),
       ("Thẻ <ol> dùng cho danh sách có thứ tự.", "<ol> is used for ordered lists.", True)),
    tf("tin12-b09-tf-02", 2, "Xét các thẻ tạo bảng.", "Consider the tags that build a table.",
       "caption nằm ngay sau table (không phải trước); hàng đầu có thể, không bắt buộc, là hàng tiêu đề.", "caption sits right after table (not before it); the first row may, but need not, be a header row.",
       ("<table> tạo bảng, <tr> tạo hàng, <td> tạo ô dữ liệu, <th> tạo ô tiêu đề.", "<table> creates the table, <tr> a row, <td> a data cell, <th> a header cell.", True),
       ("Thẻ <caption> phải đặt ngay trước thẻ <table>.", "<caption> must be placed right before <table>.", False),
       ("Có thể dùng width và height trong style để chỉnh kích thước bảng.", "width and height in style can set the table size.", True),
       ("Hàng đầu tiên của bảng bắt buộc phải là hàng tiêu đề.", "The first row of a table must be a header row.", False)),
    tf("tin12-b09-tf-03", 2, "Xét viền của bảng.", "Consider table borders.",
       "border gồm độ dày, kiểu, màu cách nhau bởi dấu cách; màu có thể bỏ; kiểu gồm solid, dotted, double, none.", "border has thickness, style and colour separated by spaces; the colour may be omitted; styles are solid, dotted, double, none.",
       ("border: 1px solid green đặt viền dày 1 pixel, nét liền, màu xanh lục.", "border: 1px solid green sets a solid green border 1 pixel thick.", True),
       ("Ba phần của border ngăn cách nhau bằng dấu phẩy.", "The three parts of border are separated by commas.", False),
       ("Màu viền có thể bỏ qua, khi đó mặc định là màu đen.", "The border colour may be omitted, then it defaults to black.", True),
       ("Kiểu viền có thể là solid, dotted, double hoặc none.", "The border style can be solid, dotted, double or none.", True)),
    tf("tin12-b09-tf-04", 2, "Xét việc gộp ô và kích thước bảng.", "Consider merging cells and table size.",
       "rowspan gộp theo hàng, colspan gộp theo cột; ô đã gộp thì không viết lại ở hàng sau; nên dùng % thay cho px.", "rowspan merges rows, colspan merges columns; a merged cell is not written again in later rows; % is preferred over px.",
       ("rowspan dùng để gộp ô theo hàng.", "rowspan merges cells across rows.", True),
       ("colspan=\"2\" làm ô trải qua hai cột.", "colspan=\"2\" makes a cell span two columns.", True),
       ("Sau khi dùng rowspan, các hàng sau vẫn phải viết đủ ô ở vị trí đó.", "After rowspan, the later rows must still write a cell at that position.", False),
       ("Nên đặt kích thước bảng bằng px để chính xác trên mọi thiết bị.", "Table sizes should be set in px to be exact on every device.", False)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
