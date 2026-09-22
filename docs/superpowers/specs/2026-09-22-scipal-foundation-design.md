# SciPal Foundation Design Spec

**Version:** 1.0  
**Date:** 2026-09-22  
**Source spec:** SciPal Đặc tả khung chung v1.4

---

## Background & Intent

SciPal is a bilingual (EN/VI) science learning platform for Vietnamese high-school students, initially focused on Informatics (Tin học). The core philosophy: **one UI framework, five subjects** — content is data, not code. Adding a new subject means loading new data + choosing a color/icon, not rebuilding the interface.

Success criteria:
- A new subject can be added by providing content data + accent color + icon, with zero UI code changes.
- All screens work offline (content pre-loaded); AI Tutor and streak sync require online.
- Scores and badges are server-authoritative (no client-side self-granting).
- The bilingual system (EN/VI) is first-class, not an afterthought.

---

## Architecture

```
scipal/                          ← Turborepo monorepo root
├── apps/
│   ├── web/                     ← Next.js 15 (App Router) → Vercel
│   ├── mobile/                  ← Expo 52 (React Native) → EAS
│   └── api/                     ← Node.js + Fastify → VM (Docker)
├── packages/
│   ├── ui/                      ← Shared React components (web + mobile)
│   ├── types/                   ← Shared TypeScript types & Zod schemas
│   ├── hooks/                   ← Shared React hooks
│   └── supabase/                ← Supabase client + generated DB types
└── supabase/
    ├── migrations/              ← SQL migration files
    └── seed/                    ← Seed data: Informatics subject + sample lesson
```

### Data flow

```
Client (web/mobile)
  ↓ fetch content/progress
Supabase (Postgres + Auth)   ← Row-Level Security on all user tables
  ↑ server-side only
apps/api (Fastify on VM)
  ↓ proxies AI calls (key hidden)
Claude API / OpenAI API       ← provider-agnostic interface
```

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Monorepo | Turborepo | Build cache shared between web/mobile/api |
| Web | Next.js 15 App Router | SSR for SEO on lesson pages; RSC for fast data |
| Mobile | Expo 52 (React Native) | Reuse React components from web |
| Shared UI | shadcn/ui + NativeWind v4 | Tailwind classes work on both platforms |
| Types | TypeScript + Zod | Runtime validation of content blocks |
| Backend | Node.js + Fastify | Familiar, fast, good TypeScript support |
| Database | Supabase (Postgres) | Managed Postgres + Auth + Realtime |
| Auth | Supabase Auth | Magic link + social; RLS integration |
| AI proxy | Fastify route on VM | Key hidden server-side; provider-agnostic |
| AI provider | Claude (primary) / OpenAI | Swappable via `AI_PROVIDER` env var |

---

## Database Schema

### Design principles
- Content stored as `JSONB` inside typed rows — flexible for block-based lessons
- User data in normalized tables — queryable, auditable
- All user-owned rows protected by Row-Level Security
- `subject_id` is a foreign key everywhere content lives — enables per-subject filtering

### Tables

