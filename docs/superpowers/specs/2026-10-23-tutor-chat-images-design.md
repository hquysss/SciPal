# Gửi hình ảnh cho Giáo sư AI trong chat

## Vấn đề

Học sinh gặp bài tập có hình (đồ thị, mạch điện, sơ đồ, đề in trên giấy) và không gõ lại được. Chat chữ với Giáo sư AI chỉ nhận văn bản, prompt còn dặn thầy "không bao giờ xin ảnh", nên học sinh phải mô tả bằng lời hoặc bỏ cuộc.

## Mục tiêu

- Trong chat chữ với Giáo sư AI, học sinh đính kèm một ảnh (chọn từ máy hoặc chụp bằng điện thoại) cùng câu hỏi; thầy đọc ảnh và trả lời như câu hỏi thường.
- Ảnh được tính vào token của gói như mọi câu hỏi khác, không thêm loại quota mới.
- Chạy với cả Gemini và OpenAI (hai nhà cung cấp admin đang chọn được), miễn model có đọc ảnh.

## Không làm

- Không cho lượt sau "nhìn" lại ảnh cũ: gửi lại pixel mỗi lượt nhân token lên nhiều lần. Ảnh lưu để học sinh xem lại, không để đưa vào ngữ cảnh.
- Không tự hết hạn ảnh theo ngày (cần tác vụ định kỳ; ghi lại như việc sau). Ảnh nằm đến khi học sinh xóa hội thoại, hoặc tài khoản bị xóa.
- Không gửi ảnh trong chế độ nói chuyện bằng giọng (Gemini Live), không tải PDF hay tệp khác.
- Không làm trên mobile: ứng dụng mobile chưa có chat Giáo sư AI.
- Không dán ảnh từ clipboard, không kéo thả, không nhiều ảnh một tin (thêm sau nếu cần).

## Thiết kế

**Một ảnh mỗi tin.** Ảnh PNG, JPG hoặc WEBP; cùng kiểu và cùng cách nhận dạng với chat cộng đồng (`sniffImageType` trong `routes/media.ts`, không tin vào tên tệp hay `Content-Type` do máy khách khai).

**Máy khách thu nhỏ trước khi gửi.** Vẽ ảnh lên canvas, cạnh dài tối đa 1280 px, xuất JPEG chất lượng 0,8 (thường 100–300 KB). Việc này cũng xóa dữ liệu EXIF (vị trí chụp, tên máy). Ảnh gốc không rời khỏi máy.

**Đường gửi.** `POST /api/tutor/chat` nhận thêm trường `image: { mime, data }` (base64 trong JSON; chat đang là JSON nên không thêm đường tải riêng). Route đặt `bodyLimit` 2,2 MB; ảnh sau khi giải mã tối đa 1,5 MB (cùng giới hạn chat cộng đồng). Backend giải mã, kiểm `sniffImageType`, từ chối quá lớn hoặc sai kiểu bằng lỗi song ngữ. Có ảnh thì chữ có thể để trống; lúc đó câu hỏi mặc định là "Em gửi thầy ảnh này." / "Here is my picture."

**Đưa ảnh cho model.** `ChatMessage` có thêm trường `image` tùy chọn (mime và base64): tin cuối của học sinh mang thêm một phần `image_url` dạng data URL (`completionRequest` trong `providers/ai.ts` chuyển đúng sang định dạng của cả Gemini lẫn OpenAI). Chỉ tin hiện tại mang pixel; các lượt cũ trong lịch sử chỉ còn chữ, kèm ghi chú "(học sinh đã gửi một ảnh, ảnh không còn trong hội thoại)" để thầy không hỏi lại như thể nhìn thấy.

**Lưu trữ riêng tư.** Ảnh của học sinh (có thể có mặt, giấy tờ, phòng ở) không bao giờ có URL công khai, nên không dùng kho R2 công khai của ảnh bài học và chat cộng đồng. Dùng bucket Supabase Storage **riêng tư** `tutor-images` (cùng cách `lessonVideos.ts` đang làm): `public = false`, giới hạn 1,5 MB, chỉ PNG/JPEG/WEBP, **không có policy nào trên `storage.objects`** nên trình duyệt không đọc hay ghi trực tiếp; chỉ backend (service role) ghi và ký URL.
- Khóa tệp `<user_id>/<conversation_id>/<uuid>.jpg`. Migration cộng thêm: tạo bucket, và `tutor_messages.image_path text` (null nếu tin không có ảnh). Cột `content` vẫn `not null`, nên tin chỉ có ảnh lưu câu mặc định ở trên.
- **Ghi:** sau khi qua kiểm tra và giữ token, backend tải ảnh lên *trước*, rồi mới thêm dòng tin nhắn kèm `image_path`; thêm dòng lỗi thì xóa lại tệp vừa tải. Câu hỏi bị "rút lại" khi model lỗi hoàn toàn (đoạn xóa tin hiện có) cũng xóa tệp. "Thử lại" không tải lên lần nữa: câu hỏi và tệp đã có, máy khách gửi lại ảnh trong bộ nhớ chỉ để đưa cho model.
- **Đọc:** `GET /api/tutor/conversations/:id` thêm `image_url` cho mỗi tin có ảnh, là URL ký hết hạn sau 1 giờ (ký một lượt cho cả hội thoại). Chỉ chủ hội thoại gọi được route này, như hiện nay.
- **Xóa:** `DELETE /api/tutor/conversations/:id` xóa các tệp của hội thoại trước, rồi mới xóa hội thoại (xóa tệp lỗi thì không xóa hội thoại, để thử lại được, không để tệp mồ côi vô hình). Xóa tài khoản (`DELETE /api/auth/accounts/:id`) xóa cả thư mục `<user_id>/` trong bucket, vì cascade của cơ sở dữ liệu không đụng tới tệp.

