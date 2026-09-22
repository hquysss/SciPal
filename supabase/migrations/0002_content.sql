CREATE TABLE topics (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  slug       text NOT NULL,
  name_en    text NOT NULL,
  name_vi    text NOT NULL,
  sort_order int  NOT NULL DEFAULT 0,
  UNIQUE(subject_id, slug)
);

CREATE TABLE lessons (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id   uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id),
  slug       text NOT NULL,
  title_en   text NOT NULL,
  title_vi   text NOT NULL,
  grade      int  NOT NULL DEFAULT 11 CHECK (grade IN (10,11,12)),
  blocks     jsonb NOT NULL DEFAULT '[]',
  sort_order int  NOT NULL DEFAULT 0,
  published  bool NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(subject_id, slug)
);

CREATE TABLE terms (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id     uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  term_en        text NOT NULL,
  term_vi        text NOT NULL,
  part_of_speech text,
  definition_en  text NOT NULL,
  definition_vi  text NOT NULL,
  example_en     text,
  example_vi     text,
  audio_url      text,
  tags           text[] DEFAULT '{}',
  UNIQUE(subject_id, term_en)
);

CREATE TABLE questions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id   uuid NOT NULL REFERENCES subjects(id),
  lesson_id    uuid REFERENCES lessons(id),
  type         text NOT NULL CHECK (type IN ('mc','truefalse','short')),
  difficulty   int  NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  objective_id text,
  data         jsonb NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE exam_blueprints (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text UNIQUE NOT NULL,
  grade      int,
  subject_id uuid REFERENCES subjects(id),
  sections   jsonb NOT NULL
);

CREATE TABLE resources (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id     uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  url            text NOT NULL,
  title_en       text NOT NULL,
  title_vi       text NOT NULL,
  description_en text,
  description_vi text,
  category       text NOT NULL CHECK (category IN ('practice','reference','simulation')),
  sort_order     int  NOT NULL DEFAULT 0
);
