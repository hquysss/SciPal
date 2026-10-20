# Plan: mục "Bồi dưỡng HSG" (spec `specs/2026-10-19-hsg-exam-category-design.md`)

1. `supabase/migrations/20261020150000_exam_blueprints_category.sql`: thêm cột `category` (default `standard`, check `standard|hsg`).
2. `backend/src/exam/blueprintSummary.ts`: `BlueprintRow.category?`, `BlueprintSummary.category`, `blueprintCategory()` (thiếu/lạ → `standard`). Danh sách đã đọc `*` nên không đổi query. Test trong `blueprintSummary.test.ts`.
3. `frontend/features/exam/examQueries.ts`: `category?: 'standard' | 'hsg'`.
4. `frontend/features/exam/ExamListNotices.tsx`: nhóm "Bồi dưỡng HSG" đầu tiên; đề `hsg` bị loại khỏi các nhóm format. Test hiển thị.
5. Kiểm: typecheck, test backend + frontend; áp migration lên Supabase; `update exam_blueprints set category='hsg'` cho đề Sàng nguyên tố.
