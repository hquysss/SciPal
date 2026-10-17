# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_08_tin12.py
from generate_tin_common import T, build, configure, mc, tf, web_block

configure(12, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers", "Tin học ứng dụng")

slug = "dinh-dang-van-ban-bai-8-tin12"
title_vi = "Bài 8. Định dạng văn bản"
title_en = "Lesson 8. Text formatting"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


blocks = [
    T(
        """### Mục tiêu bài học

Sau bài này, bạn có thể:

- hiểu **thuộc tính của thẻ** và cách khai báo thuộc tính;
- dùng các thẻ `<h1>`–`<h6>`, `<p>`, `<br>`, `<hr>`, `<div>`, `<span>` để trình bày tiêu đề và đoạn văn;
- dùng các thẻ định dạng kiểu chữ (đậm, nghiêng, chỉ số trên, chỉ số dưới,...);
- dùng thuộc tính `style` để đặt màu sắc, phông chữ và cỡ chữ.""",
        """### Learning goals

After this lesson, you can:

- understand **tag attributes** and how to declare them;
- use `<h1>`–`<h6>`, `<p>`, `<br>`, `<hr>`, `<div>` and `<span>` to lay out headings and paragraphs;
- use tags that format the style of text (bold, italic, superscript, subscript,...);
- use the `style` attribute to set colour, font and font size.""",
    ),
    T(
        """### 1. Thuộc tính thẻ

Một văn bản đẹp có tiêu đề nổi bật, mỗi ý một dòng và khoảng cách rõ ràng. Để làm được điều đó trong HTML, ta cần thêm thông tin cho thẻ.

- Thẻ **có thể có hoặc không có** thuộc tính.
- **Tác dụng:** bổ sung thông tin, làm rõ cách trình duyệt xử lí thẻ chứa nó.
- **Cú pháp:** `tên_thuộc_tính="giá trị"`.
- **Vị trí:** nằm trong **thẻ bắt đầu**, sau tên thẻ (không nằm trong thẻ kết thúc). Nhiều thuộc tính ngăn cách nhau bằng **dấu cách**.

```html
<html lang="vi">
<meta charset="UTF-8">
<p style="color:red">Chữ đỏ</p>
```

Thuộc tính dùng nhiều nhất là **`style`**: thiết lập màu sắc, phông chữ, cỡ chữ, kiểu chữ, căn lề, tạo khung,... cho một phần tử HTML.""",
        """### 1. Tag attributes

A good-looking text has a standout title, one idea per line and clear spacing. In HTML, we give tags extra information to do that.

- A tag **may or may not** have attributes.
- **Purpose:** add information and tell the browser how to handle the tag that holds it.
- **Syntax:** `attribute_name="value"`.
- **Position:** inside the **start tag**, after the tag name (never in the end tag). Several attributes are separated by **spaces**.

```html
<html lang="en">
<meta charset="UTF-8">
<p style="color:red">Red text</p>
```

The most used attribute is **`style`**: it sets colour, font, font size, text style, alignment, borders,... for an HTML element.""",
    ),
    T(
        """### 2a. Định dạng tiêu đề

HTML dùng các thẻ `<hx>` với `x` từ 1 đến 6 để phân cấp tiêu đề:

- `<h1>`: tiêu đề chính, tiêu đề chung của cả văn bản;
- `<h2>`, `<h3>`,...: các tiêu đề ở mức thấp hơn; số càng lớn thì chữ càng nhỏ.

**Lợi ích:** trình duyệt dựa vào thẻ `<hx>` để hiển thị và giúp người dùng đọc lướt theo tiêu đề; công cụ tìm kiếm dùng chúng để hiểu cấu trúc và nội dung trang.

Bấm chạy mô phỏng để xem văn bản có bốn mức tiêu đề được dựng lên.""",
        """### 2a. Formatting headings

HTML uses `<hx>` tags with `x` from 1 to 6 to rank headings:

- `<h1>`: the main title of the whole document;
- `<h2>`, `<h3>`,...: lower-level headings; the larger the number, the smaller the text.

**Benefits:** the browser uses `<hx>` to display the page and lets readers skim by headings; search engines use them to understand the structure and content of the page.

Run the simulation to see a document with four heading levels being built.""",
    ),
    web_block(
        sim("Bốn mức tiêu đề", "Four heading levels", "Thẻ h1 đến h4 nhỏ dần; mỗi dòng mã thêm một phần tử.", "h1 to h4 get smaller; each line of code adds one element."),
        """<h1>Tin học 12</h1>
<h2>Chủ đề 5. Thiết kế trang web</h2>
<h3>Bài 8. Định dạng văn bản</h3>
<h4>Các thẻ tiêu đề</h4>
<p>Có sáu mức tiêu đề, từ h1 đến h6.</p>""",
        "",
        340,
    ),
    T(
        """### 2b. Định dạng đoạn văn bản

| Thẻ | Tác dụng |
|---|---|
| `<p>…</p>` | một **đoạn văn**: hiển thị trên dòng mới, có khoảng trống nhỏ trước và sau đoạn |
| `<br>` | **xuống dòng** (thẻ đơn); khoảng cách giữa hai dòng mặc định nhỏ hơn so với `<p>` |
| `<hr>` | tạo **đường kẻ ngang** (thẻ đơn) |
| `<div>…</div>` | một **khối**, bắt đầu trên dòng mới |
| `<span>…</span>` | khối nhỏ hơn, nội dung hiển thị **trên cùng dòng** đang viết |

Nội dung của `<p>` có thể gồm văn bản, hình ảnh và một số phần tử khác, nhưng **không** chứa tiêu đề, danh sách hay các phần tử dạng khối khác. Khi cần gom nhiều loại nội dung, ta dùng `<div>` hoặc `<span>`; các định dạng như khung, lề được thêm bằng thuộc tính `style`.""",
        """### 2b. Formatting paragraphs

| Tag | Effect |
|---|---|
| `<p>…</p>` | one **paragraph**: shown on a new line with a small gap before and after |
| `<br>` | **line break** (void tag); the default gap between lines is smaller than with `<p>` |
| `<hr>` | draws a **horizontal rule** (void tag) |
| `<div>…</div>` | a **block** that starts on a new line |
| `<span>…</span>` | a smaller block whose content stays **on the same line** |

A `<p>` may hold text, images and some other elements, but **not** headings, lists or other block elements. To group mixed content we use `<div>` or `<span>`; extra formatting such as borders and margins comes from the `style` attribute.""",
    ),
    web_block(
        sim("Đoạn văn, xuống dòng và khối", "Paragraphs, line breaks and blocks", "p xuống dòng mới; br ngắt dòng trong đoạn; span nằm cùng dòng; div là một khối.", "p starts a new line; br breaks a line inside a paragraph; span stays inline; div is a block."),
        """<h2>Bài thơ</h2>
<hr>
<p>Muốn sang thì bắc cầu kiều<br>
Muốn con hay chữ phải yêu lấy thầy.</p>
<p>Câu ca dao này nói về <span>lòng biết ơn</span> thầy cô.</p>
<div>Đây là một khối div.</div>
<div>Khối div thứ hai bắt đầu trên dòng mới.</div>""",
        "",
        380,
    ),
    T(
        """### 3a. Định dạng kiểu chữ

Muốn nhấn mạnh một nội dung, ta thường viết đậm, nghiêng, gạch chân hay tô sáng. HTML có các thẻ tương ứng (Bảng 8.1):

| Thẻ | Kết quả |
|---|---|
| `<b>` | chữ **đậm** |
| `<strong>` | chữ đậm, **nhấn mạnh ngữ nghĩa** |
| `<i>` | chữ *nghiêng* |
| `<em>` | chữ nghiêng, **nhấn mạnh ngữ nghĩa** |
| `<mark>` | tô sáng (đánh dấu) |
| `<small>` | chữ nhỏ hơn |
| `<del>` | chữ bị gạch ngang (đã xoá) |
| `<ins>` | chữ có gạch chân (nội dung thêm vào) |
| `<sub>` | chỉ số dưới, ví dụ H<sub>2</sub>O |
| `<sup>` | chỉ số trên, ví dụ x<sup>2</sup> |

**Lưu ý:** HTML5 không còn hỗ trợ thẻ `<big>`; muốn chữ to hơn hãy dùng `font-size` trong `style`. Thẻ `<strong>`, `<em>` được khuyến khích dùng hơn `<b>`, `<i>` vì mang ý nghĩa nhấn mạnh nội dung.""",
        """### 3a. Formatting the style of text

To stress some content we often use bold, italic, underline or highlight. HTML has matching tags (Table 8.1):

| Tag | Result |
|---|---|
| `<b>` | **bold** text |
| `<strong>` | bold text with **semantic emphasis** |
| `<i>` | *italic* text |
| `<em>` | italic text with **semantic emphasis** |
| `<mark>` | highlighted text |
| `<small>` | smaller text |
| `<del>` | struck-through text (deleted) |
| `<ins>` | underlined text (inserted) |
| `<sub>` | subscript, e.g. H<sub>2</sub>O |
| `<sup>` | superscript, e.g. x<sup>2</sup> |

**Note:** HTML5 no longer supports `<big>`; use `font-size` in `style` to make text larger. `<strong>` and `<em>` are preferred over `<b>` and `<i>` because they carry the meaning of emphasis.""",
    ),
    web_block(
        sim("Các thẻ định dạng kiểu chữ", "Tags that format the style of text", "Mỗi dòng dùng một thẻ khác nhau; chú ý chỉ số trên, chỉ số dưới.", "Each line uses a different tag; watch the superscript and subscript."),
        """<p><b>Chữ đậm</b> và <i>chữ nghiêng</i></p>
<p>Em <strong>rất</strong> thích môn <em>Tin học</em>.</p>
<p>Ghi nhớ: <mark>thẻ mở có thẻ đóng</mark></p>
<p><small>Chữ nhỏ</small>, <del>giá cũ 100</del>, <ins>giá mới 80</ins></p>
<p>Axit sunfuric: H<sub>2</sub>SO<sub>4</sub></p>
<p>Diện tích hình vuông: a<sup>2</sup></p>""",
        "",
        380,
    ),
    T(
        """### 3b. Định dạng phông chữ

Phông chữ được định dạng bằng thuộc tính **`style`**, gồm các cặp `tên: giá trị` ngăn cách nhau bởi dấu **`;`**:

| Đặc tính | Ví dụ | Ý nghĩa |
|---|---|---|
| `color` | `color:red` | màu chữ (tên màu tiếng Anh hoặc giá trị RGB) |
| `font-family` | `font-family:Arial` | tên phông chữ |
| `font-size` | `font-size:20px` | cỡ chữ: số kèm đơn vị (px, mm, cm,...) hoặc cỡ thông dụng (small, medium, large,...) |

```html
<p style="color:blue; font-family:Arial; font-size:20px">Tin học 12</p>
```

Giá trị màu có thể là tên tiếng Anh (`red`, `green`, `blue`, `grey`, `yellow`, `black`, `brown`,...) hoặc giá trị hệ RGB, ví dụ `rgb(205, 0, 0)`.""",
        """### 3b. Formatting the font

The font is formatted with the **`style`** attribute, made of `name: value` pairs separated by **`;`**:

| Property | Example | Meaning |
|---|---|---|
| `color` | `color:red` | text colour (an English colour name or an RGB value) |
| `font-family` | `font-family:Arial` | font name |
| `font-size` | `font-size:20px` | font size: a number with a unit (px, mm, cm,...) or a common size (small, medium, large,...) |

```html
<p style="color:blue; font-family:Arial; font-size:20px">Informatics 12</p>
```

A colour value can be an English name (`red`, `green`, `blue`, `grey`, `yellow`, `black`, `brown`,...) or an RGB value such as `rgb(205, 0, 0)`.""",
    ),
    web_block(
        sim("Thuộc tính style đổi màu, phông và cỡ chữ", "The style attribute changes colour, font and size", "Mỗi phần tử có thuộc tính style riêng; bấm Thử sửa để đổi màu và cỡ chữ.", "Each element has its own style attribute; press Try editing to change colour and size."),
        """<h2 style="color:rgb(205, 0, 0); text-align:center">Bài thơ</h2>
<p style="font-family:Georgia; font-size:20px">Muốn sang thì bắc cầu kiều</p>
<p style="color:green; font-size:16px">Muốn con hay chữ phải yêu lấy thầy.</p>
<p style="color:blue; font-size:24px">Chữ <span style="color:brown">nâu</span> nằm trong dòng chữ xanh.</p>""",
        "",
        340,
    ),
    T(
        """### Tóm tắt và tự kiểm tra

| Nội dung | Ghi nhớ |
|---|---|
| Thuộc tính | `tên="giá trị"`, nằm trong thẻ bắt đầu, cách nhau bằng dấu cách |
| Tiêu đề | `<h1>` đến `<h6>`, `<h1>` lớn nhất |
| Đoạn văn | `<p>`; `<br>` xuống dòng; `<hr>` kẻ ngang |
| Khối | `<div>` xuống dòng mới; `<span>` cùng dòng |
| Kiểu chữ | `<b>` `<strong>` `<i>` `<em>` `<mark>` `<small>` `<del>` `<ins>` `<sub>` `<sup>` |
| Phông chữ | `style="color:...; font-family:...; font-size:..."` |

**Tự kiểm tra:** để hiển thị H<sub>2</sub>SO<sub>4</sub> em viết thế nào? (đáp án: `H<sub>2</sub>SO<sub>4</sub>`).""",
        """### Summary and self-check

| Topic | Remember |
|---|---|
| Attribute | `name="value"`, in the start tag, separated by spaces |
| Headings | `<h1>` to `<h6>`, `<h1>` is the largest |
| Paragraph | `<p>`; `<br>` line break; `<hr>` rule |
| Block | `<div>` on a new line; `<span>` inline |
| Text style | `<b>` `<strong>` `<i>` `<em>` `<mark>` `<small>` `<del>` `<ins>` `<sub>` `<sup>` |
| Font | `style="color:...; font-family:...; font-size:..."` |

**Self-check:** how do you display H<sub>2</sub>SO<sub>4</sub>? (answer: `H<sub>2</sub>SO<sub>4</sub>`).""",
    ),
]

questions = [
    mc("tin12-b08-mc-01", 1, "Thuộc tính nào dùng để thiết lập màu sắc, phông chữ, cỡ chữ, căn lề,... cho một phần tử HTML?", "Which attribute sets colour, font, font size, alignment,... of an HTML element?",
       "Thuộc tính style dùng để thiết lập các định dạng cho phần tử HTML.", "The style attribute sets the formatting of an HTML element.", "B",
       ("format", "format"), ("style", "style"), ("design", "design"), ("set", "set")),
    mc("tin12-b08-mc-02", 1, "Cách khai báo thuộc tính nào đúng?", "Which way of declaring an attribute is correct?",
       "Thuộc tính nằm trong thẻ bắt đầu, sau tên thẻ, theo cú pháp tên=\"giá trị\".", "An attribute sits in the start tag, after the tag name, as name=\"value\".", "D",
       ("<p style: red>Nội dung</p>", "<p style: red>Content</p>"), ("<style p=\"color:red\">Nội dung</p>", "<style p=\"color:red\">Content</p>"), ("<p>Nội dung</p style=\"color:red\">", "<p>Content</p style=\"color:red\">"), ("<p style=\"color:red\">Nội dung</p>", "<p style=\"color:red\">Content</p>")),
    mc("tin12-b08-mc-03", 1, "Tiêu đề chính hay tiêu đề chung của cả văn bản nên dùng thẻ nào?", "Which tag should hold the main title of the whole document?",
       "Thẻ h1 dành cho tiêu đề chính; các mức thấp hơn dùng h2 đến h6.", "h1 is for the main title; lower levels use h2 to h6.", "A",
       ("<h1>", "<h1>"), ("<h6>", "<h6>"), ("<p>", "<p>"), ("<div>", "<div>")),
    mc("tin12-b08-mc-04", 1, "Trình duyệt hiển thị nội dung trong cặp thẻ <p>…</p> như thế nào?", "How does the browser show the content inside <p>…</p>?",
       "Nội dung đoạn hiện trên dòng mới, kèm khoảng trống nhỏ trước và sau đoạn.", "The paragraph appears on a new line with a small gap before and after.", "C",
       ("Cùng dòng với nội dung trước, không có khoảng trống", "On the same line as before, with no gap"), ("Luôn in đậm và căn giữa", "Always bold and centred"), ("Trên dòng mới, có khoảng trống nhỏ trước và sau", "On a new line, with a small gap before and after"), ("Không hiển thị gì", "Nothing is shown")),
    mc("tin12-b08-mc-05", 2, "Đoạn mã nào hiển thị đúng công thức H₂SO₄ (chỉ số dưới)?", "Which code shows the formula H₂SO₄ (subscripts) correctly?",
       "Thẻ sub tạo chỉ số dưới; sup là chỉ số trên, small chỉ làm chữ nhỏ và down không có trong HTML.", "sub makes a subscript; sup is a superscript, small only shrinks text and down does not exist in HTML.", "A",
       ("<p>H<sub>2</sub>SO<sub>4</sub></p>", "<p>H<sub>2</sub>SO<sub>4</sub></p>"), ("<p>H<sup>2</sup>SO<sup>4</sup></p>", "<p>H<sup>2</sup>SO<sup>4</sup></p>"), ("<p>H<small>2</small>SO<small>4</small></p>", "<p>H<small>2</small>SO<small>4</small></p>"), ("<p>H<down>2</down>SO<down>4</down></p>", "<p>H<down>2</down>SO<down>4</down></p>")),
    mc("tin12-b08-mc-06", 2, "HTML5 không còn hỗ trợ thẻ nào sau đây?", "Which tag is no longer supported by HTML5?",
       "Thẻ big không còn được hỗ trợ; muốn chữ to hơn dùng font-size trong style.", "big is no longer supported; use font-size in style to enlarge text.", "B",
       ("<em>", "<em>"), ("<big>", "<big>"), ("<strong>", "<strong>"), ("<del>", "<del>")),
    mc("tin12-b08-mc-07", 2, "Cách viết nào làm tiêu đề “Lịch sử HTML” có chữ đỏ và đậm?", "Which code makes the title “History of HTML” red and bold?",
       "Dùng h1 cho tiêu đề, color:red cho màu đỏ và strong cho chữ đậm.", "Use h1 for the title, color:red for red and strong for bold.", "D",
       ("<h1 style=\"color:red\"><em>Lịch sử HTML</em></h1>", "<h1 style=\"color:red\"><em>History of HTML</em></h1>"), ("<p style=\"color:red\"><strong>Lịch sử HTML</strong></p>", "<p style=\"color:red\"><strong>History of HTML</strong></p>"), ("<h1 style=\"red\"><strong>Lịch sử HTML</strong></h1>", "<h1 style=\"red\"><strong>History of HTML</strong></h1>"), ("<h1 style=\"color:red\"><strong>Lịch sử HTML</strong></h1>", "<h1 style=\"color:red\"><strong>History of HTML</strong></h1>")),
    mc("tin12-b08-mc-08", 2, "Phần tử nào là một khối, bắt đầu trên dòng mới?", "Which element is a block that starts on a new line?",
       "Phần tử div là khối bắt đầu trên dòng mới; span hiển thị cùng dòng.", "div is a block starting on a new line; span stays on the same line.", "C",
       ("<span>", "<span>"), ("<b>", "<b>"), ("<div>", "<div>"), ("<small>", "<small>")),
    mc("tin12-b08-mc-09", 2, "Trong thuộc tính style, các cặp tên: giá trị ngăn cách nhau bằng dấu nào?", "In the style attribute, which sign separates the name: value pairs?",
       "Các cặp định dạng trong style ngăn cách bằng dấu chấm phẩy.", "The pairs in style are separated by semicolons.", "A",
       (";", ";"), (",", ","), (".", "."), ("/", "/")),
    mc("tin12-b08-mc-10", 2, "So với thẻ <p>, khoảng cách giữa hai dòng khi dùng <br> mặc định như thế nào?", "Compared with <p>, what is the default gap between two lines made with <br>?",
       "Mặc định, khoảng cách giữa hai dòng dùng br nhỏ hơn so với p (đều có thể chỉnh bằng CSS).", "By default the gap with br is smaller than with p (both can be adjusted with CSS).", "D",
       ("Lớn hơn", "Larger"), ("Bằng nhau", "The same"), ("br không xuống dòng", "br does not break the line"), ("Nhỏ hơn", "Smaller")),
    mc("tin12-b08-mc-11", 2, "Đoạn <p style=\"font-size:20px; color:blue\">Tin học</p> hiển thị như thế nào?", "How is <p style=\"font-size:20px; color:blue\">Informatics</p> shown?",
       "Thuộc tính style đặt cỡ chữ 20 pixel và màu xanh dương cho đoạn.", "The style attribute sets a 20 pixel size and blue colour.", "C",
       ("Chữ đỏ, cỡ 20 pixel", "Red text, 20 pixels"), ("Chữ xanh dương, in đậm", "Blue text, bold"), ("Chữ xanh dương, cỡ 20 pixel", "Blue text, 20 pixels"), ("Chữ đen, cỡ 20 pixel", "Black text, 20 pixels")),
    mc("tin12-b08-mc-12", 3, "Trong <div style=\"color:red\"><p>Xin <span style=\"font-size:20px\">chào</span></p><hr></div> có bao nhiêu thẻ bắt đầu mang thuộc tính?", "In <div style=\"color:red\"><p>Hi <span style=\"font-size:20px\">there</span></p><hr></div>, how many start tags carry an attribute?",
       "Chỉ có div và span có thuộc tính style; p và hr không có, nên là 2 thẻ.", "Only div and span carry a style attribute; p and hr do not, so 2 tags.", "B",
       ("1", "1"), ("2", "2"), ("3", "3"), ("4", "4")),
]

truefalse = [
    tf("tin12-b08-tf-01", 1, "Xét thuộc tính của thẻ HTML.", "Consider HTML tag attributes.",
       "Thẻ có thể không có thuộc tính; thuộc tính nằm trong thẻ bắt đầu theo cú pháp tên=\"giá trị\" và ngăn cách bằng dấu cách.", "A tag may have no attribute; attributes sit in the start tag as name=\"value\" and are separated by spaces.",
       ("Mỗi thẻ HTML đều phải có thuộc tính.", "Every HTML tag must have an attribute.", False),
       ("Cú pháp xác định thuộc tính là tên_thuộc_tính=\"giá trị\".", "The syntax of an attribute is attribute_name=\"value\".", True),
       ("Thuộc tính có thể nằm trong thẻ kết thúc.", "An attribute can sit in the end tag.", False),
       ("Thẻ có nhiều thuộc tính thì các thuộc tính ngăn cách bởi dấu cách.", "When a tag has several attributes they are separated by spaces.", True)),
    tf("tin12-b08-tf-02", 2, "Xét tiêu đề và đoạn văn.", "Consider headings and paragraphs.",
       "Có 6 mức tiêu đề, h1 là chính; p không chứa tiêu đề; công cụ tìm kiếm dùng thẻ hx để hiểu cấu trúc trang.", "There are 6 heading levels with h1 the main one; p cannot hold headings; search engines use hx to understand page structure.",
       ("HTML có 6 mức tiêu đề, từ <h1> đến <h6>.", "HTML has 6 heading levels, <h1> to <h6>.", True),
       ("Thẻ <h1> dùng cho tiêu đề chính của văn bản.", "<h1> is for the main title of the document.", True),
       ("Phần tử <p> có thể chứa thẻ <h1> bên trong.", "A <p> element may contain an <h1>.", False),
       ("Công cụ tìm kiếm dùng thẻ <hx> để xác định cấu trúc trang.", "Search engines use <hx> to find the structure of a page.", True)),
    tf("tin12-b08-tf-03", 2, "Xét các thẻ định dạng kiểu chữ.", "Consider tags that format text style.",
       "strong, em mang ý nhấn mạnh; sub là chỉ số dưới (sup mới là chỉ số trên); del gạch ngang; big không còn được HTML5 hỗ trợ.", "strong and em carry emphasis; sub is a subscript (sup is the superscript); del strikes through; big is no longer supported in HTML5.",
       ("<strong> và <em> mang ý nghĩa nhấn mạnh nội dung.", "<strong> and <em> carry the meaning of emphasis.", True),
       ("<sub> tạo chỉ số trên.", "<sub> makes a superscript.", False),
       ("<del> hiển thị chữ bị gạch ngang.", "<del> shows struck-through text.", True),
       ("Thẻ <big> vẫn được HTML5 hỗ trợ.", "<big> is still supported in HTML5.", False)),
    tf("tin12-b08-tf-04", 2, "Xét thuộc tính style.", "Consider the style attribute.",
       "color đặt màu chữ, font-size đặt cỡ chữ; nhiều định dạng ngăn cách bằng dấu chấm phẩy; style dùng được cho nhiều phần tử.", "color sets the text colour, font-size sets the size; formats are separated by semicolons; style works on many elements.",
       ("style=\"color:red\" làm chữ có màu đỏ.", "style=\"color:red\" makes the text red.", True),
       ("font-size:15px đặt cỡ chữ 15 pixel.", "font-size:15px sets a font size of 15 pixels.", True),
       ("Nhiều định dạng trong style ngăn cách bằng dấu phẩy.", "Several formats in style are separated by commas.", False),
       ("Thuộc tính style chỉ dùng được với thẻ <p>.", "The style attribute only works with <p>.", False)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
