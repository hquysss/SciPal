-- Dọn dữ liệu demo khỏi Supabase — CHẠY TAY, không phải migration.
-- Chạy trong SQL Editor của Supabase (hoặc psql) với quyền service role / postgres.
--
-- Phần 1 chỉ đọc: xem kỹ kết quả trước khi chạy phần 2.
-- Phần 2 nằm trong một transaction và mặc định kết thúc bằng ROLLBACK (không lưu gì).
-- Sau khi kiểm tra kết quả trong transaction, đổi dòng cuối thành COMMIT để lưu.

-- ===================== Phần 1 — xem trước =====================

-- 1a. Bài demo "Binary Search" của Tin học.
select id, slug, title_vi, status
from public.lessons
where slug = 'binary-search' and subject_id = (select id from public.subjects where slug = 'informatics');

-- 1b. Chủ đề demo.
select t.id, t.slug, t.name_vi, t.grade
from public.topics t
where t.slug = 'topic-f-algorithms';

-- 1c. MỌI bài thuộc chủ đề demo — các bài này bị xoá theo chủ đề (ON DELETE CASCADE),
--     kể cả bài do giáo viên tạo. Nếu có bài cần giữ, chuyển nó sang chủ đề khác trước.
select l.id, l.slug, l.title_vi, l.grade, l.status, l.created_by
from public.lessons l join public.topics t on t.id = l.topic_id
where t.slug = 'topic-f-algorithms';

-- 1d. Bảng khác tham chiếu tới các bài sẽ bị xoá (in ra dưới dạng NOTICE).
--     progress.lesson_id có ON DELETE CASCADE: tiến độ của các bài này bị xoá theo.
--     Các khoá ngoại không có ON DELETE (ví dụ questions/resources/assignments.lesson_id)
--     sẽ được gỡ liên kết (đặt NULL) ở phần 2 trước khi xoá bài.
do $$
declare
  fk record;
  n bigint;
begin
  for fk in
    select c.conrelid::regclass as tbl, a.attname as col, c.confdeltype
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'f' and c.confrelid = 'public.lessons'::regclass
  loop
    execute format(
      'select count(*) from %s where %I in (select l.id from public.lessons l left join public.topics t on t.id = l.topic_id '
      || 'where (l.slug = ''binary-search'' and l.subject_id = (select id from public.subjects where slug = ''informatics'')) '
      || 'or t.slug = ''topic-f-algorithms'')',
      fk.tbl, fk.col) into n;
    raise notice '%.% (on delete %): % dòng', fk.tbl, fk.col, fk.confdeltype, n;
  end loop;
end $$;

-- 1e. Thuật ngữ demo "algorithm" của Tin học.
select te.id, te.term_en, te.term_vi
from public.terms te
where term_en = 'algorithm' and te.subject_id = (select id from public.subjects where slug = 'informatics');

-- 1f. Mọi đề thi hiện có (toàn bộ đề hiện nay là demo — kiểm tra lại trước khi xoá).
select id, name, grade from public.exam_blueprints;

-- ===================== Phần 2 — xoá (trong transaction) =====================

begin;

create temp table demo_lessons on commit drop as
select l.id
from public.lessons l
left join public.topics t on t.id = l.topic_id
where (l.slug = 'binary-search' and l.subject_id = (select id from public.subjects where slug = 'informatics'))
   or t.slug = 'topic-f-algorithms';

-- Gỡ liên kết ở mọi khoá ngoại tới lessons không có ON DELETE (giữ nguyên dòng, chỉ đặt NULL).
do $$
declare
  fk record;
begin
  for fk in
    select c.conrelid::regclass as tbl, a.attname as col
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'f' and c.confrelid = 'public.lessons'::regclass and c.confdeltype in ('a', 'r')
  loop
    execute format('update %s set %I = null where %I in (select id from demo_lessons)', fk.tbl, fk.col, fk.col);
  end loop;
end $$;

-- Tương tự cho khoá ngoại tới exam_blueprints trước khi xoá đề.
do $$
declare
  fk record;
begin
  for fk in
    select c.conrelid::regclass as tbl, a.attname as col
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'f' and c.confrelid = 'public.exam_blueprints'::regclass and c.confdeltype in ('a', 'r')
  loop
    execute format('update %s set %I = null where %I is not null', fk.tbl, fk.col, fk.col);
  end loop;
end $$;

delete from public.lessons where id in (select id from demo_lessons);
delete from public.topics where slug = 'topic-f-algorithms';
delete from public.terms
where term_en = 'algorithm' and subject_id = (select id from public.subjects where slug = 'informatics');

-- Chỉ giữ dòng dưới khi mọi đề thi ở bước 1f đều là demo.
delete from public.exam_blueprints;

-- Kiểm tra lại (phải ra 0).
select
  (select count(*) from public.lessons where id in (select id from demo_lessons)) as lessons_left,
  (select count(*) from public.topics where slug = 'topic-f-algorithms') as topics_left;

-- Mặc định không lưu. Đổi dòng dưới thành commit; sau khi đã kiểm tra.
rollback;
