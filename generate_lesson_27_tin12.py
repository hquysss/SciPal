# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_27_tin12.py
from generate_tin_common import T, build, configure, mc, tf, web_block

configure(12, "Ứng dụng tin học", "Applied informatics", "Tin học ứng dụng")

slug = "bieu-mau-tren-trang-web-bai-27-tin12"
title_vi = "Bài 27. Biểu mẫu trên trang web"
title_en = "Lesson 27. Forms on a web page"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


FORM_HTML = """<form>
  <h2>Ý kiến phản hồi của bạn</h2>
  <p class="req">Câu hỏi có dấu * là bắt buộc trả lời.</p>
  <fieldset>
    <legend>1. Bạn thấy trang web thế nào? *</legend>
    <label><input type="radio" name="q1"> Rất hay</label>
    <label><input type="radio" name="q1"> Bình thường</label>
    <label><input type="radio" name="q1"> Cần cải thiện</label>
  </fieldset>
  <fieldset>
    <legend>2. Bạn thích những nội dung nào? (chọn nhiều)</legend>
    <label><input type="checkbox"> Thiên nhiên</label>
    <label><input type="checkbox"> Ẩm thực</label>
    <label><input type="checkbox"> Văn hoá</label>
  </fieldset>
  <fieldset>
    <legend>3. Bạn muốn góp ý gì thêm?</legend>
    <textarea rows="3"></textarea>
  </fieldset>
  <button type="button">Gửi</button>
</form>"""

FORM_CSS = """h2 { margin: 0 0 4px; font-size: 18px; }
.req { margin: 0 0 8px; font-size: 12px; opacity: .75; }
fieldset { border: 1px solid #94a3b8; border-radius: 8px; margin: 0 0 8px; padding: 6px 12px; }
legend { font-size: 14px; font-weight: 600; padding: 0 4px; }
label { display: block; font-size: 14px; margin: 2px 0; }
textarea { width: 95%; }
button { background: #0f766e; color: #fff; border: 0; border-radius: 6px; padding: 6px 18px; font-size: 14px; }"""

EMBED_HTML = """<section class="post">
  <h2>Mù Cang Chải</h2>
  <p>Mùa lúa chín nhuộm vàng những thửa ruộng bậc thang.</p>
</section>
<section class="embed">
  <span class="tag">Biểu mẫu nhúng từ Google Forms</span>
  <h3>Ý kiến phản hồi của bạn</h3>
  <button type="button">Trả lời</button>
</section>
<p class="note">Sửa câu hỏi trong Forms thì biểu mẫu trên trang tự cập nhật.</p>"""

EMBED_CSS = """section { border: 1px solid #94a3b8; border-radius: 8px; padding: 8px 12px; margin-bottom: 10px; }
.post h2, .embed h3 { margin: 0 0 4px; font-size: 17px; }
.post p { margin: 0; font-size: 14px; }
.embed { background: #ecfdf5; color: #14532d; border-style: dashed; border-color: #0f766e; }
.tag { font-size: 12px; font-weight: 600; }
.embed button { background: #0f766e; color: #fff; border: 0; border-radius: 6px; padding: 5px 16px; }
.note { font-size: 13px; opacity: .8; }"""

RESULT_HTML = """<h2>Bản tóm tắt câu trả lời: 24 phản hồi</h2>
<p class="q">1. Bạn thấy trang web thế nào?</p>
<div class="row">
  <span>Rất hay</span>
  <div class="bar b1"></div>
  <b>15</b>
</div>
<div class="row">
  <span>Bình thường</span>
  <div class="bar b2"></div>
  <b>7</b>
</div>
<div class="row">
  <span>Cần cải thiện</span>
  <div class="bar b3"></div>
  <b>2</b>
</div>"""

RESULT_CSS = """h2 { margin: 0 0 6px; font-size: 18px; }
.q { margin: 0 0 8px; font-weight: 600; }
.row { display: grid; grid-template-columns: 110px 1fr 28px; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 14px; }
.bar { height: 16px; background: #0f766e; border-radius: 3px; }
.b1 { width: 62%; }
.b2 { width: 29%; }
.b3 { width: 8%; }"""

