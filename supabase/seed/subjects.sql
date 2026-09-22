INSERT INTO subjects (slug, name_en, name_vi, accent_color, icon, status, sort_order)
VALUES
  ('informatics', 'Informatics', 'Tin học',  '#16a34a', '</>', 'active',   0),
  ('math',        'Mathematics', 'Toán',     '#2563eb', '∑',   'upcoming', 1),
  ('physics',     'Physics',     'Vật lí',   '#7c3aed', '⚛',   'upcoming', 2),
  ('chemistry',   'Chemistry',   'Hoá học',  '#0d9488', '⚗',   'upcoming', 3),
  ('biology',     'Biology',     'Sinh học', '#65a30d', '❁',   'upcoming', 4)
ON CONFLICT (slug) DO NOTHING;
