INSERT INTO subjects (slug, name_en, name_vi, accent_color, icon, status, sort_order, education_level)
VALUES
  ('informatics', 'Informatics', 'Tin học',  '#16a34a', '</>', 'active',   0, 'upper_secondary'),
  ('math',        'Mathematics', 'Toán',     '#2563eb', '∑',   'upcoming', 1, 'upper_secondary'),
  ('physics',     'Physics',     'Vật lí',   '#7c3aed', '⚛',   'upcoming', 2, 'upper_secondary'),
  ('chemistry',   'Chemistry',   'Hoá học',  '#0d9488', '⚗',   'upcoming', 3, 'upper_secondary'),
  ('biology',     'Biology',     'Sinh học', '#65a30d', '❁',   'upcoming', 4, 'upper_secondary'),
  ('primary-math', 'Mathematics', 'Toán', '#8A3E1F', '∑', 'upcoming', 0, 'primary'),
  ('primary-informatics-technology', 'Informatics and Technology', 'Tin học và Công nghệ', '#8A3E1F', '</>', 'upcoming', 1, 'primary'),
  ('primary-nature-society', 'Nature and Society', 'Tự nhiên và Xã hội', '#8A3E1F', '◎', 'upcoming', 2, 'primary'),
  ('primary-science', 'Science', 'Khoa học', '#8A3E1F', '◌', 'upcoming', 3, 'primary'),
  ('primary-stem-exploration', 'STEM Exploration', 'Khám phá STEM', '#8A3E1F', '✳', 'upcoming', 4, 'primary'),
  ('lower-math', 'Mathematics', 'Toán', '#245398', '∑', 'upcoming', 0, 'lower_secondary'),
  ('lower-natural-science', 'Natural Science', 'Khoa học tự nhiên', '#245398', '⚛', 'upcoming', 1, 'lower_secondary'),
  ('lower-informatics', 'Informatics', 'Tin học', '#245398', '</>', 'upcoming', 2, 'lower_secondary'),
  ('lower-technology', 'Technology', 'Công nghệ', '#245398', '⚙', 'upcoming', 3, 'lower_secondary'),
  ('lower-stem-projects', 'STEM Projects', 'Dự án STEM', '#245398', '✳', 'upcoming', 4, 'lower_secondary')
ON CONFLICT (slug) DO NOTHING;
