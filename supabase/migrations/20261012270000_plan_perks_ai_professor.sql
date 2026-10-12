-- The assistant is now "Giáo sư AI" / "the AI Professor" (it was "Giáo sư Quý" / "Professor Quys").
-- The plan perks seeded earlier still use the old name. Only rows that contain it are touched.
-- Rollback: the reverse replace, 'Giáo sư AI' -> 'Giáo sư Quý' and 'AI Professor' -> 'Professor Quys'.
update public.billing_plans
   set perks = replace(replace(replace(replace(perks::text,
         'with Professor Quys', 'with the AI Professor'),
         'ask Professor Quys', 'ask the AI Professor'),
         'Professor Quys', 'AI Professor'),
         'Giáo sư Quý', 'Giáo sư AI')::jsonb
 where perks::text like '%Professor Quys%' or perks::text like '%Giáo sư Quý%';
