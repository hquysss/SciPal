CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE subjects (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text UNIQUE NOT NULL,
  name_en      text NOT NULL,
  name_vi      text NOT NULL,
  accent_color text NOT NULL,
  icon         text NOT NULL,
  status       text NOT NULL DEFAULT 'upcoming'
                 CHECK (status IN ('active', 'upcoming')),
  sort_order   int  NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);
