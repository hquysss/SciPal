# Game Ô chữ (crossword)

Ngày: 26/10/2026 · Trạng thái: chờ duyệt · Phạm vi: backend, 1 migration bổ sung, web

## Hiện trạng

- Gamification (`/games`, mục trong menu Học tập) có 3 loại game: `quiz` (câu Tự luyện của một bài), `match` (ghép thuật ngữ Anh ↔ Việt của môn), `wordwall` (nhúng Wordwall).
- Giáo viên tạo game cho một lớp (thành viên nhận thông báo) hoặc cho mọi người. Lượt chơi ghi ở `game_plays`; game chưa cộng XP.
- Bảng `games` cho anon và authenticated đọc mọi cột (`games_read`). Vì vậy đáp án không được nằm trong `games`.
- Mỗi thuật ngữ trong `terms` bắt buộc có `term_en`, `term_vi`, `definition_en`, `definition_vi`.

## Mục tiêu

Học sinh ôn thuật ngữ của bài bằng ô chữ đan chéo, với XP cho lần giải xong đầu tiên.

## Giải pháp

1. **Loại game mới `crossword`.** Trong hộp "Tạo game", giáo viên chọn:
   - bài học: thuật ngữ lấy ngẫu nhiên từ từ điển của môn, giống `match`;
   - số từ: 5 đến 15, mặc định 10;
   - kiểu gợi ý:
     - `en_from_vi`: gợi ý `term_vi`, điền `term_en`;
     - `vi_from_en`: gợi ý `term_en`, điền `term_vi`;
     - `term_from_def`: gợi ý là định nghĩa theo ngôn ngữ đang chọn trên trang (`definition_vi` hoặc `definition_en`), điền `term_en`.
   - Lớp (hoặc mọi người) và giới hạn thời gian như các game hiện có.
2. **Chuẩn hoá chữ điền** (`normalizeAnswer`):
   - viết hoa;
   - bỏ dấu tiếng Việt, đổi `Đ` thành `D`;
   - bỏ mọi ký tự không phải chữ cái A–Z (dấu cách, gạch nối, số, ký hiệu).
   - Từ sau chuẩn hoá dài dưới 2 hoặc trên 15 chữ cái thì bỏ. Từ trùng chữ điền với một từ khác thì chỉ giữ một.
3. **Dựng lưới lúc tạo game** (`buildCrossword`, hàm thuần ở backend):
   - xếp từ dài nhất trước;
   - mỗi từ sau phải giao với ít nhất một từ đã xếp, tại một chữ cái giống nhau;
   - không đè chữ khác, không chạm cạnh song song với từ khác;
   - lưới tối đa 15 × 15.
   - Từ không xếp được thì bỏ qua. Xếp được dưới 4 từ thì trả 400 kèm lời nhắc chọn bài khác hoặc tăng số từ.
   - Kết quả: kích thước lưới, và mỗi từ có `term_id`, `number`, `row`, `col`, `dir` (`across` hoặc `down`), `answer`.
   - Gợi ý không lưu: server đọc từ `terms` theo `term_id` mỗi lần mở lượt chơi.
4. **Lưu riêng, chỉ backend đọc.**
   - `games.kind` nhận thêm `crossword`; điều kiện kiểm tra: `crossword` cần `lesson_id` và `cardinality(term_ids) between 4 and 15`.
   - Bảng mới `game_crosswords`: `game_id` (khoá chính, tham chiếu `games`, `on delete cascade`), `mode` (check 3 giá trị), `rows`, `cols`, `words jsonb`.
   - Bật RLS, không có policy, `revoke all` khỏi anon và authenticated.
5. **Chơi.**
   - Mở lượt chơi (`POST /api/games/:id/play`, giống các loại khác) trả kích thước lưới, và mỗi từ có `number`, `row`, `col`, `dir`, `length`, `clue` (song ngữ khi kiểu gợi ý cần). Không có `answer`.
   - Màn chơi `CrosswordPlayer`:
     - lưới ô vuông: gõ chữ thì ô tự nhảy tới ô sau; Backspace lùi; phím mũi tên di chuyển; bấm lại ô đang chọn để đổi ngang/dọc;
     - danh sách gợi ý Ngang và Dọc, bấm gợi ý thì nhảy tới từ đó;
     - trên điện thoại, gợi ý nằm dưới lưới và gợi ý của từ đang chọn hiện ngay trên lưới;
     - mỗi ô là một `input` một chữ, có nhãn đọc được (số từ, chiều, vị trí chữ), vùng chạm ít nhất 44px khi lưới cho phép, cuộn ngang trong khung lưới chứ không cuộn cả trang.
