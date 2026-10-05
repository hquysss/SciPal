# Exam formats: THPTQG and ĐGNL ĐHQG-HCM (design)

Status: draft for review (05/10/2026). Scope: exam structure and scoring in the existing exam studio (`/exam/manage`). Out of scope: bulk import, AI drafting.

## Goal

A teacher can start an exam from an official format (THPTQG per subject, or ĐGNL ĐHQG-HCM), fill each section from the question bank, and learners are scored per the rules of that format, on the server. Existing exams keep working unchanged.

## Today (verified in code)

- Question types: `mc`, `truefalse`, `short` (`packages/types/src/question.ts`). They already match the three THPTQG question kinds.
- An exam is a flat list of question ids with name, subject, grade and duration (`backend/src/schemas/exams.ts`).
- `POST /api/score/exam` (`backend/src/routes/exam.ts`) scores each question all-or-nothing and returns `correct / total × 10`. A true/false question counts only when every statement is right.

## Official structures (sources)

### THPTQG from 2025

Source: Quyết định 764/QĐ-BGDĐT ngày 08/03/2024 của Bộ GD&ĐT, "cấu trúc định dạng đề thi Kỳ thi tốt nghiệp THPT từ năm 2025". Read through secondary copies: [luatvietnam.vn](https://luatvietnam.vn/giao-duc/quyet-dinh-764-qd-bgddt-2024-cau-truc-de-thi-ky-thi-tot-nghiep-thpt-tu-2025-302643-d1.html), [xaydungchinhsach.chinhphu.vn](https://xaydungchinhsach.chinhphu.vn/cau-truc-de-thi-tot-nghiep-thpt-tu-nam-2025-119240308200554932.htm), [vnexpress.net](https://vnexpress.net/cong-bo-cau-truc-de-thi-tot-nghiep-thpt-nam-2025-4720166.html), [vqa.moet.gov.vn](https://vqa.moet.gov.vn/vi/news/thong-bao/cau-truc-dinh-dang-de-thi-tot-nghiep-thpt-tu-nam-2025-74.html), [thuvienphapluat.vn](https://thuvienphapluat.vn/van-ban/Giao-duc/Quyet-dinh-764-QD-BGDDT-2024-cau-truc-dinh-dang-de-thi-Ky-thi-tot-nghiep-trung-hoc-pho-thong-601389.aspx).

| Môn | Thời gian | Phần I (4 lựa chọn, 0,25đ/câu) | Phần II (đúng-sai, 4 ý) | Phần III (trả lời ngắn) |
|---|---|---|---|---|
| Toán | 90 phút | 12 câu | 4 câu | 6 câu, 0,5đ/câu |
| Vật lí, Hóa học, Sinh học, Địa lí | 50 phút | 18 câu | 4 câu | 6 câu, 0,25đ/câu |
| Lịch sử, GDKT&PL, Công nghệ | 50 phút | 24 câu | 4 câu | không có |
| Tin học | 50 phút | 24 câu | 6 câu trong đề; mỗi thí sinh làm 4 (2 chung + 2 theo định hướng) | không có |
| Ngoại ngữ | 50 phút | 40 câu | không có | không có |

Đúng-sai (phần II): đúng 1 ý = 0,1đ; 2 ý = 0,25đ; 3 ý = 0,5đ; 4 ý = 1đ. Mỗi đề tối đa 10 điểm (kiểm tra: Toán 3+4+3, Lý/Hóa/Sinh/Địa 4,5+4+1,5, Sử/GDKT&PL/Công nghệ 6+4, Tin học 6+4, Ngoại ngữ 10). Ngữ văn là tự luận (120 phút, Đọc hiểu 4đ, Viết 6đ) và chưa thuộc phạm vi này.

### ĐGNL ĐHQG-HCM from 2025

Source: ĐHQG-HCM, "cấu trúc bài thi đánh giá năng lực từ năm 2025", through [xaydungchinhsach.chinhphu.vn](https://xaydungchinhsach.chinhphu.vn/cau-truc-bai-thi-danh-gia-nang-luc-cua-dai-hoc-quoc-gia-tp-hcm-tu-nam-2025-119241113163250474.htm) (120 câu trắc nghiệm, 150 phút, 1.200 điểm, bốn thành phần mỗi phần 300 điểm). The 30/30/30/30 split of questions comes from secondary summaries ([vnexpress.net](https://vnexpress.net/dh-quoc-gia-tp-hcm-de-thi-se-danh-gia-nang-luc-xu-ly-van-de-cua-hoc-sinh-4572011.html), [izone.edu.vn](https://www.izone.edu.vn/blog/cau-truc-bai-thi-danh-gia-nang-luc/)), not from ĐHQG-HCM directly.

| Phần | Thành phần | Số câu | Điểm tối đa |
|---|---|---|---|
| Sử dụng ngôn ngữ | Tiếng Việt | 30 | 300 |
| Sử dụng ngôn ngữ | Tiếng Anh | 30 | 300 |
| Toán học | Toán học | 30 | 300 |
| Tư duy khoa học | Logic, suy luận khoa học (khoa học, công nghệ, kinh tế, xã hội) | 30 | 300 |

Điểm thật của ĐHQG-HCM dùng lý thuyết ứng đáp câu hỏi: mỗi câu có trọng số khác nhau theo độ khó. SciPal không tái hiện được. Với đề ĐGNL, SciPal chấm đều theo câu trong từng thành phần (đúng/tổng × 300) và gắn nhãn "điểm quy đổi tham khảo".

## Design

1. **Format as data.** An exam has `format`: `generic` (default, today's behaviour), `thptqg` or `dgnl_hcm`. Templates live in a shared constants module (copied byte-identical into `backend/`, as `question.ts` is) and are applied by the builder when the format and subject are chosen. Counts and points come from the tables above and stay editable by the teacher, who may adjust a template for a practice test.
2. **Sections.** An exam stores an ordered list of sections: bilingual title, question kind, points rule, `question_ids`. A section may hold groups: a shared passage (bilingual text) plus the question ids that depend on it (reading comprehension, charts). Passages live in the exam, so the question schema and bank do not change.
3. **Server scoring** in `POST /api/score/exam`, selected by the exam's `format`:
   - `thptqg`: part I and III all-or-nothing at the section's points per question; part II on the ladder 0,1 / 0,25 / 0,5 / 1; total on a 10-point scale.
   - `dgnl_hcm`: equal weight per question within a component, 300 per component, 1200 total.
   - `generic`: unchanged.
   - The result adds per-section scores. Answers and keys still never reach the client.
4. **UI.** The builder gets a format step, then one tab per section, and a checklist showing when a section is short of or over the template. The exam room shows sections with their passages; `AnswerPalette` groups by section; the result page shows the per-section breakdown.
5. **Data.** One migration adds `format` (default `generic`) and the section structure to `exam_blueprints`. The existing `sections` column summarises types and difficulty today; the plan must decide whether to extend it or add a new column, and must keep review, release and import (`examSections`, `exam_question_release`) working for old exams.

## Testing

- Pure unit tests for scoring: the ladder for 0 to 4 correct statements, each THPTQG subject totalling exactly 10, ĐGNL totalling 1200, and `generic` exams scoring as before.
- Builder tests for template application and the over/under-count checklist.
- A server test that the exam payload for learners still carries no `answer`, `answer_key` or `correct`.

## Open items

- **Tin học part II:** the paper has 6 questions but each student answers 4. First version treats the section as 4 questions and notes the rule; supporting a choice of track is a follow-up.
- **Ngoại ngữ other than English, Ngữ văn:** not covered. Ngữ văn is free-form writing.
- **ĐGNL split** should be checked against the official ĐHQG-HCM sample paper before release.
- The sources describe the format "từ năm 2025". If Bộ GD&ĐT or ĐHQG-HCM revise it, templates are data, so updating is a content change.