blocks = [
    T(
        "### Mục tiêu bài học\n\nSau bài này, bạn có thể:\n\n- nêu **ý nghĩa** của biểu mẫu trên trang web đối với người dùng và người quản trị trang;\n- tạo biểu mẫu bằng **Google Forms**, chọn **kiểu câu hỏi** phù hợp;\n- **nhúng** biểu mẫu vào trang web làm bằng Google Sites;\n- xem **thống kê phản hồi** (bản tóm tắt, câu hỏi, cá nhân) và tải kết quả về dạng bảng tính;\n- thu thập thông tin người dùng một cách có trách nhiệm.",
        "### Learning goals\n\nAfter this lesson, you can:\n\n- state the **purpose** of a form on a web page for users and for the site administrator;\n- create a form with **Google Forms** and pick suitable **question types**;\n- **embed** a form in a page built with Google Sites;\n- view **response statistics** (summary, question, individual) and download the results as a spreadsheet;\n- collect user information responsibly.",
    ),
    T(
        "### 1. Biểu mẫu trên trang web có ý nghĩa gì?\n\nNhiều trang web dùng **biểu mẫu** để thu thập ý kiến người dùng: đánh giá chất lượng, bình luận bài viết, bình chọn, trả lời câu hỏi so sánh hay chọn một phương án.\n\n- **Với người dùng:** bày tỏ ý kiến, bình luận về bài viết, vấn đề.\n- **Với người quản trị trang web:** thu thập đa dạng ý kiến để hoàn thiện trang; tăng tương tác của người dùng với trang (nhất là với các bài bình chọn).\n\nBiểu mẫu có nhiều dạng cho nhiều mục đích khác nhau, nên cần chọn **kiểu biểu mẫu** và **kiểu câu hỏi** phù hợp. Google cung cấp ứng dụng **Google Forms** để tạo biểu mẫu và có thể **nhúng** biểu mẫu đó vào trang tạo bởi Google Sites.",
        "### 1. What is a form on a web page for?\n\nMany web pages use **forms** to collect user opinions: quality ratings, article comments, polls, comparison questions or choosing among options.\n\n- **For users:** to express opinions and comment on articles and issues.\n- **For the site administrator:** to gather varied opinions to improve the site; to raise user interaction with the site (especially with polls).\n\nForms come in many types for many purposes, so choose a suitable **form type** and **question type**. Google offers **Google Forms** to create forms and the form can be **embedded** in a page made with Google Sites.",
    ),
    T(
        "### 2. Tạo biểu mẫu với Google Forms\n\nVào kho ứng dụng của Google, chọn **Forms**. Có thể bắt đầu từ một mẫu có sẵn trong bộ sưu tập (*Yêu cầu đặt hàng*, *Thông tin liên hệ*, *Ý kiến phản hồi*…) hoặc tạo biểu mẫu mới:\n\n1. Nháy vào *Mẫu không có tiêu đề* để nhập **tiêu đề**, rồi nhập mô tả ngắn.\n2. Tạo câu hỏi: chọn kiểu, nhập câu hỏi, bật **Bắt buộc** nếu cần, nhập các tuỳ chọn và dùng *Thêm tuỳ chọn* hoặc *Câu trả lời khác*.\n3. Nháy nút thêm câu hỏi ở bảng chọn bên phải để tiếp tục.\n\n**Các kiểu câu hỏi thường gặp:**\n\n| Kiểu | Dùng khi |\n|---|---|\n| Trắc nghiệm | chọn **một** phương án |\n| Hộp kiểm (checkbox) | chọn **nhiều** phương án |\n| Menu thả xuống | chọn một mục trong danh sách dài |\n| Trả lời ngắn / Đoạn văn | nhập câu trả lời **ngắn** / **dài, nhiều dòng** |\n| Lưới trắc nghiệm, thang đo tuyến tính | đánh giá nhiều mục hay theo mức độ |\n| Ngày, giờ | nhập thời gian |\n\n**Lời khuyên:** dùng ngôn từ rõ ràng, dễ hiểu; câu hỏi ngắn gọn; ít câu và tập trung vào vấn đề trọng tâm.",
        "### 2. Creating a form with Google Forms\n\nOpen the Google app launcher and choose **Forms**. You can start from a ready-made template in the gallery (*Order request*, *Contact information*, *Feedback*…) or create a new form:\n\n1. Click *Untitled form* to enter the **title**, then a short description.\n2. Create a question: choose its type, type the question, switch on **Required** if needed, enter the options and use *Add option* or *Other*.\n3. Click the add-question button in the right-hand panel to continue.\n\n**Common question types:**\n\n| Type | Use when |\n|---|---|\n| Multiple choice | choosing **one** option |\n| Checkboxes | choosing **several** options |\n| Dropdown | choosing one entry in a long list |\n| Short answer / Paragraph | typing a **short** / **long, multi-line** answer |\n| Multiple-choice grid, linear scale | rating several items or by degree |\n| Date, time | entering a time |\n\n**Advice:** use clear, easy words; keep questions short; ask few questions and focus on the key issue.",
    ),
    web_block(
        sim("Biểu mẫu “Ý kiến phản hồi của bạn”", "The form “Your feedback”", "Câu 1 chọn một phương án (trắc nghiệm), câu 2 chọn nhiều (hộp kiểm), câu 3 trả lời dài; có dấu * cho câu bắt buộc.", "Question 1 picks one option (multiple choice), question 2 picks several (checkboxes), question 3 is a long answer; * marks a required question."),
        FORM_HTML,
        FORM_CSS,
        520,
    ),
    T(
        "### 3. Nhúng biểu mẫu vào trang web\n\nTại sao nên **nhúng** (*embed*) biểu mẫu thẳng vào trang thay vì chỉ để một đường liên kết? Vì người xem **trả lời ngay trên trang**, không phải rời khỏi trang, nên dễ tham gia hơn.\n\nCác bước trong Google Sites: mở trang cần chèn → bảng chọn **Chèn** → **Biểu mẫu** → chọn biểu mẫu đã tạo (ví dụ *Ý kiến phản hồi của bạn*) → **Chèn** ở góc dưới bên phải. Biểu mẫu được thêm vào cuối trang. Sau đó **xuất bản** trang và mở bằng URL để trả lời thử.\n\n**Lưu ý:** khi đổi câu hỏi trong Google Forms, biểu mẫu trên trang web **tự động cập nhật**. Một số biểu mẫu có thể được đặt ở chế độ yêu cầu người trả lời **đăng nhập tài khoản Google**; khi đó người dùng có thể phải có và phải đăng nhập tài khoản Google mới trả lời được.",
        "### 3. Embedding a form in a web page\n\nWhy **embed** a form straight into the page instead of leaving only a link? Because viewers **answer right on the page** without leaving it, so they join in more easily.\n\nSteps in Google Sites: open the page to insert into → the **Insert** menu → **Forms** → choose the form you made (for example *Your feedback*) → **Insert** at the lower right. The form is added at the end of the page. Then **publish** the page and open it by its URL to try answering.\n\n**Notes:** when you change the questions in Google Forms, the form on the web page **updates automatically**. Some forms can be set to require respondents to **sign in to a Google account**; then users may need a Google account and must sign in to answer.",
    ),
    web_block(
        sim("Biểu mẫu nhúng ở cuối trang", "A form embedded at the end of a page", "Biểu mẫu nằm trong một khối riêng bên dưới bài viết, người xem trả lời ngay trên trang.", "The form sits in its own block below the article; viewers answer right on the page."),
        EMBED_HTML,
        EMBED_CSS,
        300,
    ),
    T(
        "### 4. Xem dữ liệu thống kê phản hồi\n\nMở ứng dụng Forms, mở lại biểu mẫu, dòng đầu có **số câu trả lời**. Nháy **Câu trả lời** để xem chi tiết ở ba chế độ:\n\n| Chế độ | Cho biết |\n|---|---|\n| **Bản tóm tắt** | thống kê câu trả lời dạng **biểu đồ** |\n| **Câu hỏi** | thông tin chi tiết cho **từng câu hỏi** |\n| **Cá nhân** | chi tiết câu trả lời của **từng người** |\n\nChọn **Xem trong Trang tính** để thấy toàn bộ trong bảng tính, và có thể **tải xuống** kết quả dạng bảng tính để xử lí tiếp. Từ số liệu và biểu đồ, người quản trị rút ra nhận định để cải tiến nội dung và hình thức trang web.",
        "### 4. Viewing response statistics\n\nOpen the Forms app, reopen the form; the first line shows the **number of responses**. Click **Responses** to see details in three modes:\n\n| Mode | Shows |\n|---|---|\n| **Summary** | response statistics as **charts** |\n| **Question** | detailed information for **each question** |\n| **Individual** | the detailed answers of **each person** |\n\nChoose **View in Sheets** to see everything in a spreadsheet, and **download** the results as a spreadsheet for further work. From the figures and charts the administrator draws conclusions to improve the site's content and form.",
    ),
    web_block(
        sim("Bản tóm tắt câu trả lời dạng biểu đồ", "A summary of responses as a chart", "Mỗi thanh ngang dài theo số phản hồi: 15 + 7 + 2 = 24 phản hồi cho câu 1.", "Each bar's length follows the number of responses: 15 + 7 + 2 = 24 responses to question 1."),
        RESULT_HTML,
        RESULT_CSS,
        300,
    ),
    T(
        "### Thu thập thông tin có trách nhiệm\n\nBiểu mẫu thu thập dữ liệu của người khác, nên cần tôn trọng **quyền riêng tư**:\n\n- chỉ hỏi những thông tin **thật sự cần** cho mục đích khảo sát (góp ý về trang web thì không cần hỏi số căn cước hay địa chỉ nhà);\n- nói rõ **mục đích** sử dụng dữ liệu và ai được xem;\n- chỉ những người quản trị mới được xem và tải câu trả lời; không chia sẻ lung tung.\n\nKhi dựng bộ câu hỏi, có thể nhờ trợ lí AI gợi ý, nhưng em phải tự rà soát để câu hỏi ngắn, rõ, ít và đúng mục tiêu.",
        "### Collecting information responsibly\n\nA form collects other people's data, so respect their **privacy**:\n\n- ask only for information **really needed** for the survey's purpose (feedback on a site does not need an ID number or a home address);\n- state the **purpose** of using the data and who may see it;\n- only administrators should view and download responses; do not share them carelessly.\n\nWhen drafting questions you may ask an AI assistant for ideas, but you must check them yourself so they are short, clear, few and on target.",
    ),
    T(
        "### Tóm tắt và tự kiểm tra\n\n| Nội dung | Ghi nhớ |\n|---|---|\n| Ý nghĩa | người dùng bày tỏ ý kiến; quản trị thu thập ý kiến, tăng tương tác |\n| Công cụ | **Google Forms**; có mẫu sẵn trong bộ sưu tập |\n| Kiểu câu hỏi | trắc nghiệm (một) · hộp kiểm (nhiều) · trả lời ngắn / dài · ngày, giờ… |\n| Nhúng | Google Sites: *Chèn* → *Biểu mẫu* → chọn → *Chèn* |\n| Tự cập nhật | sửa câu hỏi trong Forms, biểu mẫu trên trang đổi theo |\n| Xem kết quả | *Câu trả lời*: **Bản tóm tắt** · **Câu hỏi** · **Cá nhân**; *Xem trong Trang tính* |\n\n**Tự kiểm tra:** muốn cho người trả lời chọn nhiều sở thích cùng lúc thì dùng kiểu câu hỏi nào? (đáp án: hộp kiểm). Để xem câu trả lời của riêng từng người thì chọn chế độ nào? (đáp án: *Cá nhân*).",
        "### Summary and self-check\n\n| Topic | Remember |\n|---|---|\n| Purpose | users express opinions; the administrator collects opinions and raises interaction |\n| Tool | **Google Forms**; ready-made templates in the gallery |\n| Question types | multiple choice (one) · checkboxes (several) · short / long answer · date, time… |\n| Embedding | Google Sites: *Insert* → *Forms* → choose → *Insert* |\n| Auto-update | change a question in Forms and the form on the page follows |\n| Viewing results | *Responses*: **Summary** · **Question** · **Individual**; *View in Sheets* |\n\n**Self-check:** which question type lets respondents choose several hobbies at once? (answer: checkboxes). Which mode shows each person's own answers? (answer: *Individual*).",
    ),
]