**Hạn mức.** Token ảnh do nhà cung cấp tính trong `usage` và đã đi vào quota như mọi câu trả lời. Khi nhà cung cấp không báo usage, ước tính thêm cố định 1.000 token cho ảnh (hàm `tokensUsed` hiện chỉ đếm chữ). Giữ chỗ `TUTOR_HOLD_TOKENS` giữ nguyên; nếu giữ chỗ không đủ cho một lượt có ảnh thì lượt đó vẫn chạy và chốt theo số thực dùng như hiện nay.

**Prompt.** Khi lượt hiện tại có ảnh: bỏ dòng "không bao giờ xin ảnh", thêm: chỉ dùng ảnh để giúp học bài; ảnh không phải bài học (người, giấy tờ, nội dung không phù hợp) thì từ chối nhẹ nhàng và kéo về bài; đọc đề trong ảnh rồi xác nhận ngắn mình đọc đúng chưa trước khi giải. Không có ảnh thì giữ nguyên dòng cũ. Chế độ giọng không đổi.

**Giao diện (web).** Ô nhập của `TutorChat` có nút ảnh (`ImagePlus`), `accept="image/png,image/jpeg,image/webp"` (điện thoại hiện luôn lựa chọn chụp ảnh). Ảnh đã chọn hiện thành ô xem trước nhỏ phía trên ô nhập, có nút bỏ; đang thu nhỏ thì nút gửi tạm khóa. Tin của học sinh hiện hình thu nhỏ ngay trong phiên (từ bản trong bộ nhớ), và khi mở lại hội thoại thì từ `image_url`; bấm vào hình mở bản lớn. "Thử lại" gửi lại ảnh còn giữ trong bộ nhớ của phiên. Thiếu quyền, tệp sai kiểu hoặc quá lớn thì báo lỗi ngay, không gửi lên.

## Quyết định của mình (bạn sửa nếu không hợp)

1. Lưu ảnh trong bucket riêng tư, xem qua URL ký 1 giờ; xóa cùng hội thoại và cùng tài khoản. Các lượt sau không đưa ảnh cũ cho model (tốn token); học sinh gửi lại nếu muốn thầy nhìn lại.
2. Một ảnh mỗi tin, tối đa 1,5 MB sau khi thu nhỏ.
3. Mọi gói (cả Miễn phí) đều gửi được ảnh; chặn bằng token như chat chữ, không có công tắc riêng. Admin vẫn tắt được cả Giáo sư AI.
4. Ước tính 1.000 token cho ảnh khi nhà cung cấp không báo usage.

## Kiểm thử

Backend: ảnh được tải lên bucket riêng với đúng khóa, dòng tin có `image_path`; thêm dòng lỗi thì tệp bị xóa; rút câu hỏi (model lỗi) xóa tệp; "thử lại" không tải lại; `GET` trả URL ký cho tin có ảnh và người khác không đọc được hội thoại; xóa hội thoại xóa tệp, lỗi xóa tệp thì hội thoại còn; xóa tài khoản xóa thư mục của người đó; bucket không công khai và không có policy; nhận ảnh hợp lệ và chuyển đúng cho model (cả định dạng Gemini lẫn OpenAI); từ chối sai kiểu, giả `Content-Type`, quá 1,5 MB, base64 hỏng, `image` không phải đối tượng; chữ trống kèm ảnh dùng câu mặc định, chữ trống không ảnh vẫn bị từ chối; lượt cũ không mang pixel; token ảnh vào quota, có ước tính khi thiếu usage; prompt có/không dòng xin ảnh đúng theo lượt. Web: chọn ảnh, xem trước, bỏ ảnh, gửi, thu nhỏ đúng cạnh dài và ra JPEG, báo lỗi tệp sai, hình hiện lại từ `image_url` khi mở hội thoại cũ, "Thử lại" gửi lại ảnh; không còn chữ "không xin ảnh" trong lượt có ảnh.
