ALTER TABLE public.subjects
  ADD COLUMN education_level text NOT NULL DEFAULT 'upper_secondary'
  CHECK (education_level IN ('primary', 'lower_secondary', 'upper_secondary'));

ALTER TABLE public.profiles
  ADD COLUMN preferred_education_level text
  CHECK (preferred_education_level IN ('primary', 'lower_secondary', 'upper_secondary'));

CREATE INDEX subjects_education_level_sort_order_idx
  ON public.subjects (education_level, sort_order);
