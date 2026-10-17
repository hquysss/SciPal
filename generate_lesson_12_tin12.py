# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_12_tin12.py
from generate_tin_common import T, build, configure, mc, tf, web_block

configure(12, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers", "Tin học ứng dụng")

slug = "tao-bieu-mau-bai-12-tin12"
title_vi = "Bài 12. Tạo biểu mẫu"
title_en = "Lesson 12. Creating forms"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


blocks = [
    T(
        """### Mục tiêu bài học

Sau bài này, bạn có thể:

- giải thích **biểu mẫu web** dùng để làm gì và gồm những thành phần nào;
- tạo biểu mẫu bằng thẻ `<form>` cùng các phần tử `label`, `input`, `select`, `textarea`;
- chọn đúng `type` của `input` (text, password, radio, checkbox, button, file);
- nhóm các thông tin liên quan bằng `fieldset` và `legend`.""",
        """### Learning goals

After this lesson, you can:

- explain what a **web form** is for and what parts it has;
- build a form with `<form>` and the elements `label`, `input`, `select`, `textarea`;
- pick the right `type` of `input` (text, password, radio, checkbox, button, file);
- group related information with `fieldset` and `legend`.""",
    ),
    T(
        """### 1. Biểu mẫu web

**Biểu mẫu web** (phần tử `form` của HTML) là công cụ **thu thập dữ liệu** từ người dùng: đăng kí tài khoản, mua hàng, tìm kiếm thông tin, góp ý,...

Một biểu mẫu web đầy đủ gồm hai thành phần:

- **Biểu mẫu hiển thị trên trang**: do mã HTML tạo ra, để người dùng nhập và gửi thông tin;
- **Ứng dụng hoặc script xử lí dữ liệu**: thường chạy trên máy chủ, **không thuộc phạm vi HTML**.

Biểu mẫu được tạo bằng cặp thẻ `<form>…</form>`, bên trong chứa các phần tử như `input`, `label`, `select`, `textarea`; ngoài ra còn `fieldset`, `legend`, `datalist`,...""",
        """### 1. Web forms

A **web form** (the HTML `form` element) is a tool to **collect data** from users: signing up, buying, searching, giving feedback,...

A complete web form has two parts:

- **The form shown on the page**: made by HTML so users can enter and send information;
- **An application or script that processes the data**: usually running on a server and **outside the scope of HTML**.

A form is built with the pair `<form>…</form>`, which holds elements such as `input`, `label`, `select`, `textarea`; there are also `fieldset`, `legend`, `datalist`,...""",
    ),
    T(
        """### 1a. `label` và `input`

```html
<form>
  <label for="ten">Họ và tên:</label>
  <input type="text" id="ten" name="ho_ten">
</form>
```

- **`label`** định nghĩa nhãn. Nháy chuột vào nhãn, con trỏ chuột được đưa vào ô `input` có `id` trùng với thuộc tính **`for`** của nhãn.
- **`input`** (thẻ đơn) xác định vùng nhập dữ liệu. Nó chỉ nhập dữ liệu; muốn biết nhập gì phải kèm `label`.
- **`name`**: tham chiếu tới dữ liệu đã nhập khi tính toán hoặc gửi tới máy chủ.
- **`type`**: loại dữ liệu mà `input` chứa:

| `type` | Tạo ra |
|---|---|
| `text` | ô nhập văn bản một dòng |
| `password` | ô nhập mật khẩu, kí tự gõ vào bị che |
| `radio` | nút chọn **một** trong nhóm (các nút cùng `name`) |
| `checkbox` | ô tích chọn có / không, chọn được **nhiều** |
| `button` | nút bấm, nhãn đặt ở `value` |
| `file` | chọn tệp từ máy để tải lên |""",
        """### 1a. `label` and `input`

```html
<form>
  <label for="ten">Full name:</label>
  <input type="text" id="ten" name="ho_ten">
</form>
```

- **`label`** defines a caption. Click the caption and the cursor jumps into the `input` whose `id` equals the label's **`for`** attribute.
- **`input`** (a void tag) defines a data-entry area. It only takes input; to say what to enter, pair it with a `label`.
- **`name`**: refers to the entered data in calculations or when sending to the server.
- **`type`**: the kind of data the `input` holds:

| `type` | Creates |
|---|---|
| `text` | a one-line text box |
| `password` | a password box; typed characters are hidden |
| `radio` | a button choosing **one** of a group (buttons share one `name`) |
| `checkbox` | a yes/no tick box; **several** can be ticked |
| `button` | a push button, caption set in `value` |
| `file` | picks a file from the computer to upload |""",
    ),
    web_block(
        sim("Biểu mẫu với label và input", "A form with label and input", "Mỗi label đi cùng một input; for của nhãn khớp id của ô nhập, type quyết định loại ô.", "Each label comes with an input; the label's for matches the input's id and type decides the kind of box."),
        """<h3>Đăng kí tài khoản</h3>
<form>
  <p><label for="ten">Họ và tên:</label>
  <input type="text" id="ten" name="ho_ten"></p>
  <p><label for="mk">Mật khẩu:</label>
  <input type="password" id="mk" name="mat_khau"></p>
  <p><label for="anh">Ảnh đại diện:</label>
  <input type="file" id="anh" name="anh"></p>
  <p><input type="button" value="Quên mật khẩu"></p>
</form>""",
        "",
        380,
    ),
    T(
        """### 1b. Chọn một hay nhiều giá trị: `radio`, `checkbox`, `select`

| Phần tử | Chọn được | Khi nào dùng |
|---|---|---|
| `input type="radio"` | **một** giá trị trong nhóm | ít lựa chọn (thường không quá 7); các nút cùng `name` |
| `select` + `option` | **một** giá trị trong danh sách thả xuống | nhiều lựa chọn (thường hơn 7), tiết kiệm chỗ |
| `input type="checkbox"` | **nhiều** giá trị, mỗi giá trị có / không | chọn tập hợp sở thích, môn học,... |

- `radio` và `checkbox` là hai kiểu của phần tử `input`; còn `select` là một phần tử riêng, mỗi lựa chọn là một thẻ `<option>`.
- **`textarea`**: ô nhập văn bản **nhiều dòng**, ví dụ phần ghi chú.""",
        """### 1b. Choosing one or many values: `radio`, `checkbox`, `select`

| Element | Lets you pick | When to use |
|---|---|---|
| `input type="radio"` | **one** value in a group | few options (usually up to 7); buttons share one `name` |
| `select` + `option` | **one** value from a drop-down list | many options (usually more than 7), saves space |
| `input type="checkbox"` | **many** values, each yes / no | picking a set of hobbies, subjects,... |

- `radio` and `checkbox` are two kinds of the `input` element; `select` is a separate element and each choice is an `<option>` tag.
- **`textarea`**: a **multi-line** text box, for example a note field.""",
    ),
    web_block(
        sim("Radio, checkbox, select và textarea", "Radio, checkbox, select and textarea", "Hai nút radio cùng name nên chỉ chọn được một; checkbox chọn được nhiều; select là danh sách thả xuống.", "The two radio buttons share a name so only one can be picked; checkboxes allow many; select is a drop-down list."),
        """<form>
  <p>Giới tính:
  <input type="radio" id="nam" name="gt" value="nam"><label for="nam">Nam</label>
  <input type="radio" id="nu" name="gt" value="nu"><label for="nu">Nữ</label></p>
  <p>Môn yêu thích:
  <input type="checkbox" id="m1" name="mon" value="toan"><label for="m1">Toán</label>
  <input type="checkbox" id="m2" name="mon" value="tin"><label for="m2">Tin học</label>
  <input type="checkbox" id="m3" name="mon" value="van"><label for="m3">Ngữ văn</label></p>
  <p><label for="lop">Lớp:</label>
  <select id="lop" name="lop">
    <option value="12A">12A</option>
    <option value="12B">12B</option>
    <option value="12C">12C</option>
  </select></p>
  <p><label for="gc">Ghi chú:</label><br>
  <textarea id="gc" name="gc" rows="3" cols="30"></textarea></p>
</form>""",
        "",
        480,
    ),
    T(
        """### 2. Thực hành: biểu mẫu đăng kí môn thi

Để biểu mẫu dài dễ nhìn, nhóm các thông tin cùng chủ đề trong **`<fieldset>`**, đặt tiêu đề của nhóm bằng **`<legend>`**; tiêu đề cả trang dùng `<h1>`.

```html
<h1>Đăng kí môn thi tốt nghiệp</h1>
<form>
  <fieldset>
    <legend>Thông tin thí sinh</legend>
    <label for="hoten">Họ và tên:</label>
    <input type="text" id="hoten" name="ho_ten">
  </fieldset>
  <fieldset>
    <legend>Môn thi tự chọn</legend>
    <input type="checkbox" id="ly" name="mon" value="ly"><label for="ly">Vật lí</label>
    <input type="checkbox" id="tin" name="mon" value="tin"><label for="tin">Tin học</label>
  </fieldset>
</form>
```

Quy trình: (1) xác định các thông tin cần thu thập; (2) chọn phần tử và `type` phù hợp cho từng thông tin; (3) nhóm bằng `fieldset`, thêm tiêu đề.""",
        """### 2. Practice: an exam subject registration form

To keep a long form readable, group same-topic information in **`<fieldset>`** and title the group with **`<legend>`**; use `<h1>` for the page title.

```html
<h1>Graduation exam registration</h1>
<form>
  <fieldset>
    <legend>Candidate information</legend>
    <label for="hoten">Full name:</label>
    <input type="text" id="hoten" name="ho_ten">
  </fieldset>
  <fieldset>
    <legend>Elective subjects</legend>
    <input type="checkbox" id="ly" name="mon" value="ly"><label for="ly">Physics</label>
    <input type="checkbox" id="tin" name="mon" value="tin"><label for="tin">Informatics</label>
  </fieldset>
</form>
```

Procedure: (1) decide what information to collect; (2) choose a suitable element and `type` for each item; (3) group with `fieldset` and add titles.""",
    ),
    web_block(
        sim("Biểu mẫu đăng kí môn thi tốt nghiệp", "A graduation exam registration form", "fieldset khoanh khung cho từng nhóm thông tin, legend là tiêu đề của khung.", "fieldset draws a frame around each group, legend is the frame's title."),
        """<h2>Đăng kí môn thi tốt nghiệp</h2>
<form>
  <fieldset>
    <legend>Thông tin thí sinh</legend>
    <p><label for="hoten">Họ và tên:</label>
    <input type="text" id="hoten" name="ho_ten"></p>
    <p><label for="khoi">Khối thi:</label>
    <select id="khoi" name="khoi">
      <option value="tn">Khoa học tự nhiên</option>
      <option value="xh">Khoa học xã hội</option>
    </select></p>
  </fieldset>
  <fieldset>
    <legend>Môn thi tự chọn</legend>
    <input type="checkbox" id="ly" name="mon" value="ly"><label for="ly">Vật lí</label>
    <input type="checkbox" id="tin" name="mon" value="tin"><label for="tin">Tin học</label>
    <input type="checkbox" id="su" name="mon" value="su"><label for="su">Lịch sử</label>
  </fieldset>
  <p><input type="button" value="Đăng kí"></p>
</form>""",
        "",
        520,
    ),
    T(
        """### Tóm tắt và tự kiểm tra

| Nội dung | Ghi nhớ |
|---|---|
| Biểu mẫu | `<form>`: thu thập dữ liệu; xử lí dữ liệu ở script, không thuộc HTML |
| Nhãn | `<label for="id">` gắn với `input` có `id` trùng |
| Ô nhập | `<input type name>`: text, password, radio, checkbox, button, file |
| Một lựa chọn | `radio` (cùng `name`) hoặc `select` + `option` |
| Nhiều lựa chọn | `checkbox` |
| Nhiều dòng | `textarea` |
| Nhóm | `fieldset` + `legend` |

**Tự kiểm tra:** muốn thêm nút “Quên mật khẩu” vào biểu mẫu thì viết thế nào? (đáp án: `<input type="button" value="Quên mật khẩu">`).""",
        """### Summary and self-check

| Topic | Remember |
|---|---|
| Form | `<form>`: collects data; processing is done by scripts, outside HTML |
| Caption | `<label for="id">` ties to the `input` with the same `id` |
| Entry box | `<input type name>`: text, password, radio, checkbox, button, file |
| One choice | `radio` (same `name`) or `select` + `option` |
| Many choices | `checkbox` |
| Many lines | `textarea` |
| Grouping | `fieldset` + `legend` |

**Self-check:** how do you add a “Forgot password” button to a form? (answer: `<input type="button" value="Forgot password">`).""",
    ),
]

questions = [
    mc("tin12-b12-mc-01", 1, "Thẻ HTML nào được dùng để tạo biểu mẫu?", "Which HTML tag creates a form?",
       "Biểu mẫu được tạo bởi cặp thẻ form; table tạo bảng và iframe tạo khung nội tuyến.", "A form is made by the form tag; table makes tables and iframe makes inline frames.", "A",
       ("<form>", "<form>"), ("<table>", "<table>"), ("<iframe>", "<iframe>"), ("<model>", "<model>")),
    mc("tin12-b12-mc-02", 1, "Phần tử nào của biểu mẫu xác định vùng nhập dữ liệu và là thẻ đơn?", "Which form element defines a data-entry area and is a void tag?",
       "Phần tử input là thẻ đơn xác định vùng nhập dữ liệu; label chỉ là nhãn.", "input is a void tag defining a data-entry area; label is only a caption.", "C",
       ("name", "name"), ("label", "label"), ("input", "input"), ("legend", "legend")),
    mc("tin12-b12-mc-03", 1, "Thuộc tính for của thẻ <label> phải khớp với thuộc tính nào của <input>?", "The for attribute of <label> must match which attribute of <input>?",
       "Nhãn gắn với ô nhập qua giá trị for của label trùng với id của input.", "A label links to an input when its for value equals the input's id.", "D",
       ("name", "name"), ("type", "type"), ("value", "value"), ("id", "id")),
    mc("tin12-b12-mc-04", 1, "Thuộc tính nào của input dùng để tham chiếu tới dữ liệu đã nhập khi tính toán hay gửi tới máy chủ?", "Which input attribute refers to the entered data when calculating or sending to the server?",
       "name là tên để tham chiếu dữ liệu; type xác định loại dữ liệu.", "name is the reference for the data; type sets the kind of data.", "B",
       ("id", "id"), ("name", "name"), ("value", "value"), ("type", "type")),
    mc("tin12-b12-mc-05", 2, "Để tạo các lựa chọn trong danh sách thả xuống của <select>, ta dùng thẻ nào?", "Which tag creates the choices inside a <select> drop-down list?",
       "Mỗi lựa chọn trong select là một thẻ option.", "Each choice inside select is an option tag.", "C",
       ("<choice>", "<choice>"), ("<div>", "<div>"), ("<option>", "<option>"), ("<item>", "<item>")),
    mc("tin12-b12-mc-06", 2, "Phần tử fieldset được dùng để làm gì?", "What is the fieldset element for?",
       "fieldset nhóm các phần tử có liên quan trong biểu mẫu, thường kèm legend làm tiêu đề.", "fieldset groups related elements in a form, usually with a legend as its title.", "A",
       ("Nhóm các phần tử có liên quan", "Group related elements"), ("Nhập mật khẩu", "Enter a password"), ("Gửi dữ liệu lên máy chủ", "Send data to the server"), ("Tạo danh sách thả xuống", "Create a drop-down list")),
    mc("tin12-b12-mc-07", 2, "Muốn người dùng chọn được nhiều giá trị, mỗi giá trị có hoặc không, ta dùng type nào?", "To let users pick many values, each yes or no, which type do we use?",
       "checkbox là ô tích chọn có hoặc không và cho chọn nhiều giá trị; radio chỉ chọn một.", "checkbox is a yes/no tick box allowing many values; radio picks only one.", "D",
       ("text", "text"), ("radio", "radio"), ("password", "password"), ("checkbox", "checkbox")),
    mc("tin12-b12-mc-08", 2, "Muốn kí tự người dùng gõ vào bị che đi, ta đặt type nào cho input?", "To hide the characters users type, which type goes on input?",
       "type=\"password\" che kí tự gõ vào, dùng cho mật khẩu hoặc mã OTP.", "type=\"password\" hides what is typed, for passwords or OTP codes.", "B",
       ("text", "text"), ("password", "password"), ("button", "button"), ("file", "file")),
    mc("tin12-b12-mc-09", 2, "Muốn người dùng nhập ghi chú nhiều dòng, ta dùng phần tử nào?", "To let users enter a multi-line note, which element do we use?",
       "textarea là ô nhập văn bản nhiều dòng; input type=text chỉ một dòng.", "textarea is a multi-line text box; input type=text is one line.", "A",
       ("<textarea>", "<textarea>"), ("<legend>", "<legend>"), ("<option>", "<option>"), ("<label>", "<label>")),
    mc("tin12-b12-mc-10", 2, "Đoạn mã nào thêm nút có nhãn “Quên mật khẩu” vào biểu mẫu?", "Which code adds a button labelled “Forgot password” to a form?",
       "Nút bấm là input có type là button và nhãn đặt trong thuộc tính value.", "A push button is an input with type button and its caption in the value attribute.", "C",
       ("<input type=\"text\" value=\"Quên mật khẩu\">", "<input type=\"text\" value=\"Forgot password\">"), ("<label>Quên mật khẩu</label>", "<label>Forgot password</label>"), ("<input type=\"button\" value=\"Quên mật khẩu\">", "<input type=\"button\" value=\"Forgot password\">"), ("<form type=\"button\" value=\"Quên mật khẩu\">", "<form type=\"button\" value=\"Forgot password\">")),
    mc("tin12-b12-mc-11", 2, "Muốn người dùng tải một tệp ảnh từ máy lên, ta dùng input với type nào?", "To let users upload an image file from their computer, which input type do we use?",
       "type=\"file\" cho phép chọn tệp từ máy để tải lên.", "type=\"file\" lets users choose a file from their computer to upload.", "D",
       ("image", "image"), ("text", "text"), ("button", "button"), ("file", "file")),
    mc("tin12-b12-mc-12", 3, "Mã <form><label for=\"a\">Tên</label><input id=\"a\" type=\"text\"><input type=\"button\" value=\"Gửi\"></form> có bao nhiêu phần tử HTML?", "How many HTML elements are in <form><label for=\"a\">Name</label><input id=\"a\" type=\"text\"><input type=\"button\" value=\"Send\"></form>?",
       "Gồm 1 form, 1 label và 2 input, tức 4 phần tử.", "It has 1 form, 1 label and 2 input, so 4 elements.", "B",
       ("3", "3"), ("4", "4"), ("5", "5"), ("6", "6")),
]

truefalse = [
    tf("tin12-b12-tf-01", 2, "Xét khái niệm biểu mẫu web.", "Consider the idea of a web form.",
       "Biểu mẫu thu thập dữ liệu; script xử lí nằm ngoài HTML; input là thẻ đơn; ô có hoặc không là checkbox.", "Forms collect data; processing scripts are outside HTML; input is a void tag; the yes/no box is checkbox.",
       ("Biểu mẫu web là công cụ dùng để thu thập dữ liệu từ người dùng.", "A web form is a tool to collect data from users.", True),
       ("Script xử lí dữ liệu của biểu mẫu thuộc phạm vi ngôn ngữ HTML.", "The script that processes form data is within HTML.", False),
       ("Vùng nhập dữ liệu được xác định bởi cặp thẻ <input></input>.", "A data-entry area is defined by the pair <input></input>.", False),
       ("Kiểu dữ liệu radio tạo ô chọn có hoặc không và cho chọn nhiều giá trị.", "The radio type makes a yes/no box allowing many values.", False)),
    tf("tin12-b12-tf-02", 2, "Xét label và input.", "Consider label and input.",
       "Nháy nhãn đưa con trỏ vào input có id trùng for; name để tham chiếu dữ liệu; input cần label để biết nhập gì; type xác định loại dữ liệu.", "Clicking the label puts the cursor in the input whose id equals for; name refers to data; input needs a label to say what to enter; type sets the data kind.",
       ("Nháy vào label đưa con trỏ vào input có id trùng với for.", "Clicking a label puts the cursor in the input whose id equals its for.", True),
       ("Thuộc tính name dùng để tham chiếu tới dữ liệu đã nhập.", "The name attribute refers to the entered data.", True),
       ("Input tự cho người dùng biết cần nhập gì, không cần label.", "An input tells users what to enter by itself, no label needed.", False),
       ("Thuộc tính type xác định loại dữ liệu mà input chứa.", "The type attribute sets the kind of data the input holds.", True)),
    tf("tin12-b12-tf-03", 2, "Xét radio, checkbox, select.", "Consider radio, checkbox and select.",
       "radio, checkbox là kiểu của input còn select là phần tử riêng; checkbox chọn nhiều; radio cùng name chỉ chọn một; select dùng option.", "radio and checkbox are kinds of input while select is its own element; checkbox allows many; radios sharing a name pick one; select uses option.",
       ("Radio và checkbox là hai kiểu của input, còn select là phần tử riêng.", "radio and checkbox are two kinds of input, while select is its own element.", True),
       ("Checkbox cho phép chọn nhiều giá trị.", "checkbox allows picking many values.", True),
       ("Các nút radio cùng name thì chỉ chọn được một nút trong nhóm.", "Of radio buttons sharing a name, only one can be picked.", True),
       ("Phần tử select không cần dùng thẻ option.", "The select element does not need option tags.", False)),
    tf("tin12-b12-tf-04", 2, "Xét fieldset, legend và textarea.", "Consider fieldset, legend and textarea.",
       "fieldset nhóm phần tử; legend là tiêu đề nhóm; textarea là nhiều dòng; password che kí tự.", "fieldset groups elements; legend titles the group; textarea is multi-line; password hides characters.",
       ("Fieldset dùng để nhóm các phần tử có liên quan trong biểu mẫu.", "fieldset groups related elements in a form.", True),
       ("Legend đặt tiêu đề cho nhóm tạo bởi fieldset.", "legend titles the group made by fieldset.", True),
       ("Textarea chỉ cho nhập được văn bản trên một dòng.", "textarea only allows text on one line.", False),
       ("Input có type là password sẽ che các kí tự gõ vào.", "An input of type password hides typed characters.", True)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
