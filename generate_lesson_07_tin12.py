# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_07_tin12.py
from generate_tin_common import T, build, configure, mc, tf, web_block

configure(12, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers", "Tin học ứng dụng")

slug = "html-va-cau-truc-trang-web-bai-7-tin12"
title_vi = "Bài 7. HTML và cấu trúc trang web"
title_en = "Lesson 7. HTML and the structure of a web page"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


blocks = [
    T(
        "### Mục tiêu bài học\n\nSau bài này, bạn có thể:\n\n- giải thích **HTML** là gì, phân biệt **thẻ** và **phần tử** HTML;\n- nêu được cấu trúc cơ bản của một tệp HTML: `html`, `head`, `body`;\n- dùng các thẻ tiêu đề, đoạn văn, in đậm, in nghiêng, ngắt dòng và kẻ ngang;\n- soạn một tệp HTML và mở bằng trình duyệt.",
        "### Learning goals\n\nAfter this lesson, you can:\n\n- explain what **HTML** is and tell a **tag** from an **element**;\n- describe the basic structure of an HTML file: `html`, `head`, `body`;\n- use heading, paragraph, bold, italic, line-break and horizontal-rule tags;\n- write an HTML file and open it in a browser.",
    ),
    T(
        "### 1. HTML, thẻ và phần tử\n\n**HTML** (*HyperText Markup Language*, ngôn ngữ đánh dấu siêu văn bản) là bộ quy tắc dùng để thiết lập cấu trúc và nội dung của trang web. Tệp HTML là **tệp văn bản** gồm chữ thường và các kí tự đánh dấu đặc biệt nằm trong cặp dấu `<` và `>`, gọi là **thẻ** (tag).\n\n- Thẻ mở đầu: `<p>`; thẻ kết thúc có thêm dấu `/`: `</p>`.\n- **Phần tử** HTML (element) gồm *thẻ bắt đầu + nội dung + thẻ kết thúc*, ví dụ `<p>Xin chào</p>`.\n- Một số thẻ chỉ có một mình (**thẻ đơn**) và không có nội dung: `<br>` (xuống dòng), `<hr>` (đường kẻ ngang).\n- Phần tử có thể **lồng** nhau: `<p>Tôi học <b>Tin học</b> 12</p>`.\n\nTrang web không dùng các thẻ để hiển thị chữ `<p>`; trình duyệt đọc thẻ để biết cách dựng nội dung. Thử bấm chạy mô phỏng để xem trang mọc dần theo từng dòng mã.",
        "### 1. HTML, tags and elements\n\n**HTML** (*HyperText Markup Language*) is the set of rules for describing the structure and content of a web page. An HTML file is a **text file** made of plain text and special markers placed between `<` and `>`, called **tags**.\n\n- An opening tag looks like `<p>`; the closing tag adds a slash: `</p>`.\n- An HTML **element** is *start tag + content + end tag*, for example `<p>Hello</p>`.\n- Some tags stand alone (**void tags**) and have no content: `<br>` (line break), `<hr>` (horizontal rule).\n- Elements can be **nested**: `<p>I study <b>Informatics</b> 12</p>`.\n\nThe browser does not show the text `<p>`; it reads tags to know how to build the content. Run the simulation to watch the page appear line by line.",
    ),
    web_block(
        sim("Trang web đầu tiên", "A first web page", "Mỗi dòng mã tạo một phần tử; phần tử vừa dựng sáng lên trên trang.", "Each line of code builds an element; the element just built glows on the page."),
        """<h1>Lớp 12A</h1>
<p>Chào mừng bạn đến với <b>trang web</b> của lớp.</p>
<hr>
<p>Liên hệ: <i>lop12a@example.edu.vn</i></p>""",
        "",
        340,
    ),
    T(
        "### 2. Cấu trúc cơ bản của tệp HTML\n\nMột tệp HTML có dạng **cây** các phần tử, quan hệ cha – con thể hiện qua việc lồng nhau:\n\n```html\n<!DOCTYPE html>\n<html>\n  <head>\n    <meta charset=\"UTF-8\">\n    <title>Trang của em</title>\n  </head>\n  <body>\n    <h1>Xin chào</h1>\n    <p>Đây là nội dung hiển thị.</p>\n  </body>\n</html>\n```\n\n| Thành phần | Vai trò |\n|---|---|\n| `<!DOCTYPE html>` | dòng khai báo kiểu tệp là HTML, **không phải** phần tử HTML |\n| `<html>` | phần tử **gốc**, chứa toàn bộ trang |\n| `<head>` | thông tin chung của trang: `<meta>`, `<title>` |\n| `<meta charset=\"UTF-8\">` | khai báo bảng mã để hiển thị đúng tiếng Việt |\n| `<body>` | **nội dung hiển thị** của trang |\n\nTrong `<body>`, các thẻ tiêu đề `<h1>` đến `<h6>` có mức quan trọng giảm dần (`<h1>` lớn nhất); `<p>` là một đoạn văn bản hoàn chỉnh.",
        "### 2. Basic structure of an HTML file\n\nAn HTML file is a **tree** of elements; parent–child relations appear as nesting:\n\n```html\n<!DOCTYPE html>\n<html>\n  <head>\n    <meta charset=\"UTF-8\">\n    <title>My page</title>\n  </head>\n  <body>\n    <h1>Hello</h1>\n    <p>This is the visible content.</p>\n  </body>\n</html>\n```\n\n| Part | Role |\n|---|---|\n| `<!DOCTYPE html>` | declares the file type as HTML; it is **not** an HTML element |\n| `<html>` | the **root** element containing the whole page |\n| `<head>` | general page information: `<meta>`, `<title>` |\n| `<meta charset=\"UTF-8\">` | declares the encoding so Vietnamese displays correctly |\n| `<body>` | the **visible content** of the page |\n\nInside `<body>`, the heading tags `<h1>` to `<h6>` go from most to least important (`<h1>` is largest); `<p>` is one complete paragraph.",
    ),
    web_block(
        sim("Các thẻ tiêu đề và đoạn văn lồng nhau", "Headings and nested paragraphs", "Thẻ h1 đến h3 nhỏ dần; thẻ b và i nằm lồng trong thẻ p.", "h1 to h3 shrink in size; b and i are nested inside p."),
        """<div>
  <h1>Tin học 12</h1>
  <h2>Chủ đề: Thiết kế trang web</h2>
  <h3>Bài 7. HTML</h3>
  <p>HTML là ngôn ngữ <b>đánh dấu</b>, không phải ngôn ngữ <i>lập trình</i>.</p>
</div>""",
        "",
        380,
    ),
    T(
        "### 3. Soạn thảo và mở tệp HTML\n\n1. Mở trình soạn thảo văn bản (Notepad++, Visual Studio Code, hoặc Notepad).\n2. Gõ mã HTML, lưu với đuôi **`.html`** (ví dụ `index.html`) và bảng mã **UTF-8**.\n3. Mở tệp bằng trình duyệt (nhấp đúp hoặc kéo thả vào cửa sổ trình duyệt).\n4. Sửa mã, lưu lại, rồi bấm **làm mới** (F5) để thấy thay đổi.\n\nMẹo: nhấn **Ctrl + U** trên một trang web bất kì để xem mã nguồn HTML của trang đó. Trong mô phỏng bên dưới, bấm **Thử sửa** để tự sửa mã và xem trang đổi ngay.",
        "### 3. Writing and opening an HTML file\n\n1. Open a text editor (Notepad++, Visual Studio Code, or Notepad).\n2. Type the HTML, save with the **`.html`** extension (e.g. `index.html`) and **UTF-8** encoding.\n3. Open the file in a browser (double-click or drag it into the browser window).\n4. Edit the code, save, then **refresh** (F5) to see the change.\n\nTip: press **Ctrl + U** on any web page to view its HTML source. In the simulation below, press **Try editing** to change the code yourself and watch the page update.",
    ),
    web_block(
        sim("Thử viết trang của em", "Try your own page", "Bấm Thử sửa, đổi nội dung các thẻ rồi quan sát trang.", "Press Try editing, change the tags' content, and watch the page."),
        """<h1>Giới thiệu bản thân</h1>
<p>Tên em là <b>An</b>, học lớp <i>12A</i>.<br>Em thích môn Tin học.</p>
<hr>
<p>Cảm ơn bạn đã ghé thăm!</p>""",
        "",
        340,
    ),
    T(
        "### Tóm tắt và tự kiểm tra\n\n| Nội dung | Ghi nhớ |\n|---|---|\n| HTML | ngôn ngữ đánh dấu siêu văn bản |\n| Thẻ | nằm trong `<` `>`; thẻ kết thúc có `/` |\n| Phần tử | thẻ bắt đầu + nội dung + thẻ kết thúc |\n| Thẻ đơn | `<br>`, `<hr>` |\n| Cấu trúc | `html` gốc → `head` + `body` |\n| `<!DOCTYPE html>` | không phải phần tử |\n\n**Tự kiểm tra:** đoạn `<body><h1>Tin học</h1><p>Bài <b>7</b></p></body>` có bao nhiêu phần tử HTML? (đáp án: 4 — `body`, `h1`, `p`, `b`).",
        "### Summary and self-check\n\n| Topic | Remember |\n|---|---|\n| HTML | HyperText Markup Language |\n| Tag | inside `<` `>`; the end tag has `/` |\n| Element | start tag + content + end tag |\n| Void tags | `<br>`, `<hr>` |\n| Structure | root `html` → `head` + `body` |\n| `<!DOCTYPE html>` | not an element |\n\n**Self-check:** how many HTML elements are in `<body><h1>Informatics</h1><p>Lesson <b>7</b></p></body>`? (answer: 4 — `body`, `h1`, `p`, `b`).",
    ),
]

questions = [
    mc("tin12-b07-mc-01", 1, "HTML là viết tắt của cụm từ nào?", "What does HTML stand for?",
       "HTML là HyperText Markup Language, ngôn ngữ đánh dấu siêu văn bản.", "HTML is HyperText Markup Language.", "B",
       ("High Tech Modern Language", "High Tech Modern Language"), ("HyperText Markup Language", "HyperText Markup Language"), ("Home Tool Markup Language", "Home Tool Markup Language"), ("Hyperlinks and Text Making Language", "Hyperlinks and Text Making Language")),
    mc("tin12-b07-mc-02", 1, "Thẻ HTML được viết trong cặp dấu nào?", "Between which symbols is an HTML tag written?",
       "Thẻ HTML nằm giữa dấu nhỏ hơn và dấu lớn hơn.", "An HTML tag is written between less-than and greater-than signs.", "A",
       ("< và >", "< and >"), ("( và )", "( and )"), ("{ và }", "{ and }"), ("[ và ]", "[ and ]")),
    mc("tin12-b07-mc-03", 1, "Thẻ nào dùng để tạo một đoạn văn bản?", "Which tag creates a paragraph?",
       "Thẻ p mô tả một đoạn văn bản hoàn chỉnh.", "The p tag describes one complete paragraph.", "C",
       ("<h1>", "<h1>"), ("<br>", "<br>"), ("<p>", "<p>"), ("<hr>", "<hr>")),
    mc("tin12-b07-mc-04", 1, "Phần tử nào chứa nội dung hiển thị của trang web?", "Which element holds the visible content of a page?",
       "Phần tử body chứa nội dung hiển thị; head chứa thông tin chung.", "body holds the visible content; head holds general information.", "D",
       ("<head>", "<head>"), ("<meta>", "<meta>"), ("<title>", "<title>"), ("<body>", "<body>")),
    mc("tin12-b07-mc-05", 2, "Thẻ nào chèn đường kẻ ngang vào trang HTML?", "Which tag inserts a horizontal rule?",
       "Thẻ hr tạo đường kẻ ngang, là thẻ đơn.", "hr creates a horizontal rule and is a void tag.", "B",
       ("<br>", "<br>"), ("<hr>", "<hr>"), ("<qr>", "<qr>"), ("<dr>", "<dr>")),
    mc("tin12-b07-mc-06", 2, "Trong các thẻ tiêu đề, thẻ nào cho chữ lớn nhất?", "Among heading tags, which gives the largest text?",
       "Thẻ h1 là tiêu đề quan trọng nhất, chữ lớn nhất; h6 nhỏ nhất.", "h1 is the most important heading with the largest text; h6 is the smallest.", "A",
       ("<h1>", "<h1>"), ("<h3>", "<h3>"), ("<h6>", "<h6>"), ("<p>", "<p>")),
    mc("tin12-b07-mc-07", 2, "Phát biểu nào đúng về dòng <!DOCTYPE html>?", "Which statement about <!DOCTYPE html> is correct?",
       "Dòng này khai báo kiểu tệp là HTML và không được xem là một phần tử HTML.", "It declares the file type as HTML and is not counted as an HTML element.", "C",
       ("Nó là phần tử gốc của cây HTML", "It is the root element of the HTML tree"), ("Nó nằm trong phần tử head", "It sits inside head"), ("Nó khai báo kiểu tệp và không phải phần tử HTML", "It declares the file type and is not an HTML element"), ("Nó hiển thị tiêu đề trang", "It displays the page title")),
    mc("tin12-b07-mc-08", 2, "Phần tử head thường chứa thông tin nào?", "What does the head element usually contain?",
       "Head chứa thông tin chung của trang như meta và title, không phải nội dung hiển thị chính.", "head holds general information such as meta and title, not the main visible content.", "D",
       ("Các đoạn văn của bài viết", "The article's paragraphs"), ("Các hình ảnh trong trang", "The images on the page"), ("Các đường kẻ ngang", "The horizontal rules"), ("Các phần tử meta và title", "The meta and title elements")),
    mc("tin12-b07-mc-09", 2, "Trong cây HTML, phần tử nào là phần tử gốc?", "In the HTML tree, which element is the root?",
       "Phần tử html chứa toàn bộ nội dung nên là gốc của cây.", "The html element contains everything, so it is the root of the tree.", "A",
       ("<html>", "<html>"), ("<head>", "<head>"), ("<body>", "<body>"), ("<p>", "<p>")),
    mc("tin12-b07-mc-10", 2, "Một phần tử HTML thông thường gồm những phần nào?", "What parts does a typical HTML element have?",
       "Phần tử được định nghĩa bởi thẻ bắt đầu, nội dung nằm giữa và thẻ kết thúc.", "An element is defined by a start tag, the content between, and an end tag.", "B",
       ("Chỉ thẻ bắt đầu", "Only a start tag"), ("Thẻ bắt đầu, nội dung và thẻ kết thúc", "Start tag, content and end tag"), ("Chỉ nội dung văn bản", "Only the text content"), ("Thẻ kết thúc và một ảnh", "An end tag and an image")),
    mc("tin12-b07-mc-11", 2, "Đoạn <p>Xin <b>chào</b> các bạn</p> hiển thị chữ nào in đậm?", "In <p>Xin <b>chào</b> các bạn</p>, which word is bold?",
       "Thẻ b in đậm phần nội dung nằm giữa nó, tức chữ chào.", "The b tag bolds its content, which is the word chào.", "C",
       ("Xin", "Xin"), ("các bạn", "các bạn"), ("chào", "chào"), ("Cả đoạn", "The whole paragraph")),
    mc("tin12-b07-mc-12", 3, "Đoạn <body><h1>Tin học</h1><p>Bài <b>7</b></p></body> có bao nhiêu phần tử HTML?", "How many HTML elements are in <body><h1>Informatics</h1><p>Lesson <b>7</b></p></body>?",
       "Các phần tử gồm body, h1, p và b, tức 4 phần tử (phần chữ không phải phần tử).", "The elements are body, h1, p and b, so 4 (plain text is not an element).", "D",
       ("2", "2"), ("3", "3"), ("5", "5"), ("4", "4")),
]

truefalse = [
    tf("tin12-b07-tf-01", 2, "Xét cấu trúc của tệp HTML.", "Consider the structure of an HTML file.",
       "meta nằm trong head, html là gốc, thẻ tiêu đề h1 là lớn nhất; meta không nằm trong body.", "meta sits in head, html is the root, h1 is the largest heading; meta is not in body.",
       ("Phần tử <meta> nằm trong phần tử <head>.", "The <meta> element is inside <head>.", True),
       ("Trong cây HTML, phần tử <html> là phần tử gốc.", "In the HTML tree, <html> is the root element.", True),
       ("Phần tử <meta> nằm trong phần tử <body>.", "The <meta> element is inside <body>.", False),
       ("<h1> là tiêu đề cấp lớn nhất, <h6> nhỏ nhất.", "<h1> is the largest heading and <h6> the smallest.", True)),
    tf("tin12-b07-tf-02", 2, "Xét ngôn ngữ HTML.", "Consider the HTML language.",
       "HTML là ngôn ngữ đánh dấu, tệp HTML là tệp văn bản và trình duyệt dựng trang từ mã đó.", "HTML is a markup language, an HTML file is plain text, and the browser builds the page from it.",
       ("HTML là ngôn ngữ đánh dấu siêu văn bản.", "HTML is a hypertext markup language.", True),
       ("Tệp HTML là một tệp văn bản.", "An HTML file is a text file.", True),
       ("Chỉ mở được tệp HTML bằng phần mềm Word.", "An HTML file can only be opened with Word.", False),
       ("Trình duyệt đọc mã HTML để dựng trang web.", "The browser reads HTML to build the web page.", True)),
    tf("tin12-b07-tf-03", 2, "Xét dòng <!DOCTYPE html> và các phần tử.", "Consider <!DOCTYPE html> and elements.",
       "DOCTYPE không phải phần tử; html chứa head và body; body chứa nội dung hiển thị.", "DOCTYPE is not an element; html contains head and body; body holds the visible content.",
       ("<!DOCTYPE html> là một phần tử HTML.", "<!DOCTYPE html> is an HTML element.", False),
       ("Phần tử <html> chứa phần tử <head> và <body>.", "The <html> element contains <head> and <body>.", True),
       ("Phần tử <body> chứa nội dung hiển thị của trang.", "The <body> element holds the visible content of the page.", True),
       ("Các phần tử HTML có thể lồng nhau.", "HTML elements can be nested.", True)),
    tf("tin12-b07-tf-04", 2, "Xét thẻ đơn và thẻ kết thúc.", "Consider void tags and end tags.",
       "Thẻ kết thúc có thêm dấu gạch chéo; br và hr là thẻ đơn.", "An end tag adds a slash; br and hr are void tags.",
       ("<br> là thẻ đơn dùng để xuống dòng.", "<br> is a void tag used for a line break.", True),
       ("Phần tử <p> có thẻ kết thúc là </p>.", "The <p> element ends with </p>.", True),
       ("Thẻ kết thúc viết giống hệt thẻ bắt đầu, không có dấu /.", "The end tag is identical to the start tag, with no /.", False),
       ("<hr> tạo ra một đường kẻ ngang.", "<hr> creates a horizontal rule.", True)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