6. **Chấm.**
   - `POST /api/games/:id/plays/:playId/crossword` nhận `{ answers: { [number_dir]: string } }`.
   - Server chuẩn hoá từng câu trả lời, so với `answer`, và trả danh sách từ đúng, số từ đúng, tổng số từ.
   - Ghi `game_plays.score` và `max_score`. Được nộp lại nhiều lần trong cùng lượt; `score` giữ lần cao nhất.
   - Lần đầu học sinh đúng hết một ô chữ:
     - ghi `xp_log` 20 XP với `reason = 'crossword:<game_id>'`, chặn trùng bằng unique index một phần (giống `xp_log_practice_once_idx`);
     - gọi `touchStreak(..., 20)`;
     - gọi `awardBadges` với `{ xp: 20 }`;
     - response có `xp_earned` và `new_badges`. Lần sau đúng hết thì `xp_earned = 0`.
   - Màn chơi dùng lại chip `+N XP`, màn lên cấp và `BadgeUnlockQueue` đã có.
7. **Danh sách game.** Thẻ ô chữ có biểu tượng và nhãn "Ô chữ"; bảng xếp hạng của game dùng `game_plays` như các loại khác.

## Ràng buộc

- Đáp án không bao giờ xuống client trước hay sau khi nộp: response chấm chỉ nói từ nào đúng (bất biến #4).
- XP, streak, badge do server quyết định; mỗi học sinh nhận XP một lần cho mỗi ô chữ.
- Song ngữ, màu chỉ dùng token, không gán `--accent` lên `:root`.
- Migration chỉ bổ sung: thêm giá trị check, bảng mới, index mới. Điều kiện check của `games` được thay bằng `drop constraint if exists` rồi `add constraint`, giữ nguyên 3 nhánh cũ.

## Ngoài phạm vi

Mở gợi ý từng chữ, giáo viên tự xếp lưới hoặc tự nhập từ, bàn phím riêng trên màn hình, chế độ chơi cả lớp cùng lúc (đó là game "Đua trả lời nhanh", spec riêng).

## Tiêu chí nghiệm thu

- [ ] Giáo viên tạo ô chữ ở cả 3 kiểu gợi ý từ một bài có đủ thuật ngữ; bài quá ít thuật ngữ xếp được thì nhận lời nhắc rõ ràng.
- [ ] Lưới dựng ra: mọi chữ giao nhau khớp, không từ nào đè hay chạm cạnh song song, mỗi từ nằm trong lưới (test hàm thuần, có ca ngẫu nhiên nhiều lần).
- [ ] `normalizeAnswer("Đường truyền")` ra `DUONGTRUYEN`; dấu cách, gạch nối và ký hiệu bị bỏ.
- [ ] Response mở lượt chơi và response chấm không chứa chữ đáp án nào (test tìm chuỗi đáp án trong JSON).
- [ ] Client không đọc được `game_crosswords` (test PGlite với role authenticated).
- [ ] Nộp đúng hết lần đầu được 20 XP, lần sau 0 XP; hai lần nộp song song chỉ ra một dòng `xp_log`.
- [ ] Màn chơi dùng được hoàn toàn bằng bàn phím; ở 375px và 1280px không tràn ngang trang.
- [ ] `pnpm turbo typecheck`, `test`, `build` đạt.

## Rủi ro

- Thuật ngữ tiếng Việt sau khi bỏ dấu có thể dài hoặc trùng nhau, nên kiểu `vi_from_en` có thể xếp được ít từ hơn; lời nhắc khi dưới 4 từ xử lý trường hợp này.
- Lưới 15 × 15 trên điện thoại có ô nhỏ hơn 44px; khung lưới cuộn ngang và phóng to được thay vì thu ô xuống quá nhỏ.
- Migration cần áp lên database thật trước khi deploy backend (cần bạn duyệt 🙋).
