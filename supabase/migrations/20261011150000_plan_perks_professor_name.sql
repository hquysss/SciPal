-- The assistant is "Giáo sư Quý" / "Professor Quys" everywhere; the seeded plan perks still said SciPal.
update public.billing_plans
   set perks = replace(replace(replace(perks::text, 'Giáo sư SciPal', 'Giáo sư Quý'), 'the SciPal Professor', 'Professor Quys'), 'SciPal Professor', 'Professor Quys')::jsonb
 where perks::text like '%SciPal%';
