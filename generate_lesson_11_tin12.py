# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_11_tin12.py
from generate_tin_common import T, build, configure, mc, tf, web_block

configure(12, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers", "Tin học ứng dụng")

slug = "chen-tep-da-phuong-tien-va-khung-noi-tuyen-bai-11-tin12"
title_vi = "Bài 11. Chèn tệp tin đa phương tiện và khung nội tuyến vào trang web"
title_en = "Lesson 11. Inserting multimedia files and inline frames into a web page"

# Pictures drawn inline so the preview needs no file.
SUN = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='150'%3E%3Crect width='240' height='150' fill='skyblue'/%3E%3Ccircle cx='120' cy='75' r='45' fill='orange'/%3E%3C/svg%3E"
POSTER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180'%3E%3Crect width='320' height='180' fill='steelblue'/%3E%3Cpolygon points='135,60 135,120 195,90' fill='white'/%3E%3C/svg%3E"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


blocks = [
    T(
        """### Mục tiêu bài học

Sau bài này, bạn có thể:

- chèn ảnh vào trang web bằng thẻ `<img>` với các thuộc tính `src`, `alt`, `width`, `height`;
- chèn video và âm thanh bằng thẻ `<video>`, `<audio>` và biết các định dạng tệp phổ biến;
- tạo khung nội tuyến bằng thẻ `<iframe>` để nhúng một trang hay tài nguyên web khác;
- lưu ý bản quyền khi dùng ảnh, âm thanh và video.""",
        """### Learning goals

After this lesson, you can:

- insert pictures with `<img>` and its `src`, `alt`, `width`, `height` attributes;
- insert video and audio with `<video>` and `<audio>` and know the common file formats;
- create an inline frame with `<iframe>` to embed another page or web resource;
- respect copyright when using pictures, sound and video.""",
    ),
    T(
        """### 1. Chèn tệp ảnh

Ảnh có hai họ chính: **đồ hoạ vectơ** (SVG, EPS, AI,...) và **đồ hoạ điểm ảnh** (JPEG, PNG, GIF, BMP, TIFF,...). HTML dùng **thẻ đơn `<img>`** để chèn ảnh.

```html
<img src="images/thethao.png" alt="Hoạt động thể thao" width="300">
```

| Thuộc tính | Ý nghĩa |
|---|---|
| `src` | **bắt buộc**, đường dẫn tới tệp ảnh (tuyệt đối hoặc tương đối) |
| `alt` | không bắt buộc nhưng nên có: văn bản thay thế khi ảnh không hiển thị được |
| `width`, `height` | chiều rộng, chiều cao hiển thị; chỉ đặt một giá trị thì giá trị kia **tự tính theo tỉ lệ** |

Trình duyệt phải tải ảnh về trước khi hiển thị, nên cần chú ý **dung lượng tệp ảnh**: ảnh quá nặng sẽ tải chậm khi mạng yếu.""",
        """### 1. Inserting pictures

Pictures come in two main families: **vector graphics** (SVG, EPS, AI,...) and **raster graphics** (JPEG, PNG, GIF, BMP, TIFF,...). HTML uses the **void tag `<img>`** to insert a picture.

```html
<img src="images/thethao.png" alt="Sports activity" width="300">
```

| Attribute | Meaning |
|---|---|
| `src` | **required**, the path to the image file (absolute or relative) |
| `alt` | optional but recommended: replacement text when the picture cannot be shown |
| `width`, `height` | displayed width and height; if you set only one, the other is **computed to keep the ratio** |

The browser must download the picture before showing it, so mind the **file size**: a very heavy picture loads slowly on a weak network.""",
    ),
    web_block(
        sim("Chèn ảnh, đổi kích thước và văn bản thay thế", "Pictures, resizing and alternative text", "Ảnh đầu hiển thị bình thường, ảnh thứ hai chỉ đặt width, ảnh thứ ba thiếu tệp nên hiện chữ alt.", "The first picture shows normally, the second sets only width, the third file is missing so its alt text appears."),
        f"""<h3>Ảnh minh hoạ</h3>
<img src="{SUN}" alt="Mặt Trời trên bầu trời">
<img src="{SUN}" alt="Mặt Trời nhỏ" width="120">
<img src="images/khong_co.png" alt="Ảnh bị lỗi: không có tệp">""",
        "",
        340,
    ),
    T(
        """### 2. Chèn âm thanh và video

HTML dùng **`<video>`** và **`<audio>`**. Các trình duyệt đều hỗ trợ hai thẻ này nhưng định dạng tệp dùng được phụ thuộc trình duyệt:

- Video phổ biến: **mp4** (hiển thị trực tiếp trên hầu hết trình duyệt) và **webm**.
- Âm thanh phổ biến: **mp3**, **wav**, **ogg**.

```html
<video src="video/gioi_thieu.mp4" width="320" height="180" controls poster="images/bia.png"></video>
<audio src="audio/quoc_ca.mp3" controls></audio>
```

| Thẻ | Thuộc tính chính |
|---|---|
| `<video>` | `src`, `width`, `height`, `controls`, `autoplay`, `poster` |
| `<audio>` | `src`, `controls`, `autoplay` (**không có** `width`, `height`, `poster`) |

- `controls`: hiện thanh điều khiển phát/dừng, âm lượng.
- `autoplay`: thuộc tính logic (không cần giá trị) cho phép chạy ngay khi hiển thị; một số trình duyệt như Chrome thường chặn, trừ khi có thêm `muted` (tắt tiếng).
- `poster`: ảnh hiện thay thế khi video chưa chạy.
- Muốn cung cấp nhiều định dạng cho cùng một tệp, đặt nhiều thẻ `<source src="…" type="…">` bên trong `<video>` hoặc `<audio>`.""",
        """### 2. Inserting audio and video

HTML uses **`<video>`** and **`<audio>`**. Browsers all support the two tags, but which file formats work depends on the browser:

- Common video: **mp4** (plays directly in most browsers) and **webm**.
- Common audio: **mp3**, **wav**, **ogg**.

```html
<video src="video/gioi_thieu.mp4" width="320" height="180" controls poster="images/bia.png"></video>
<audio src="audio/quoc_ca.mp3" controls></audio>
```

| Tag | Main attributes |
|---|---|
| `<video>` | `src`, `width`, `height`, `controls`, `autoplay`, `poster` |
| `<audio>` | `src`, `controls`, `autoplay` (**no** `width`, `height`, `poster`) |

- `controls`: shows the play/pause and volume bar.
- `autoplay`: a boolean attribute (no value needed) that starts playback on display; some browsers such as Chrome often block it unless `muted` is added.
- `poster`: the picture shown before the video plays.
- To offer several formats of the same file, place several `<source src="…" type="…">` tags inside `<video>` or `<audio>`.""",
    ),
    web_block(
        sim("Khung video và thanh âm thanh", "A video frame and an audio bar", "Video có ảnh poster và thanh controls; audio chỉ có thanh controls. Tệp mẫu không kèm theo nên chưa phát được.", "The video has a poster picture and controls; the audio has only controls. The sample files are not included, so nothing plays."),
        f"""<h3>Phương tiện trên trang</h3>
<video width="320" height="180" controls poster="{POSTER}">
  <source src="video/gioi_thieu.mp4" type="video/mp4">
  <source src="video/gioi_thieu.webm" type="video/webm">
</video>
<p>Nghe bài hát:</p>
<audio controls>
  <source src="audio/bai_hat.mp3" type="audio/mpeg">
</audio>""",
        "",
        360,
    ),
    T(
        """### 3. Khung nội tuyến `<iframe>`

**Khung nội tuyến** là một khung nhìn chứa **tài nguyên web khác** ngay trong trang hiện tại. HTML dùng thẻ `<iframe>`. Khung nội tuyến thường dùng để nhúng bản đồ Google Maps, video YouTube hay nội dung quảng cáo: các nền tảng cung cấp sẵn đoạn mã `iframe` để sao chép và dán vào trang.

```html
<iframe src="the_thao.html" width="400" height="200"></iframe>
```

- `src`: đường dẫn tới nội dung hiển thị trong khung.
- `width`, `height`: chiều rộng và chiều cao của khung.

Hai thẻ `<iframe>` đặt liên tiếp có cùng `width` và `height` sẽ nằm **cạnh nhau theo chiều ngang** (nếu đủ chỗ).""",
        """### 3. The inline frame `<iframe>`

An **inline frame** is a view that holds **another web resource** right inside the current page. HTML uses the `<iframe>` tag. Inline frames often embed Google Maps, YouTube videos or ads: the platforms supply ready-made `iframe` code to copy and paste into your page.

```html
<iframe src="the_thao.html" width="400" height="200"></iframe>
```

- `src`: the path to the content shown in the frame.
- `width`, `height`: width and height of the frame.

Two `<iframe>` tags placed one after another with the same `width` and `height` sit **side by side** (if there is room).""",
    ),
    web_block(
        sim("Hai khung nội tuyến cạnh nhau", "Two inline frames side by side", "Hai iframe cùng kích thước, mỗi khung hiển thị một trang nhỏ riêng (nội dung đặt trong srcdoc).", "Two iframes of equal size, each showing its own small page (content set in srcdoc)."),
        """<h3>Câu lạc bộ ngoại khoá</h3>
<iframe width="200" height="120" srcdoc="<h4>Thể thao</h4><p>Bóng đá, cầu lông.</p>"></iframe>
<iframe width="200" height="120" srcdoc="<h4>Nghệ thuật</h4><p>Hát, vẽ, múa.</p>"></iframe>""",
        "",
        280,
    ),
    T(
        """### 4. Thực hành: trang câu lạc bộ

Để hai liên kết mở nội dung ngay trong khung, ta đặt **tên** cho khung bằng thuộc tính `name` và cho thẻ `<a>` thuộc tính `target` trùng với tên đó:

```html
<h2>Câu lạc bộ ngoại khoá</h2>
<a href="the_thao.html" target="khung">Thể thao</a> |
<a href="nghe_thuat.html" target="khung">Nghệ thuật</a>
<iframe name="khung" width="400" height="200"></iframe>
```

Thứ tự hiển thị là thứ tự các dòng mã: muốn hai lựa chọn nằm **trên** khung thì viết hai thẻ `<a>` **trước** thẻ `<iframe>`.

**Bản quyền:** chỉ dùng ảnh, nhạc, video mà em được phép sử dụng cho trang web của mình (do mình tạo ra hoặc có giấy phép), và ghi rõ nguồn khi cần.""",
        """### 4. Practice: a club page

To open the links inside the frame, give the frame a **name** with the `name` attribute and give `<a>` a `target` attribute that matches it:

```html
<h2>Extracurricular clubs</h2>
<a href="the_thao.html" target="khung">Sports</a> |
<a href="nghe_thuat.html" target="khung">Arts</a>
<iframe name="khung" width="400" height="200"></iframe>
```

The display order follows the order of the code lines: to put the two choices **above** the frame, write the two `<a>` tags **before** the `<iframe>`.

**Copyright:** only use pictures, music and video you are allowed to use on your site (made by you or licensed), and credit the source when needed.""",
    ),
    T(
        """### Tóm tắt và tự kiểm tra

| Nội dung | Ghi nhớ |
|---|---|
| Ảnh | `<img src alt width height>`; `src` bắt buộc; thẻ đơn |
| Dung lượng ảnh | ảnh nặng tải chậm khi mạng yếu |
| Video | `<video>`: mp4, webm; `controls`, `autoplay`, `poster`, `width`, `height` |
| Âm thanh | `<audio>`: mp3, wav, ogg; `controls`, `autoplay` |
| Nhiều định dạng | các thẻ `<source>` bên trong |
| Khung nội tuyến | `<iframe src width height>` |
| Liên kết vào khung | `name` của iframe = `target` của thẻ `a` |

**Tự kiểm tra:** ảnh gốc 720 × 450 px chèn với chỉ `width="360"` thì hiển thị cao bao nhiêu? (đáp án: 225 px, vì giữ tỉ lệ).""",
        """### Summary and self-check

| Topic | Remember |
|---|---|
| Picture | `<img src alt width height>`; `src` required; void tag |
| Picture size | heavy pictures load slowly on a weak network |
| Video | `<video>`: mp4, webm; `controls`, `autoplay`, `poster`, `width`, `height` |
| Audio | `<audio>`: mp3, wav, ogg; `controls`, `autoplay` |
| Several formats | `<source>` tags inside |
| Inline frame | `<iframe src width height>` |
| Link into a frame | iframe `name` = `target` of the `a` tag |

**Self-check:** a 720 × 450 px picture is inserted with only `width="360"`; how tall is it shown? (answer: 225 px, because the ratio is kept).""",
    ),
]

questions = [
    mc("tin12-b11-mc-01", 1, "Thẻ nào dùng để chèn ảnh vào trang web?", "Which tag inserts a picture into a web page?",
       "Thẻ img là thẻ đơn dùng để chèn ảnh vào nội dung trang web.", "img is the void tag that inserts a picture into the page.", "A",
       ("<img>", "<img>"), ("<pic>", "<pic>"), ("<photo>", "<photo>"), ("<image>", "<image>")),
    mc("tin12-b11-mc-02", 1, "Thuộc tính nào của thẻ <img> là bắt buộc?", "Which attribute of <img> is required?",
       "Thuộc tính src chỉ đường dẫn tới tệp ảnh nên là bắt buộc; alt, width, height là không bắt buộc.", "src gives the path to the image so it is required; alt, width and height are optional.", "B",
       ("alt", "alt"), ("src", "src"), ("width", "width"), ("height", "height")),
    mc("tin12-b11-mc-03", 1, "Thẻ nào dùng để chèn tệp âm thanh vào trang web?", "Which tag inserts an audio file into a web page?",
       "Thẻ audio chèn âm thanh, thẻ video chèn video.", "audio inserts sound and video inserts video.", "C",
       ("<sound>", "<sound>"), ("<music>", "<music>"), ("<audio>", "<audio>"), ("<mp3>", "<mp3>")),
    mc("tin12-b11-mc-04", 1, "HTML dùng thẻ nào để tạo khung nội tuyến?", "Which tag does HTML use to create an inline frame?",
       "Khung nội tuyến được tạo bằng thẻ iframe.", "An inline frame is created with the iframe tag.", "D",
       ("<frame>", "<frame>"), ("<window>", "<window>"), ("<embed>", "<embed>"), ("<iframe>", "<iframe>")),
    mc("tin12-b11-mc-05", 2, "Thuộc tính alt của thẻ <img> dùng để làm gì?", "What is the alt attribute of <img> for?",
       "alt cung cấp văn bản thay thế khi ảnh không hiển thị được; nó không bắt buộc nhưng nên có.", "alt gives replacement text when the picture cannot be shown; it is optional but recommended.", "A",
       ("Cung cấp văn bản thay thế khi ảnh bị lỗi", "Gives replacement text when the picture fails"), ("Chỉ đường dẫn tới tệp ảnh", "Gives the path to the image file"), ("Đặt chiều rộng của ảnh", "Sets the width of the picture"), ("Làm ảnh chuyển động", "Animates the picture")),
    mc("tin12-b11-mc-06", 2, "Phương án nào sau đây là một định dạng tệp video?", "Which of the following is a video file format?",
       "webm và mp4 là hai định dạng video phổ biến; wav, mp3, flac là âm thanh.", "webm and mp4 are the two common video formats; wav, mp3 and flac are audio.", "C",
       ("wav", "wav"), ("mp3", "mp3"), ("webm", "webm"), ("flac", "flac")),
    mc("tin12-b11-mc-07", 2, "Thuộc tính nào của thẻ <video> cho phép trình duyệt chạy video ngay khi hiển thị?", "Which attribute of <video> lets the browser start the video as soon as it is shown?",
       "autoplay là thuộc tính logic cho phép chạy ngay; controls chỉ hiện thanh điều khiển, poster là ảnh bìa.", "autoplay is the boolean attribute that starts playback; controls only shows the bar and poster is the cover picture.", "B",
       ("controls", "controls"), ("autoplay", "autoplay"), ("poster", "poster"), ("width", "width")),
    mc("tin12-b11-mc-08", 2, "Thẻ <audio> KHÔNG có thuộc tính nào sau đây?", "Which attribute does <audio> NOT have?",
       "Thẻ audio có src, controls, autoplay; nó không có width, height và poster.", "audio has src, controls and autoplay; it has no width, height or poster.", "D",
       ("src", "src"), ("controls", "controls"), ("autoplay", "autoplay"), ("width", "width")),
    mc("tin12-b11-mc-09", 2, "Thuộc tính poster của thẻ <video> có tác dụng gì?", "What does the poster attribute of <video> do?",
       "poster cho đường dẫn tới ảnh hiển thị khi video chưa chạy.", "poster gives a path to the picture shown before the video plays.", "C",
       ("Tắt tiếng video", "Mutes the video"), ("Cho video chạy lặp lại", "Loops the video"), ("Hiển thị ảnh khi video chưa chạy", "Shows a picture before the video plays"), ("Đặt chiều cao video", "Sets the video height")),
    mc("tin12-b11-mc-10", 2, "Để cung cấp cùng một video ở hai định dạng mp4 và webm, em đặt thẻ nào bên trong <video>?", "To offer one video in both mp4 and webm, which tag goes inside <video>?",
       "Mỗi thẻ source chỉ một tệp và kiểu định dạng, trình duyệt chọn tệp phù hợp để phát.", "Each source tag names a file and its type, and the browser picks one it can play.", "A",
       ("<source>", "<source>"), ("<control>", "<control>"), ("<form>", "<form>"), ("<type>", "<type>")),
    mc("tin12-b11-mc-11", 2, "Ảnh gốc 720 × 450 px được chèn với chỉ width=\"360\". Chiều cao hiển thị là bao nhiêu?", "A 720 × 450 px picture is inserted with only width=\"360\". How tall is it shown?",
       "Chiều rộng giảm một nửa (720 → 360) nên chiều cao cũng giảm một nửa: 450 : 2 = 225 pixel.", "The width is halved (720 → 360), so the height is halved too: 450 ÷ 2 = 225 pixels.", "D",
       ("150", "150"), ("180", "180"), ("200", "200"), ("225", "225")),
    mc("tin12-b11-mc-12", 3, "Trong img, video, audio, iframe, có bao nhiêu thẻ có thuộc tính width và height?", "Among img, video, audio and iframe, how many tags have the width and height attributes?",
       "img, video và iframe có width, height; audio không có, nên là 3 thẻ.", "img, video and iframe have width and height; audio does not, so 3 tags.", "B",
       ("2", "2"), ("3", "3"), ("4", "4"), ("5", "5")),
]

truefalse = [
    tf("tin12-b11-tf-01", 2, "Xét thẻ <img>.", "Consider the <img> tag.",
       "img là thẻ đơn; ảnh nặng tải chậm; alt là văn bản thay thế; alt không bắt buộc còn src thì bắt buộc.", "img is a void tag; heavy pictures load slowly; alt is replacement text; alt is optional while src is required.",
       ("Thẻ <img> là thẻ đôi, có thẻ kết thúc </img>.", "<img> is a paired tag with an end tag </img>.", False),
       ("Khi chèn ảnh cần chú ý dung lượng tệp ảnh.", "Mind the file size when inserting a picture.", True),
       ("Thuộc tính alt cung cấp văn bản thay thế khi ảnh không hiển thị được.", "The alt attribute gives replacement text when the picture cannot be shown.", True),
       ("Thuộc tính alt là bắt buộc, thiếu thì thẻ <img> không hợp lệ.", "alt is required, and without it <img> is invalid.", False)),
    tf("tin12-b11-tf-02", 2, "Xét video và âm thanh.", "Consider video and audio.",
       "mp4 phổ biến; audio không có width, height; autoplay là thuộc tính logic và Chrome có thể chặn nếu không muted.", "mp4 is common; audio has no width or height; autoplay is boolean and Chrome may block it unless muted.",
       ("mp4 là định dạng video hiển thị trực tiếp trên hầu hết trình duyệt.", "mp4 is a video format that plays directly in most browsers.", True),
       ("Thẻ <audio> có các thuộc tính width và height.", "<audio> has the width and height attributes.", False),
       ("autoplay là thuộc tính logic, không cần giá trị.", "autoplay is a boolean attribute and needs no value.", True),
       ("Chrome có thể chặn autoplay có tiếng, nhưng cho chạy khi có thêm muted.", "Chrome may block autoplay with sound but allows it with muted added.", True)),
    tf("tin12-b11-tf-03", 2, "Xét khung nội tuyến.", "Consider inline frames.",
       "iframe nhúng tài nguyên web khác; src là đường dẫn nội dung; iframe có width, height; YouTube và Maps cung cấp mã iframe.", "iframe embeds another web resource; src is the content path; iframe has width and height; YouTube and Maps provide iframe code.",
       ("Thẻ <iframe> chèn một trang hay tài nguyên web vào trong trang web khác.", "<iframe> inserts a page or web resource into another page.", True),
       ("Thuộc tính src của iframe là đường dẫn tới nội dung hiển thị trong khung.", "The src of iframe is the path to the content shown in the frame.", True),
       ("Thẻ <iframe> không có thuộc tính width và height.", "<iframe> has no width or height attributes.", False),
       ("YouTube và Google Maps cung cấp sẵn đoạn mã iframe để nhúng vào trang web.", "YouTube and Google Maps provide ready-made iframe code to embed.", True)),
    tf("tin12-b11-tf-04", 2, "Xét thực hành và bản quyền.", "Consider practice and copyright.",
       "Liên kết mở trong khung nhờ target trùng name của iframe; thứ tự hiển thị theo thứ tự mã; cần chú ý bản quyền; poster hiện khi video chưa chạy.", "Links open in the frame when target matches the iframe name; display order follows code order; copyright matters; poster shows before the video plays.",
       ("Để liên kết mở trong khung, target của thẻ <a> phải trùng name của <iframe>.", "To open a link in the frame, the target of <a> must match the name of <iframe>.", True),
       ("Muốn hai liên kết nằm phía trên khung thì viết chúng trước thẻ <iframe>.", "To put two links above the frame, write them before <iframe>.", True),
       ("Có thể dùng bất kì ảnh, bài hát nào trên mạng mà không cần quan tâm bản quyền.", "Any picture or song found online may be used without caring about copyright.", False),
       ("Thuộc tính poster của <video> chỉ ảnh hiển thị khi video chưa chạy.", "The poster attribute of <video> names the picture shown before the video plays.", True)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