questions = [
    mc("tin12-b27-mc-01", 1, "Ứng dụng nào của Google dùng để tạo biểu mẫu nhúng vào trang web Google Sites?", "Which Google application creates forms to embed in a Google Sites page?",
       "Google Forms là ứng dụng tạo biểu mẫu; Word và Docs không tạo biểu mẫu để nhúng như vậy.", "Google Forms is the application that creates forms; Word and Docs do not create forms to embed this way.", "B",
       ("Microsoft Word", "Microsoft Word"), ("Google Forms", "Google Forms"), ("Google Docs", "Google Docs"), ("Google Maps", "Google Maps")),
    mc("tin12-b27-mc-02", 1, "Đối với người quản trị trang web, biểu mẫu có ý nghĩa chính nào?", "For the site administrator, what is the main purpose of a form?",
       "Biểu mẫu giúp thu thập đa dạng ý kiến người dùng để hoàn thiện trang web và tăng tương tác.", "A form helps gather varied user opinions to improve the site and raise interaction.", "C",
       ("Làm trang web tải nhanh hơn", "Make the site load faster"), ("Thay thế logo của trang", "Replace the site's logo"), ("Thu thập ý kiến người dùng để hoàn thiện trang", "Collect user opinions to improve the site"), ("Che giấu nội dung trang", "Hide the site's content")),
    mc("tin12-b27-mc-03", 1, "Trong Google Sites, muốn chèn biểu mẫu đã tạo vào trang, em làm thế nào?", "In Google Sites, how do you insert a form you made into a page?",
       "Mở bảng chọn Chèn, chọn Biểu mẫu, chọn biểu mẫu đã tạo rồi nháy Chèn.", "Open the Insert menu, choose Forms, pick the form you made then click Insert.", "D",
       ("Giao diện, Màu sắc, Biểu mẫu", "Themes, Colours, Forms"), ("Trang, Thêm trang con", "Pages, Add subpage"), ("Công bố, Biểu mẫu", "Publish, Forms"), ("Chèn, Biểu mẫu, chọn biểu mẫu, Chèn", "Insert, Forms, pick the form, Insert")),
    mc("tin12-b27-mc-04", 1, "Khi em thay đổi các câu hỏi trong Google Forms, biểu mẫu đã nhúng trên trang web sẽ như thế nào?", "When you change the questions in Google Forms, what happens to the form already embedded in the web page?",
       "Biểu mẫu trên trang web cũng tự động được cập nhật.", "The form on the web page is updated automatically too.", "A",
       ("Tự động được cập nhật", "It is updated automatically"), ("Bị xoá khỏi trang", "It is removed from the page"), ("Giữ nguyên câu hỏi cũ mãi mãi", "It keeps the old questions forever"), ("Phải chèn lại thủ công mới đổi", "It changes only after being reinserted by hand")),
    mc("tin12-b27-mc-05", 2, "Muốn người trả lời được chọn nhiều phương án cùng lúc cho một câu hỏi, em dùng kiểu câu hỏi nào?", "Which question type lets respondents choose several options at once?",
       "Hộp kiểm (checkbox) cho phép chọn nhiều phương án; trắc nghiệm chỉ chọn một.", "Checkboxes allow several options; multiple choice allows only one.", "B",
       ("Trắc nghiệm", "Multiple choice"), ("Hộp kiểm", "Checkboxes"), ("Trả lời ngắn", "Short answer"), ("Ngày", "Date")),
    mc("tin12-b27-mc-06", 2, "Kiểu câu hỏi nào phù hợp để người trả lời viết nhận xét dài, nhiều dòng?", "Which question type suits a long, multi-line comment?",
       "Câu hỏi dạng đoạn văn (trả lời dài) cho phép nhập nhiều dòng.", "A paragraph (long answer) question allows several lines.", "C",
       ("Trả lời ngắn", "Short answer"), ("Hộp kiểm", "Checkboxes"), ("Đoạn văn (trả lời dài)", "Paragraph (long answer)"), ("Menu thả xuống", "Dropdown")),
    mc("tin12-b27-mc-07", 2, "Chế độ nào trong Câu trả lời hiển thị thống kê dạng biểu đồ?", "Which mode under Responses shows statistics as charts?",
       "Bản tóm tắt thống kê câu trả lời dạng biểu đồ.", "Summary shows response statistics as charts.", "D",
       ("Cá nhân", "Individual"), ("Câu hỏi", "Question"), ("Cài đặt", "Settings"), ("Bản tóm tắt", "Summary")),
    mc("tin12-b27-mc-08", 2, "Để biết thông tin chi tiết về câu trả lời của từng người, em chọn thao tác nào?", "To see the detailed answers of each person, which operation do you choose?",
       "Mở biểu mẫu, chọn Câu trả lời rồi chọn Cá nhân.", "Open the form, choose Responses then Individual.", "A",
       ("Mở biểu mẫu → Câu trả lời → Cá nhân", "Open the form → Responses → Individual"), ("Mở biểu mẫu → Cài đặt → Cá nhân", "Open the form → Settings → Individual"), ("Mở Google Sites → Công bố → Cá nhân", "Open Google Sites → Publish → Individual"), ("Mở biểu mẫu → Gửi → Bản tóm tắt", "Open the form → Send → Summary")),
    mc("tin12-b27-mc-09", 2, "Muốn xem toàn bộ phản hồi trong một bảng tính, em chọn lệnh nào?", "Which command shows all responses in a spreadsheet?",
       "Lệnh Xem trong Trang tính hiển thị toàn bộ câu trả lời dạng bảng tính.", "The View in Sheets command displays all responses as a spreadsheet.", "B",
       ("Xem trước", "Preview"), ("Xem trong Trang tính", "View in Sheets"), ("Thêm trang con", "Add subpage"), ("Thêm chân trang", "Add footer")),
    mc("tin12-b27-mc-10", 2, "Vì sao nên nhúng biểu mẫu vào trang web thay vì chỉ để một đường liên kết?", "Why embed the form in the page rather than leave only a link?",
       "Nhúng cho phép người xem trả lời ngay trên trang mà không phải rời khỏi trang, nên thuận tiện và dễ tham gia hơn.", "Embedding lets viewers answer right on the page without leaving it, which is more convenient and encourages participation.", "C",
       ("Để biểu mẫu không bao giờ thay đổi", "So the form never changes"), ("Để không cần Internet", "So no Internet is needed"), ("Để người xem trả lời ngay trên trang, không phải rời đi", "So viewers answer on the page without leaving"), ("Để ẩn kết quả khỏi người quản trị", "To hide results from the administrator")),
    mc("tin12-b27-mc-11", 2, "Khi tạo câu hỏi trong biểu mẫu của trang web, lời khuyên nào sau đây là đúng?", "When creating questions in a web-page form, which advice is right?",
       "Nên dùng ngôn từ rõ ràng, dễ hiểu; câu hỏi ngắn gọn; ít câu và tập trung vào vấn đề trọng tâm.", "Use clear, easy words; short questions; few questions focused on the key issue.", "D",
       ("Hỏi thật nhiều câu cho đầy đủ", "Ask as many questions as possible to be thorough"), ("Dùng thuật ngữ khó cho chuyên nghiệp", "Use hard jargon to look professional"), ("Câu hỏi càng dài càng rõ", "The longer the question, the clearer"), ("Dùng ngôn từ rõ ràng, câu ngắn gọn, ít câu, tập trung vấn đề chính", "Use clear words, short questions, few of them, on the key issue")),
    mc("tin12-b27-mc-12", 3, "Nhóm làm trang web muốn khảo sát góp ý về nội dung trang. Câu hỏi nào KHÔNG nên đưa vào biểu mẫu?", "A team wants feedback on its site's content. Which question should NOT be put in the form?",
       "Số căn cước công dân là thông tin nhạy cảm và không cần thiết cho việc góp ý về trang web, nên không được thu thập.", "A citizen ID number is sensitive and unnecessary for feedback on a site, so it should not be collected.", "A",
       ("Số căn cước công dân của người trả lời", "The respondent's citizen ID number"), ("Bạn thích mục nào nhất trong trang?", "Which section of the site do you like most?"), ("Bạn thấy màu sắc trang thế nào?", "What do you think of the site's colours?"), ("Bạn muốn xem thêm nội dung nào?", "What more content would you like to see?")),
]