```sql
-- ─────────────────────────────────────────────
-- CONTENT LAYER
-- ─────────────────────────────────────────────

subjects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,        -- 'informatics', 'math', ...
  name_en     text NOT NULL,
  name_vi     text NOT NULL,
  accent_color text NOT NULL,              -- hex, e.g. '#16a34a'
  icon        text NOT NULL,              -- '</>', '∑', '⚛', ...
  status      text NOT NULL DEFAULT 'upcoming',  -- 'active' | 'upcoming'
  sort_order  int  NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

topics (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id  uuid NOT NULL REFERENCES subjects(id),
  slug        text NOT NULL,
  name_en     text NOT NULL,
  name_vi     text NOT NULL,
  sort_order  int  NOT NULL DEFAULT 0,
  UNIQUE(subject_id, slug)
);

lessons (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id    uuid NOT NULL REFERENCES topics(id),
  subject_id  uuid NOT NULL REFERENCES subjects(id),
  slug        text NOT NULL,
  title_en    text NOT NULL,
  title_vi    text NOT NULL,
  grade       int  NOT NULL DEFAULT 11,   -- 10 | 11 | 12
  blocks      jsonb NOT NULL DEFAULT '[]',-- array of Block objects (see Content Schema)
  sort_order  int  NOT NULL DEFAULT 0,
  published   bool NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(subject_id, slug)
);

terms (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id    uuid NOT NULL REFERENCES subjects(id),
  term_en       text NOT NULL,
  term_vi       text NOT NULL,
  part_of_speech text,                    -- 'noun', 'verb', ...
  definition_en text NOT NULL,
  definition_vi text NOT NULL,
  example_en    text,
  example_vi    text,
  audio_url     text,                     -- TTS pre-generated URL
  tags          text[] DEFAULT '{}',
  UNIQUE(subject_id, term_en)
);

questions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id    uuid NOT NULL REFERENCES subjects(id),
  lesson_id     uuid REFERENCES lessons(id),
  type          text NOT NULL,            -- 'mc' | 'truefalse' | 'short'
  difficulty    int  NOT NULL DEFAULT 1,  -- 1=easy 2=medium 3=hard
  objective_id  text,                     -- curriculum standard tag
  data          jsonb NOT NULL,           -- see Question Schema below
  created_at    timestamptz DEFAULT now()
);

exam_blueprints (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text UNIQUE NOT NULL,       -- 'grade10-11-common', 'grade12-informatics'
  grade       int,                        -- null = multi-grade
  subject_id  uuid REFERENCES subjects(id), -- null = cross-subject combo
  sections    jsonb NOT NULL              -- array of {type, count, ...}
);

resources (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id  uuid NOT NULL REFERENCES subjects(id),
  url         text NOT NULL,
  title_en    text NOT NULL,
  title_vi    text NOT NULL,
  description_en text,
  description_vi text,
  category    text NOT NULL,             -- 'practice' | 'reference' | 'simulation'
  sort_order  int  NOT NULL DEFAULT 0
);

-- ─────────────────────────────────────────────
-- USER LAYER
-- ─────────────────────────────────────────────

profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id),
  display_name  text,
  role          text NOT NULL DEFAULT 'student',  -- 'student' | 'teacher'
  avatar_url    text,
  created_at    timestamptz DEFAULT now()
);

progress (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id),
  lesson_id   uuid NOT NULL REFERENCES lessons(id),
  completed_at timestamptz,
  score       numeric(5,2),             -- 0-100
  UNIQUE(user_id, lesson_id)
);

xp_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id),
  subject_id  uuid NOT NULL REFERENCES subjects(id),
  delta       int  NOT NULL,            -- XP amount
  reason      text NOT NULL,           -- 'lesson_complete' | 'correct_answer' | 'streak_bonus'
  created_at  timestamptz DEFAULT now()
);

streaks (
  user_id     uuid NOT NULL REFERENCES profiles(id),
  subject_id  uuid NOT NULL REFERENCES subjects(id),
  current_streak int NOT NULL DEFAULT 0,
  longest_streak int NOT NULL DEFAULT 0,
  last_active date,
  PRIMARY KEY(user_id, subject_id)
);

badges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id  uuid REFERENCES subjects(id),  -- null = global badge
  name_en     text NOT NULL,
  name_vi     text NOT NULL,
  icon        text NOT NULL,
  condition   jsonb NOT NULL            -- {type, threshold, ...}
);

user_badges (
  user_id     uuid NOT NULL REFERENCES profiles(id),
  badge_id    uuid NOT NULL REFERENCES badges(id),
  earned_at   timestamptz DEFAULT now(),
  PRIMARY KEY(user_id, badge_id)
);

class_rooms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  uuid NOT NULL REFERENCES profiles(id),
  subject_id  uuid NOT NULL REFERENCES subjects(id),
  name        text NOT NULL,
  invite_code text UNIQUE NOT NULL,
  created_at  timestamptz DEFAULT now()
);

class_members (
  class_id    uuid NOT NULL REFERENCES class_rooms(id),
  student_id  uuid NOT NULL REFERENCES profiles(id),
  joined_at   timestamptz DEFAULT now(),
  PRIMARY KEY(class_id, student_id)
);

assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id        uuid NOT NULL REFERENCES class_rooms(id),
  lesson_id       uuid REFERENCES lessons(id),
  blueprint_id    uuid REFERENCES exam_blueprints(id),
  due_at          timestamptz,
  created_at      timestamptz DEFAULT now()
);
```

