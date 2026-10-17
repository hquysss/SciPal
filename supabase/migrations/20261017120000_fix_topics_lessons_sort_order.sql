-- Migration: 20261017120000_fix_topics_lessons_sort_order.sql
-- Fix topics and lessons sort_order to accurately reflect the GDPT 2018 textbook structure.

-- 1. Topics sort_order:
-- Informatics:
--   Grade 10: Topic 5 "Giải quyết vấn đề với sự trợ giúp của máy tính" -> sort_order = 5
--   Grade 11: Topic 6 "Kĩ thuật lập trình" -> sort_order = 6
--   Grade 12: Topic 4 "Giải quyết vấn đề với sự trợ giúp của máy tính" -> sort_order = 4
--   Grade 12: Topic 7 "Ứng dụng tin học" -> sort_order = 7
-- History:
--   Grade 11: Topic 1 "Cách mạng tư sản..." -> sort_order = 1
--   Grade 11: Topic 2 "Chủ nghĩa xã hội..." -> sort_order = 2
--   Grade 11: Topic 3 "Chiến tranh bảo vệ Tổ quốc..." -> sort_order = 3
--   Grade 11: Topic 4 "Một số cuộc cải cách lớn..." -> sort_order = 4

UPDATE public.topics t
SET sort_order = CASE
  WHEN s.slug = 'informatics' AND t.grade = 10 AND t.name_vi ILIKE '%Giải quyết vấn đề%' THEN 5
  WHEN s.slug = 'informatics' AND t.grade = 11 AND t.name_vi ILIKE '%Kĩ thuật lập trình%' THEN 6
  WHEN s.slug = 'informatics' AND t.grade = 12 AND t.name_vi ILIKE '%Giải quyết vấn đề%' THEN 4
  WHEN s.slug = 'informatics' AND t.grade = 12 AND t.name_vi ILIKE '%Ứng dụng tin học%' THEN 7
  WHEN s.slug = 'history' AND t.name_vi ILIKE '%Cách mạng tư sản%' THEN 1
  WHEN s.slug = 'history' AND t.name_vi ILIKE '%Chủ nghĩa xã hội%' THEN 2
  WHEN s.slug = 'history' AND t.name_vi ILIKE '%Chiến tranh bảo vệ Tổ quốc%' THEN 3
  WHEN s.slug = 'history' AND t.name_vi ILIKE '%Một số cuộc cải cách lớn%' THEN 4
  ELSE t.sort_order
END
FROM public.subjects s
WHERE t.subject_id = s.id;

-- 2. Lessons sort_order:
-- Extract lesson number from title_vi (e.g. 'Bài 19. ...' -> 19) when present.
UPDATE public.lessons
SET sort_order = substring(title_vi from '^(?:Bài|Lesson)\s*([0-9]+)')::int
WHERE title_vi ~* '^(?:Bài|Lesson)\s*[0-9]+';