truefalse = [
    tf("tin12-b27-tf-01", 2, "Xét các kiểu câu hỏi trong Google Forms.", "Consider question types in Google Forms.",
       "Có thể lập cả câu trả lời ngắn và dài; câu trả lời dài cho phép nhiều dòng; không chỉ có trả lời ngắn.", "Both short and long answers can be set; long answers allow several lines; short answers are not the only type.",
       ("Có thể lập câu hỏi dạng trả lời văn bản dài.", "A long text answer question can be set.", True),
       ("Chỉ có thể lập câu hỏi dạng trả lời ngắn.", "Only short-answer questions can be set.", False),
       ("Câu hỏi dạng trả lời dài cho phép nhập nhiều dòng.", "A long-answer question allows several lines.", True),
       ("Có thể đặt câu hỏi ở chế độ bắt buộc phải trả lời.", "A question can be set as required.", True)),
    tf("tin12-b27-tf-02", 2, "Xét việc nhúng biểu mẫu vào trang Google Sites.", "Consider embedding a form in a Google Sites page.",
       "Chèn qua bảng chọn Chèn → Biểu mẫu; sửa câu hỏi thì tự cập nhật; cần xuất bản trang để mọi người trả lời; không chỉ được dùng liên kết.", "Insert via Insert → Forms; editing questions updates it; the page must be published for others to answer; a link is not the only way.",
       ("Biểu mẫu được chèn bằng lệnh Biểu mẫu trong bảng chọn Chèn.", "A form is inserted with the Forms command in the Insert menu.", True),
       ("Sửa câu hỏi trong Google Forms thì biểu mẫu trên trang tự cập nhật.", "Editing questions in Google Forms updates the form on the page automatically.", True),
       ("Chỉ có thể đưa biểu mẫu vào trang bằng một đường liên kết, không nhúng được.", "A form can only be placed on the page by a link; it cannot be embedded.", False),
       ("Cần xuất bản trang web để người khác mở bằng URL và trả lời.", "The site must be published so others can open it by URL and answer.", True)),
    tf("tin12-b27-tf-03", 2, "Xét việc xem thống kê phản hồi.", "Consider viewing response statistics.",
       "Bản tóm tắt là biểu đồ; Câu hỏi là chi tiết từng câu; Cá nhân là từng người; có thể tải về dạng bảng tính.", "Summary shows charts; Question shows each question in detail; Individual shows each person; results can be downloaded as a spreadsheet.",
       ("Bản tóm tắt thống kê câu trả lời dưới dạng biểu đồ.", "Summary shows the statistics as charts.", True),
       ("Chế độ Câu hỏi cho thông tin chi tiết của từng câu hỏi.", "The Question mode shows the details of each question.", True),
       ("Chế độ Cá nhân cho thông tin của từng người trả lời.", "The Individual mode shows each respondent's answers.", True),
       ("Không thể tải kết quả phản hồi xuống dạng bảng tính.", "Response results cannot be downloaded as a spreadsheet.", False)),
    tf("tin12-b27-tf-04", 3, "Xét việc thu thập thông tin qua biểu mẫu.", "Consider collecting information through a form.",
       "Chỉ nên hỏi thông tin cần thiết; nên nói rõ mục đích; không công khai dữ liệu cá nhân; câu hỏi nên ngắn và ít.", "Ask only for what is needed; state the purpose; do not expose personal data; questions should be short and few.",
       ("Chỉ nên hỏi những thông tin thật sự cần cho mục đích khảo sát.", "Ask only for information really needed for the survey's purpose.", True),
       ("Nên nói rõ mục đích sử dụng dữ liệu cho người trả lời.", "The purpose of using the data should be told to respondents.", True),
       ("Có thể công khai câu trả lời cá nhân của mọi người cho tiện chia sẻ.", "Everyone's personal answers can be made public for easy sharing.", False),
       ("Biểu mẫu nên có ít câu hỏi và tập trung vào vấn đề trọng tâm.", "A form should have few questions and focus on the key issue.", True)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