### Row-Level Security policy summary
- `profiles`, `progress`, `xp_log`, `streaks`, `user_badges`: user sees only their own rows
- `class_rooms`: teacher sees own rooms; students see rooms they're members of
- `class_members`, `assignments`: members of the class see
- Content tables (`subjects`, `topics`, `lessons`, `terms`, `questions`, `resources`, `exam_blueprints`): public read; write restricted to `service_role` (authoring tool)

---

## Content Block Schema

`lessons.blocks` is a JSON array. Each element is a **Block** with a `type` discriminator:

```typescript
// Theory text — bilingual
type TheoryBlock = {
  type: 'theory';
  content: { en: string; vi: string };   // supports markdown + KaTeX inline
};

// Code block with multiple language tabs
type CodeBlock = {
  type: 'code';
  tabs: Array<{ lang: 'python' | 'cpp' | 'javascript'; code: string }>;
};

// Standalone KaTeX formula
type FormulaBlock = {
  type: 'formula';
  katex: string;
  caption?: { en: string; vi: string };
};

// Embedded quiz question (reference by ID)
type QuizBlock = {
  type: 'quiz';
  question_id: string;   // uuid → questions table
};

// Interactive simulation / experiment
type InteractiveBlock = {
  type: 'interactive';
  kind: 'algorithm-sim' | 'function-graph' | 'geometry-3d' | 'experiment' | 'bio-diagram';
  heading: { en: string; vi: string };
  caption?: { en: string; vi: string };
  offline: boolean;
  embed_url?: string;    // PhET or similar, online only
  config: Record<string, unknown>;  // kind-specific params (see spec §4)
};

// Term reference → links to Glossary
type TermRefBlock = {
  type: 'term-ref';
  term_id: string;       // uuid → terms table
};

// External resource card
type ResourceRefBlock = {
  type: 'resource-ref';
  resource_id: string;   // uuid → resources table
};

type Block =
  | TheoryBlock
  | CodeBlock
  | FormulaBlock
  | QuizBlock
  | InteractiveBlock
  | TermRefBlock
  | ResourceRefBlock;
```

### Question data schema

```typescript
// Multiple-choice (4 options)
type MCData = {
  stem: { en: string; vi: string };
  options: Array<{ id: string; text: { en: string; vi: string } }>;
  answer: string;            // option id
  explanation?: { en: string; vi: string };
};

// True/False with 4 sub-statements
type TrueFalseData = {
  stem: { en: string; vi: string };
  items: Array<{ id: string; text: { en: string; vi: string }; correct: boolean }>;
  explanation?: { en: string; vi: string };
};

// Short answer
type ShortData = {
  stem: { en: string; vi: string };
  answer_key: string;        // kept server-side only
  rubric?: { en: string; vi: string };
};
```

---

## Design Tokens

```css
/* Global — never changes */
--font-sans: 'Inter', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
--radius: 0.5rem;
--scipal-green: #16a34a;   /* brand color — 4-leaf clover */

/* Per-subject variable — set on :root or a scope element */
--accent: #16a34a;          /* Informatics (green)   */
/* --accent: #2563eb; */    /* Mathematics (blue)    */
/* --accent: #7c3aed; */    /* Physics (purple)      */
/* --accent: #0d9488; */    /* Chemistry (teal)      */
/* --accent: #65a30d; */    /* Biology (lime)        */
```

All themed components (lesson cards, progress bars, topic labels, AI tutor header) consume `--accent`. No screen hard-codes a subject color.

---

## API Design (Fastify on VM)

Base URL: `https://api.scipal.vn` (or `http://localhost:3001` in dev)

All routes require `Authorization: Bearer <supabase_jwt>` except `/health`.

```
GET  /health                       → { status: 'ok' }

POST /api/ai/chat                  → stream AI tutor response
  Body: { lesson_id, messages: Message[], subject_slug, language: 'en'|'vi' }
  → fetches lesson + terms from Supabase
  → builds system prompt with subject role + lesson context (RAG)
  → streams Claude/OpenAI response

POST /api/tts                      → text-to-speech URL
  Body: { text, language: 'en'|'vi' }
  → returns { url } (cached in Supabase Storage)

POST /api/score/lesson             → server-authoritative XP grant
  Body: { lesson_id, answers: Answer[] }
  → validates, writes progress + xp_log, updates streak
  → returns { xp_earned, new_streak, badges_unlocked[] }

POST /api/score/exam               → server-authoritative exam scoring
  Body: { blueprint_id, answers: Answer[] }
  → grades, writes results, returns breakdown by topic
```

### AI provider abstraction

```typescript
// packages/types/src/ai-provider.ts
interface AIProvider {
  chat(messages: ChatMessage[], systemPrompt: string): AsyncIterable<string>;
}
// Implementations: ClaudeProvider, OpenAIProvider
// Selected by AI_PROVIDER env var in apps/api
```

---

## Subject Registry (seed data)

```typescript
const SUBJECTS = [
  { slug: 'informatics', name_en: 'Informatics', name_vi: 'Tin học',
    accent_color: '#16a34a', icon: '</>', status: 'active', sort_order: 0 },
  { slug: 'math',        name_en: 'Mathematics', name_vi: 'Toán',
    accent_color: '#2563eb', icon: '∑',   status: 'upcoming', sort_order: 1 },
  { slug: 'physics',     name_en: 'Physics',     name_vi: 'Vật lí',
    accent_color: '#7c3aed', icon: '⚛',   status: 'upcoming', sort_order: 2 },
  { slug: 'chemistry',   name_en: 'Chemistry',   name_vi: 'Hoá học',
    accent_color: '#0d9488', icon: '⚗',   status: 'upcoming', sort_order: 3 },
  { slug: 'biology',     name_en: 'Biology',     name_vi: 'Sinh học',
    accent_color: '#65a30d', icon: '❁',   status: 'upcoming', sort_order: 4 },
];
```

---

## Bilingual System

- All user-facing text in content tables has `_en` and `_vi` columns or `{ en, vi }` JSON keys.
- UI language toggled via `?lang=en|vi` query param (persisted to `localStorage`).
- `packages/hooks/src/useLanguage.ts` — shared hook, returns `{ lang, setLang, t(key) }`.
- Glossary is the **single source of truth** for term translations; all lesson blocks that reference a term use `term-ref` blocks pointing to the glossary ID, not inline text.

---

## Offline Strategy

- Next.js: service worker (Serwist) caches lesson pages after first visit.
- Expo: content fetched at lesson-list open time, stored in MMKV.
- Interactive blocks run in-browser (no network). PhET embeds are online-only (guarded by `offline: false`).
- AI Tutor and streak sync: disabled UI when offline; queued sync when reconnect.

---

## Security

- AI API key never leaves the VM. Clients send Supabase JWT; VM validates it before proxying.
- XP and badges granted only by `apps/api`, never by client.
- Short-answer answer keys stored server-side only (`answer_key` excluded from client queries via RLS column-level security or a DB view).
- Exam answers submitted to `/api/score/exam`; correct answers not returned to client.

---

## Screen Inventory (12 screens, built sequentially)

| # | Screen | Key dependency |
|---|---|---|
| S0 | Foundation (this plan) | — |
| S1 | Navigation (Nav) | Design tokens, subject registry |
| S2 | Home | S1, subject list |
| S3 | Lesson List | S1, lessons + topics |
| S4 | Lesson View (core) | S3, block renderer, glossary |
| S5 | AI Tutor | S4, `/api/ai/chat` |
| S6 | Glossary | S1, terms |
| S6b | Resources | S1, resources |
| S7 | Progress / Streak / Badges | S4, `/api/score/lesson` |
| S8 | Profile | S7, auth |
| S9 | Exam Mode | S7, `/api/score/exam`, blueprints |
| S10 | Authoring (Teacher) | Supabase service_role |
| S11 | Class Management | S8, class_rooms, assignments |
