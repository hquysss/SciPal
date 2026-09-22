# SciPal — Plan 0: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the Turborepo monorepo with Next.js web, Expo mobile, and Fastify API apps; set up Supabase schema with seed data for Informatics; build the shared `packages/ui`, `packages/types`, `packages/hooks`, and `packages/supabase`; wire environment configuration, Supabase Auth, and design tokens — so every subsequent screen plan has a complete, running foundation to build on.

**Architecture:** Turborepo monorepo (`apps/web`, `apps/mobile`, `apps/api`) with three shared packages (`ui`, `types`, `hooks`, `supabase`). Supabase hosts Postgres (content + user tables) with RLS. The Fastify API on a VM proxies AI calls server-side. Design tokens use a single CSS/JS `--accent` variable driven by the active subject.

**Tech Stack:** Node 20, pnpm workspaces, Turborepo, Next.js 15 (App Router), Expo 52, Fastify 4, Supabase (Postgres + Auth + Storage), TypeScript 5, Zod, Tailwind CSS 3, NativeWind v4, shadcn/ui, Vitest, Jest (Expo)

**Spec:** [`docs/superpowers/specs/2026-09-22-scipal-foundation-design.md`](../specs/2026-09-22-scipal-foundation-design.md)

---

## Global Constraints

- Node ≥ 20.x; pnpm ≥ 9.x — enforce in `engines` field of root `package.json`
- All user-facing strings in content have bilingual `{ en, vi }` shape or `_en`/`_vi` columns
- No subject color is hard-coded in any UI component — always read `--accent` CSS variable or the equivalent JS token
- AI API keys live only in `apps/api/.env` — never in `apps/web` or `apps/mobile`
- XP, streaks, and badge grants happen only inside `apps/api` — never computed client-side
- All Supabase user tables have RLS enabled; content tables are public-read
- Short-answer `answer_key` is excluded from any client-facing query
- TypeScript strict mode on (`"strict": true`) in all packages and apps

---

## Review Focus

- **Accent variable isolation:** A component rendered in subject A must not bleed `--accent` into a sibling rendered in subject B. Each subject scope must set the variable on the nearest container, not on `:root` globally. → Covered by Task 5 token test.
- **RLS bypass via service_role:** If a client ever receives the `service_role` key, RLS is void. Verify the key is only used in `apps/api` server code, never shipped to the browser or Expo bundle. → Covered by Task 3 env-key placement check.
- **JSONB block validation:** A lesson with a malformed block (missing `type`, wrong `kind`) must fail at insert time with a clear error, not silently store invalid data. → Covered by Task 4 Zod schema test.
- **Auth token forwarding:** The Fastify API must reject requests without a valid Supabase JWT; it must not forward the request to the AI provider. → Covered by Task 7 auth middleware test.
- **pnpm workspace isolation:** An `import` from `apps/web` that accidentally resolves to a node_modules copy instead of `packages/ui` causes silent duplication. Verify workspace protocol (`workspace:*`) is used for all internal packages. → Covered by Task 1 workspace config check.

---

## Task 1: Turborepo Monorepo Scaffold

**Files:**
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.nvmrc`
- Create: `.gitignore`
- Create: `tsconfig.base.json`

**Interfaces:**
- Produces: workspace packages resolvable as `@scipal/ui`, `@scipal/types`, `@scipal/hooks`, `@scipal/supabase`

- [ ] **Step 1: Initialise git repo**

```bash
cd d:\Code\SciPal
git init
```

- [ ] **Step 2: Create root `package.json`**

```json
{
  "name": "scipal",
  "private": true,
  "engines": { "node": ">=20.0.0", "pnpm": ">=9.0.0" },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.5.0",
    "@types/node": "^20.0.0"
  }
}
```

- [ ] **Step 3: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 4: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "outputs": ["coverage/**"]
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

- [ ] **Step 5: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

- [ ] **Step 6: Create `.nvmrc`**

```
20
```

- [ ] **Step 7: Create root `.gitignore`**

```
node_modules/
.turbo/
dist/
.next/
.expo/
*.env
*.env.local
.DS_Store
coverage/
```

- [ ] **Step 8: Install root deps**

```bash
pnpm install
```

- [ ] **Step 9: Verify workspace resolution**

After adding packages in Tasks 2–6, run:
```bash
pnpm ls -r --depth 0
```
Expected: all `@scipal/*` packages listed. If any show as external npm packages instead of workspace entries, check that `package.json` in each package uses `"@scipal/types": "workspace:*"` not a version number.

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "chore: initialise Turborepo monorepo scaffold"
```

---

## Task 2: Shared Package Skeletons

**Files:**
- Create: `packages/types/package.json`
- Create: `packages/types/tsconfig.json`
- Create: `packages/types/src/index.ts`
- Create: `packages/hooks/package.json`
- Create: `packages/hooks/tsconfig.json`
- Create: `packages/hooks/src/index.ts`
- Create: `packages/supabase/package.json`
- Create: `packages/supabase/tsconfig.json`
- Create: `packages/supabase/src/index.ts`
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/index.ts`

**Interfaces:**
- Produces: four importable packages — `@scipal/types`, `@scipal/hooks`, `@scipal/supabase`, `@scipal/ui`

- [ ] **Step 1: Create `packages/types/package.json`**

```json
{
  "name": "@scipal/types",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.23.0"
  }
}
```

- [ ] **Step 2: Create `packages/types/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create stub `packages/types/src/index.ts`**

```typescript
// Populated in Task 4 (content schemas) and Task 3 (DB types)
export {};
```

- [ ] **Step 4: Repeat for `packages/hooks`, `packages/supabase`, `packages/ui`**

Create identical `package.json` and `tsconfig.json` for each, replacing `@scipal/types` with the appropriate name. Add peer deps for hooks and ui:

`packages/hooks/package.json` — add `"peerDependencies": { "react": ">=18" }`.

`packages/ui/package.json` — add:
```json
{
  "peerDependencies": { "react": ">=18", "react-native": ">=0.73" },
  "devDependencies": { "tailwindcss": "^3.4.0" }
}
```

- [ ] **Step 5: Install workspace packages**

```bash
pnpm install
```

- [ ] **Step 6: Commit**

```bash
git add packages/
git commit -m "chore: add shared package skeletons (types, hooks, supabase, ui)"
```

---

## Task 3: Supabase Project + Schema Migrations

**Files:**
- Create: `supabase/migrations/0001_subjects.sql`
- Create: `supabase/migrations/0002_content.sql`
- Create: `supabase/migrations/0003_user_data.sql`
- Create: `supabase/migrations/0004_rls.sql`
- Create: `supabase/seed/subjects.sql`
- Create: `.env.example` (root)
- Create: `apps/api/.env.example`

**Interfaces:**
- Produces: Supabase project with all tables from the spec; `SUPABASE_URL`, `SUPABASE_ANON_KEY` env vars

- [ ] **Step 1: Create a Supabase project**

Go to https://supabase.com → New project → name: `scipal-dev`.  
Save the Project URL and anon key.

- [ ] **Step 2: Install Supabase CLI**

```bash
pnpm add -Dw supabase
pnpm supabase --version   # expect ≥ 1.180.0
```

- [ ] **Step 3: Link CLI to project**

```bash
pnpm supabase login
pnpm supabase link --project-ref <YOUR_PROJECT_REF>
```

- [ ] **Step 4: Create `supabase/migrations/0001_subjects.sql`**

```sql
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
```

- [ ] **Step 5: Create `supabase/migrations/0002_content.sql`**

```sql
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
```

- [ ] **Step 6: Create `supabase/migrations/0003_user_data.sql`**

```sql
CREATE TABLE profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  role         text NOT NULL DEFAULT 'student' CHECK (role IN ('student','teacher')),
  avatar_url   text,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE progress (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id    uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at timestamptz,
  score        numeric(5,2),
  UNIQUE(user_id, lesson_id)
);

CREATE TABLE xp_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id),
  delta      int  NOT NULL,
  reason     text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE streaks (
  user_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id     uuid NOT NULL REFERENCES subjects(id),
  current_streak int  NOT NULL DEFAULT 0,
  longest_streak int  NOT NULL DEFAULT 0,
  last_active    date,
  PRIMARY KEY(user_id, subject_id)
);

CREATE TABLE badges (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES subjects(id),
  name_en    text NOT NULL,
  name_vi    text NOT NULL,
  icon       text NOT NULL,
  condition  jsonb NOT NULL
);

CREATE TABLE user_badges (
  user_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id  uuid NOT NULL REFERENCES badges(id),
  earned_at timestamptz DEFAULT now(),
  PRIMARY KEY(user_id, badge_id)
);

CREATE TABLE class_rooms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  uuid NOT NULL REFERENCES profiles(id),
  subject_id  uuid NOT NULL REFERENCES subjects(id),
  name        text NOT NULL,
  invite_code text UNIQUE NOT NULL DEFAULT substring(md5(random()::text), 1, 8),
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE class_members (
  class_id   uuid NOT NULL REFERENCES class_rooms(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id),
  joined_at  timestamptz DEFAULT now(),
  PRIMARY KEY(class_id, student_id)
);

CREATE TABLE assignments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id     uuid NOT NULL REFERENCES class_rooms(id) ON DELETE CASCADE,
  lesson_id    uuid REFERENCES lessons(id),
  blueprint_id uuid REFERENCES exam_blueprints(id),
  due_at       timestamptz,
  created_at   timestamptz DEFAULT now()
);

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles(id) VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

- [ ] **Step 7: Create `supabase/migrations/0004_rls.sql`**

```sql
-- Enable RLS on all user tables
ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress     ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges  ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_rooms  ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments  ENABLE ROW LEVEL SECURITY;

-- profiles: own row only
CREATE POLICY "profiles: own row" ON profiles
  USING (auth.uid() = id);

-- progress: own rows only
CREATE POLICY "progress: own rows" ON progress
  USING (auth.uid() = user_id);

-- xp_log: own rows only
CREATE POLICY "xp_log: own rows" ON xp_log
  USING (auth.uid() = user_id);

-- streaks: own rows only
CREATE POLICY "streaks: own rows" ON streaks
  USING (auth.uid() = user_id);

-- user_badges: own rows only
CREATE POLICY "user_badges: own rows" ON user_badges
  USING (auth.uid() = user_id);

-- class_rooms: teacher sees own; student sees rooms they're in
CREATE POLICY "class_rooms: teacher" ON class_rooms
  USING (auth.uid() = teacher_id);
CREATE POLICY "class_rooms: member" ON class_rooms
  USING (EXISTS (
    SELECT 1 FROM class_members
    WHERE class_members.class_id = id
      AND class_members.student_id = auth.uid()
  ));

-- class_members: visible to teacher of the room or the student themselves
CREATE POLICY "class_members: visible" ON class_members
  USING (
    auth.uid() = student_id
    OR EXISTS (
      SELECT 1 FROM class_rooms
      WHERE class_rooms.id = class_id
        AND class_rooms.teacher_id = auth.uid()
    )
  );

-- assignments: visible to class members
CREATE POLICY "assignments: visible" ON assignments
  USING (EXISTS (
    SELECT 1 FROM class_members
    WHERE class_members.class_id = assignments.class_id
      AND class_members.student_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM class_rooms
    WHERE class_rooms.id = assignments.class_id
      AND class_rooms.teacher_id = auth.uid()
  ));

-- Content tables: public read (no RLS needed — default Supabase allows anon read)
-- Write is restricted to service_role via Supabase dashboard setting
```

- [ ] **Step 8: Create `supabase/seed/subjects.sql`**

```sql
INSERT INTO subjects (slug, name_en, name_vi, accent_color, icon, status, sort_order)
VALUES
  ('informatics', 'Informatics', 'Tin học',  '#16a34a', '</>', 'active',   0),
  ('math',        'Mathematics', 'Toán',     '#2563eb', '∑',   'upcoming', 1),
  ('physics',     'Physics',     'Vật lí',   '#7c3aed', '⚛',   'upcoming', 2),
  ('chemistry',   'Chemistry',   'Hoá học',  '#0d9488', '⚗',   'upcoming', 3),
  ('biology',     'Biology',     'Sinh học', '#65a30d', '❁',   'upcoming', 4)
ON CONFLICT (slug) DO NOTHING;
```

- [ ] **Step 9: Run migrations + seed**

```bash
pnpm supabase db push
# Then in Supabase SQL Editor, run supabase/seed/subjects.sql
# Or: pnpm supabase db seed --local (if using local dev)
```

- [ ] **Step 10: Create root `.env.example`**

```env
# Copy to .env.local in apps/web and apps/mobile
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

- [ ] **Step 11: Create `apps/api/.env.example`**

```env
# Server-only — never commit real values
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # service_role, NEVER the anon key
AI_PROVIDER=claude                  # 'claude' | 'openai'
CLAUDE_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
PORT=3001
```

**Verify:** `SUPABASE_SERVICE_ROLE_KEY` exists ONLY in `apps/api/.env*`. Search the repo:
```bash
grep -r "SERVICE_ROLE" --include="*.ts" --include="*.tsx" --include="*.js" apps/web apps/mobile packages/
```
Expected: zero results.

- [ ] **Step 12: Commit**

```bash
git add supabase/ .env.example apps/api/.env.example
git commit -m "chore: add Supabase migrations, RLS policies, and seed data"
```

---

## Task 4: Content Block & Question Zod Schemas (`packages/types`)

**Files:**
- Create: `packages/types/src/block.ts`
- Create: `packages/types/src/question.ts`
- Create: `packages/types/src/subject.ts`
- Create: `packages/types/src/index.ts` (updated)
- Create: `packages/types/src/__tests__/block.test.ts`
- Create: `packages/types/src/__tests__/question.test.ts`

**Interfaces:**
- Produces: `Block`, `Question`, `Subject` Zod schemas + inferred TypeScript types exported from `@scipal/types`
- Consumes: nothing (leaf package)

- [ ] **Step 1: Add Vitest to `packages/types`**

```bash
pnpm --filter @scipal/types add -D vitest
```

Add to `packages/types/package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Write failing tests for block schema validation**

Create `packages/types/src/__tests__/block.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { BlockSchema } from '../block';

describe('BlockSchema', () => {
  it('parses a valid theory block', () => {
    const input = {
      type: 'theory',
      content: { en: 'Hello', vi: 'Xin chào' },
    };
    expect(() => BlockSchema.parse(input)).not.toThrow();
  });

  it('parses a valid code block with multiple tabs', () => {
    const input = {
      type: 'code',
      tabs: [
        { lang: 'python', code: 'print("hello")' },
        { lang: 'cpp',    code: 'cout << "hello";' },
      ],
    };
    expect(() => BlockSchema.parse(input)).not.toThrow();
  });

  it('parses a valid interactive block', () => {
    const input = {
      type: 'interactive',
      kind: 'algorithm-sim',
      heading: { en: 'Binary Search', vi: 'Tìm kiếm nhị phân' },
      offline: true,
      config: { algorithm: 'binary-search', data: [1,2,3], target: 2 },
    };
    expect(() => BlockSchema.parse(input)).not.toThrow();
  });

  it('rejects a block with unknown type', () => {
    const input = { type: 'video', url: 'https://example.com' };
    expect(() => BlockSchema.parse(input)).toThrow();
  });

  it('rejects an interactive block with invalid kind', () => {
    const input = {
      type: 'interactive',
      kind: 'unknown-kind',
      heading: { en: 'X', vi: 'Y' },
      offline: true,
      config: {},
    };
    expect(() => BlockSchema.parse(input)).toThrow();
  });

  it('rejects a theory block missing vi content', () => {
    const input = { type: 'theory', content: { en: 'Hello' } };
    expect(() => BlockSchema.parse(input)).toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm --filter @scipal/types test
```
Expected: FAIL — `BlockSchema` not found.

- [ ] **Step 4: Implement `packages/types/src/block.ts`**

```typescript
import { z } from 'zod';

const BilingualText = z.object({ en: z.string(), vi: z.string() });

export const TheoryBlockSchema = z.object({
  type: z.literal('theory'),
  content: BilingualText,
});

export const CodeBlockSchema = z.object({
  type: z.literal('code'),
  tabs: z.array(z.object({
    lang: z.enum(['python', 'cpp', 'javascript']),
    code: z.string(),
  })).min(1),
});

export const FormulaBlockSchema = z.object({
  type: z.literal('formula'),
  katex: z.string(),
  caption: BilingualText.optional(),
});

export const QuizBlockSchema = z.object({
  type: z.literal('quiz'),
  question_id: z.string().uuid(),
});

export const InteractiveBlockSchema = z.object({
  type: z.literal('interactive'),
  kind: z.enum(['algorithm-sim','function-graph','geometry-3d','experiment','bio-diagram']),
  heading: BilingualText,
  caption: BilingualText.optional(),
  offline: z.boolean(),
  embed_url: z.string().url().optional(),
  config: z.record(z.unknown()),
});

export const TermRefBlockSchema = z.object({
  type: z.literal('term-ref'),
  term_id: z.string().uuid(),
});

export const ResourceRefBlockSchema = z.object({
  type: z.literal('resource-ref'),
  resource_id: z.string().uuid(),
});

export const BlockSchema = z.discriminatedUnion('type', [
  TheoryBlockSchema,
  CodeBlockSchema,
  FormulaBlockSchema,
  QuizBlockSchema,
  InteractiveBlockSchema,
  TermRefBlockSchema,
  ResourceRefBlockSchema,
]);

export type Block = z.infer<typeof BlockSchema>;
export type TheoryBlock       = z.infer<typeof TheoryBlockSchema>;
export type CodeBlock         = z.infer<typeof CodeBlockSchema>;
export type FormulaBlock      = z.infer<typeof FormulaBlockSchema>;
export type QuizBlock         = z.infer<typeof QuizBlockSchema>;
export type InteractiveBlock  = z.infer<typeof InteractiveBlockSchema>;
export type TermRefBlock      = z.infer<typeof TermRefBlockSchema>;
export type ResourceRefBlock  = z.infer<typeof ResourceRefBlockSchema>;
```

- [ ] **Step 5: Write failing tests for question schema**

Create `packages/types/src/__tests__/question.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { MCDataSchema, TrueFalseDataSchema, ShortDataSchema } from '../question';

describe('MCDataSchema', () => {
  it('parses valid MC data', () => {
    const data = {
      stem: { en: 'What is 2+2?', vi: '2+2 bằng bao nhiêu?' },
      options: [
        { id: 'a', text: { en: '3', vi: '3' } },
        { id: 'b', text: { en: '4', vi: '4' } },
        { id: 'c', text: { en: '5', vi: '5' } },
        { id: 'd', text: { en: '6', vi: '6' } },
      ],
      answer: 'b',
    };
    expect(() => MCDataSchema.parse(data)).not.toThrow();
  });

  it('rejects MC with fewer than 2 options', () => {
    const data = {
      stem: { en: 'Q', vi: 'H' },
      options: [{ id: 'a', text: { en: 'A', vi: 'A' } }],
      answer: 'a',
    };
    expect(() => MCDataSchema.parse(data)).toThrow();
  });
});

describe('TrueFalseDataSchema', () => {
  it('parses valid true/false data with 4 items', () => {
    const data = {
      stem: { en: 'S', vi: 'S' },
      items: [
        { id: '1', text: { en: 'A', vi: 'A' }, correct: true },
        { id: '2', text: { en: 'B', vi: 'B' }, correct: false },
        { id: '3', text: { en: 'C', vi: 'C' }, correct: true },
        { id: '4', text: { en: 'D', vi: 'D' }, correct: false },
      ],
    };
    expect(() => TrueFalseDataSchema.parse(data)).not.toThrow();
  });
});

describe('ShortDataSchema', () => {
  it('parses valid short answer data', () => {
    const data = {
      stem: { en: 'Explain recursion', vi: 'Giải thích đệ quy' },
      answer_key: 'A function calling itself',
    };
    expect(() => ShortDataSchema.parse(data)).not.toThrow();
  });
});
```

- [ ] **Step 6: Implement `packages/types/src/question.ts`**

```typescript
import { z } from 'zod';

const BilingualText = z.object({ en: z.string(), vi: z.string() });

export const MCDataSchema = z.object({
  stem: BilingualText,
  options: z.array(z.object({
    id: z.string(),
    text: BilingualText,
  })).min(2),
  answer: z.string(),
  explanation: BilingualText.optional(),
});

export const TrueFalseDataSchema = z.object({
  stem: BilingualText,
  items: z.array(z.object({
    id: z.string(),
    text: BilingualText,
    correct: z.boolean(),
  })).min(1),
  explanation: BilingualText.optional(),
});

export const ShortDataSchema = z.object({
  stem: BilingualText,
  answer_key: z.string(),   // server-side only; never sent to client
  rubric: BilingualText.optional(),
});

export type MCData        = z.infer<typeof MCDataSchema>;
export type TrueFalseData = z.infer<typeof TrueFalseDataSchema>;
export type ShortData     = z.infer<typeof ShortDataSchema>;
```

- [ ] **Step 7: Implement `packages/types/src/subject.ts`**

```typescript
import { z } from 'zod';

export const SubjectStatusSchema = z.enum(['active', 'upcoming']);

export const SubjectSchema = z.object({
  id:           z.string().uuid(),
  slug:         z.string(),
  name_en:      z.string(),
  name_vi:      z.string(),
  accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon:         z.string(),
  status:       SubjectStatusSchema,
  sort_order:   z.number().int(),
});

export type Subject       = z.infer<typeof SubjectSchema>;
export type SubjectStatus = z.infer<typeof SubjectStatusSchema>;
```

- [ ] **Step 8: Update `packages/types/src/index.ts`**

```typescript
export * from './block';
export * from './question';
export * from './subject';
```

- [ ] **Step 9: Run all tests to verify they pass**

```bash
pnpm --filter @scipal/types test
```
Expected: all tests PASS.

- [ ] **Step 10: Commit**

```bash
git add packages/types/
git commit -m "feat(types): add Block, Question, Subject Zod schemas with tests"
```

---

## Task 5: Design Token System (`packages/ui`)

**Files:**
- Create: `packages/ui/src/tokens.ts`
- Create: `packages/ui/src/SubjectProvider.tsx`
- Create: `packages/ui/src/__tests__/tokens.test.ts`
- Create: `packages/ui/tailwind.config.ts` (shared Tailwind config)
- Create: `packages/ui/src/index.ts` (updated)

**Interfaces:**
- Consumes: `@scipal/types` → `Subject`
- Produces: `SubjectProvider` (React context), `useAccent()` hook, `SUBJECT_TOKENS` map, shared Tailwind config

- [ ] **Step 1: Add Vitest to `packages/ui`**

```bash
pnpm --filter @scipal/ui add -D vitest @vitejs/plugin-react react react-dom
```

- [ ] **Step 2: Write failing test for token isolation**

Create `packages/ui/src/__tests__/tokens.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { SUBJECT_TOKENS, getAccentColor } from '../tokens';

describe('SUBJECT_TOKENS', () => {
  it('has a token entry for every subject slug', () => {
    const slugs = ['informatics', 'math', 'physics', 'chemistry', 'biology'];
    for (const slug of slugs) {
      expect(SUBJECT_TOKENS[slug]).toBeDefined();
    }
  });

  it('all accent colors are valid hex', () => {
    const hexRe = /^#[0-9a-fA-F]{6}$/;
    for (const token of Object.values(SUBJECT_TOKENS)) {
      expect(token.accentColor).toMatch(hexRe);
    }
  });

  it('getAccentColor returns brand green for unknown slug', () => {
    expect(getAccentColor('unknown')).toBe('#16a34a');
  });

  it('getAccentColor returns subject accent for known slug', () => {
    expect(getAccentColor('math')).toBe('#2563eb');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm --filter @scipal/ui test
```
Expected: FAIL — `tokens` not found.

- [ ] **Step 4: Implement `packages/ui/src/tokens.ts`**

```typescript
export const SCIPAL_GREEN = '#16a34a'; // brand color — never changes

export interface SubjectToken {
  accentColor: string;
  icon:        string;
  nameEn:      string;
  nameVi:      string;
}

export const SUBJECT_TOKENS: Record<string, SubjectToken> = {
  informatics: { accentColor: '#16a34a', icon: '</>', nameEn: 'Informatics', nameVi: 'Tin học'  },
  math:        { accentColor: '#2563eb', icon: '∑',   nameEn: 'Mathematics', nameVi: 'Toán'     },
  physics:     { accentColor: '#7c3aed', icon: '⚛',   nameEn: 'Physics',     nameVi: 'Vật lí'   },
  chemistry:   { accentColor: '#0d9488', icon: '⚗',   nameEn: 'Chemistry',   nameVi: 'Hoá học'  },
  biology:     { accentColor: '#65a30d', icon: '❁',   nameEn: 'Biology',     nameVi: 'Sinh học' },
};

export function getAccentColor(slug: string): string {
  return SUBJECT_TOKENS[slug]?.accentColor ?? SCIPAL_GREEN;
}
```

- [ ] **Step 5: Implement `packages/ui/src/SubjectProvider.tsx`**

```tsx
'use client';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { getAccentColor, SUBJECT_TOKENS, type SubjectToken } from './tokens';

interface SubjectContextValue {
  slug:  string;
  token: SubjectToken | undefined;
}

const SubjectContext = createContext<SubjectContextValue>({
  slug:  '',
  token: undefined,
});

interface SubjectProviderProps {
  slug:     string;
  children: ReactNode;
}

/**
 * Wrap a subject-scoped section in this provider.
 * It sets --accent on the container element so all themed
 * children pick up the right color without touching :root.
 */
export function SubjectProvider({ slug, children }: SubjectProviderProps) {
  const accentColor = getAccentColor(slug);
  const token       = SUBJECT_TOKENS[slug];

  return (
    <SubjectContext.Provider value={{ slug, token }}>
      <div style={{ '--accent': accentColor } as React.CSSProperties}>
        {children}
      </div>
    </SubjectContext.Provider>
  );
}

export function useSubject(): SubjectContextValue {
  return useContext(SubjectContext);
}

export function useAccent(): string {
  const { slug } = useSubject();
  return getAccentColor(slug);
}
```

- [ ] **Step 6: Create shared Tailwind config `packages/ui/tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss';

/** Shared Tailwind config — extend in each app's tailwind.config.ts */
const config: Config = {
  content: [],  // overridden in each app
  theme: {
    extend: {
      colors: {
        'scipal-green': '#16a34a',
        accent: 'var(--accent)',   // reads CSS variable → theme-able per subject
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 7: Update `packages/ui/src/index.ts`**

```typescript
export * from './tokens';
export * from './SubjectProvider';
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
pnpm --filter @scipal/ui test
```
Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/ui/
git commit -m "feat(ui): add design token system, SubjectProvider, shared Tailwind config"
```

---

## Task 6: Language Hook (`packages/hooks`)

**Files:**
- Create: `packages/hooks/src/useLanguage.ts`
- Create: `packages/hooks/src/__tests__/useLanguage.test.ts`
- Create: `packages/hooks/src/index.ts`

**Interfaces:**
- Produces: `useLanguage()` hook → `{ lang: 'en'|'vi', setLang, t }` where `t({ en, vi })` returns the active string
- Consumes: `localStorage` for persistence

- [ ] **Step 1: Add Vitest + jsdom to `packages/hooks`**

```bash
pnpm --filter @scipal/hooks add -D vitest @vitejs/plugin-react @testing-library/react jsdom react react-dom
```

- [ ] **Step 2: Write failing test**

Create `packages/hooks/src/__tests__/useLanguage.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLanguage } from '../useLanguage';

describe('useLanguage', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to "vi"', () => {
    const { result } = renderHook(() => useLanguage());
    expect(result.current.lang).toBe('vi');
  });

  it('t() returns vi text by default', () => {
    const { result } = renderHook(() => useLanguage());
    expect(result.current.t({ en: 'Hello', vi: 'Xin chào' })).toBe('Xin chào');
  });

  it('switches to en and t() returns en text', () => {
    const { result } = renderHook(() => useLanguage());
    act(() => result.current.setLang('en'));
    expect(result.current.lang).toBe('en');
    expect(result.current.t({ en: 'Hello', vi: 'Xin chào' })).toBe('Hello');
  });

  it('persists language choice to localStorage', () => {
    const { result } = renderHook(() => useLanguage());
    act(() => result.current.setLang('en'));
    expect(localStorage.getItem('scipal-lang')).toBe('en');
  });

  it('reads persisted language on mount', () => {
    localStorage.setItem('scipal-lang', 'en');
    const { result } = renderHook(() => useLanguage());
    expect(result.current.lang).toBe('en');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm --filter @scipal/hooks test
```

- [ ] **Step 4: Implement `packages/hooks/src/useLanguage.ts`**

```typescript
'use client';
import { useState, useCallback } from 'react';

export type Lang = 'en' | 'vi';

const STORAGE_KEY = 'scipal-lang';
const DEFAULT_LANG: Lang = 'vi';

function readLang(): Lang {
  if (typeof localStorage === 'undefined') return DEFAULT_LANG;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'en' || stored === 'vi' ? stored : DEFAULT_LANG;
}

export interface UseLanguageResult {
  lang:    Lang;
  setLang: (l: Lang) => void;
  /** Return the string for the active language */
  t:       (strings: { en: string; vi: string }) => string;
}

export function useLanguage(): UseLanguageResult {
  const [lang, setLangState] = useState<Lang>(readLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, l);
    }
  }, []);

  const t = useCallback(
    (strings: { en: string; vi: string }) => strings[lang],
    [lang],
  );

  return { lang, setLang, t };
}
```

- [ ] **Step 5: Update `packages/hooks/src/index.ts`**

```typescript
export * from './useLanguage';
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
pnpm --filter @scipal/hooks test
```

- [ ] **Step 7: Commit**

```bash
git add packages/hooks/
git commit -m "feat(hooks): add useLanguage hook with persistence and bilingual t()"
```

---

## Task 7: Supabase Client Package + Generated Types (`packages/supabase`)

**Files:**
- Create: `packages/supabase/src/client.ts`
- Create: `packages/supabase/src/types.ts` (generated — see step)
- Create: `packages/supabase/src/index.ts`

**Interfaces:**
- Produces: `createBrowserClient()`, `createServerClient()`, `Database` type (generated from schema)
- Consumes: `@supabase/supabase-js`, `@supabase/ssr`

- [ ] **Step 1: Install Supabase JS packages**

```bash
pnpm --filter @scipal/supabase add @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Generate TypeScript types from schema**

```bash
pnpm supabase gen types typescript --project-id <YOUR_PROJECT_REF> \
  > packages/supabase/src/types.ts
```
This generates a `Database` interface that mirrors every table and column.

- [ ] **Step 3: Implement `packages/supabase/src/client.ts`**

```typescript
import { createBrowserClient as _createBrowserClient } from '@supabase/ssr';
import { createServerClient as _createServerClient } from '@supabase/ssr';
import type { Database } from './types';

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Use in React components (browser) */
export function createBrowserClient() {
  return _createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/** Use in Next.js Server Components / Route Handlers */
export function createServerClient(
  cookieStore: { get: (name: string) => { value: string } | undefined }
) {
  return _createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name) { return cookieStore.get(name)?.value; },
    },
  });
}

export type { Database };
```

- [ ] **Step 4: Update `packages/supabase/src/index.ts`**

```typescript
export * from './client';
export type { Database } from './types';
```

- [ ] **Step 5: Add dependency to package.json**

```bash
pnpm --filter @scipal/supabase add @scipal/types@workspace:*
```

- [ ] **Step 6: Commit**

```bash
git add packages/supabase/
git commit -m "feat(supabase): add typed Supabase client (browser + server)"
```

---

## Task 8: `apps/api` — Fastify Boilerplate + Auth Middleware

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/index.ts`
- Create: `apps/api/src/plugins/auth.ts`
- Create: `apps/api/src/plugins/supabase.ts`
- Create: `apps/api/src/providers/ai.ts`
- Create: `apps/api/src/__tests__/auth.test.ts`
- Create: `apps/api/Dockerfile`

**Interfaces:**
- Produces: Fastify server on `PORT` (default 3001); all routes require `Authorization: Bearer <jwt>`; `GET /health` is public
- Consumes: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AI_PROVIDER`, `CLAUDE_API_KEY`, `OPENAI_API_KEY`

- [ ] **Step 1: Create `apps/api/package.json`**

```json
{
  "name": "@scipal/api",
  "version": "0.1.0",
  "private": true,
  "main": "dist/index.js",
  "scripts": {
    "dev":       "tsx watch src/index.ts",
    "build":     "tsc",
    "start":     "node dist/index.js",
    "test":      "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "fastify":              "^4.27.0",
    "@fastify/cors":        "^9.0.0",
    "@fastify/env":         "^4.3.0",
    "@supabase/supabase-js": "^2.44.0",
    "@anthropic-ai/sdk":    "^0.24.0",
    "openai":               "^4.52.0",
    "dotenv":               "^16.4.0"
  },
  "devDependencies": {
    "tsx":     "^4.16.0",
    "vitest":  "^1.6.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: Create `apps/api/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write failing auth middleware test**

Create `apps/api/src/__tests__/auth.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { authPlugin } from '../plugins/auth';

describe('authPlugin', () => {
  const app = Fastify();

  beforeAll(async () => {
    await app.register(authPlugin);
    app.get('/protected', async () => ({ ok: true }));
    app.get('/health', async () => ({ status: 'ok' }));
    await app.ready();
  });

  afterAll(() => app.close());

  it('GET /health is accessible without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
  });

  it('returns 401 when Authorization header is missing on protected route', async () => {
    const res = await app.inject({ method: 'GET', url: '/protected' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for a malformed token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { Authorization: 'Bearer not-a-jwt' },
    });
    expect(res.statusCode).toBe(401);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

```bash
pnpm --filter @scipal/api test
```

- [ ] **Step 5: Implement `apps/api/src/plugins/auth.ts`**

```typescript
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { createClient } from '@supabase/supabase-js';

const PUBLIC_PATHS = new Set(['/health']);

export const authPlugin: FastifyPluginAsync = fp(async (app) => {
  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    if (PUBLIC_PATHS.has(req.routeOptions?.url ?? req.url)) return;

    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Missing authorization header' });
    }

    const token = header.slice(7);
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return reply.code(401).send({ error: 'Invalid token' });
    }

    (req as FastifyRequest & { user: typeof user }).user = user;
  });
});
```

- [ ] **Step 6: Implement `apps/api/src/index.ts`**

```typescript
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { authPlugin } from './plugins/auth';

const app = Fastify({ logger: true });

await app.register(cors, { origin: process.env.CORS_ORIGINS?.split(',') ?? '*' });
await app.register(authPlugin);

app.get('/health', async () => ({ status: 'ok' }));

const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: '0.0.0.0' });
console.log(`API running on port ${port}`);
```

- [ ] **Step 7: Implement `apps/api/src/providers/ai.ts`** (provider-agnostic interface)

```typescript
export interface ChatMessage {
  role:    'user' | 'assistant';
  content: string;
}

export interface AIProvider {
  chat(
    messages:     ChatMessage[],
    systemPrompt: string,
  ): AsyncIterable<string>;
}

// ── Claude provider ──────────────────────────────────────────────
import Anthropic from '@anthropic-ai/sdk';

export class ClaudeProvider implements AIProvider {
  private client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

  async *chat(messages: ChatMessage[], systemPrompt: string): AsyncIterable<string> {
    const stream = await this.client.messages.stream({
      model:      'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      system:     systemPrompt,
      messages:   messages.map(m => ({ role: m.role, content: m.content })),
    });
    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        yield chunk.delta.text;
      }
    }
  }
}

// ── OpenAI provider ──────────────────────────────────────────────
import OpenAI from 'openai';

export class OpenAIProvider implements AIProvider {
  private client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  async *chat(messages: ChatMessage[], systemPrompt: string): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model:  'gpt-4o-mini',
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role as 'user'|'assistant', content: m.content })),
      ],
    });
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) yield text;
    }
  }
}

// ── Factory ──────────────────────────────────────────────────────
export function createAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER ?? 'claude';
  if (provider === 'openai') return new OpenAIProvider();
  return new ClaudeProvider();
}
```

- [ ] **Step 8: Create `apps/api/Dockerfile`**

```dockerfile
FROM node:20-alpine AS base
RUN npm install -g pnpm@9

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ packages/
COPY apps/api/ apps/api/

RUN pnpm install --frozen-lockfile --filter @scipal/api...

WORKDIR /app/apps/api
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=base /app/apps/api/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/api/package.json .

EXPOSE 3001
CMD ["node", "dist/index.js"]
```

- [ ] **Step 9: Run auth tests**

```bash
pnpm --filter @scipal/api test
```
Expected: PASS (all 3 auth tests).

- [ ] **Step 10: Commit**

```bash
git add apps/api/
git commit -m "feat(api): Fastify boilerplate with auth middleware and AI provider abstraction"
```

---

## Task 9: `apps/web` — Next.js 15 App Shell

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/.env.local` (from template — not committed)

**Interfaces:**
- Produces: Next.js 15 app at `http://localhost:3000` with global Tailwind, Inter font, and `--accent` CSS var ready
- Consumes: `@scipal/ui`, `@scipal/supabase`, `@scipal/hooks`

- [ ] **Step 1: Scaffold Next.js app**

```bash
pnpm create next-app apps/web \
  --typescript --tailwind --app --no-src-dir --no-eslint --import-alias "@/*"
```

- [ ] **Step 2: Add workspace dependencies**

```bash
pnpm --filter @scipal/web add @scipal/ui@workspace:* @scipal/hooks@workspace:* @scipal/supabase@workspace:* @scipal/types@workspace:*
```

- [ ] **Step 3: Update `apps/web/tailwind.config.ts` to extend shared config**

```typescript
import type { Config } from 'tailwindcss';
import sharedConfig from '@scipal/ui/tailwind.config';

const config: Config = {
  ...sharedConfig,
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};

export default config;
```

- [ ] **Step 4: Update `apps/web/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --accent: #16a34a;   /* SciPal green — overridden by SubjectProvider */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

body {
  font-family: var(--font-sans);
  @apply bg-white text-gray-900 antialiased;
}
```

- [ ] **Step 5: Update `apps/web/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const mono  = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title:       'SciPal — Học khoa học song ngữ',
  description: 'Nền tảng học khoa học tự nhiên song ngữ EN/VI cho học sinh Việt Nam',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Create placeholder home page (replaced in S2 plan)**

Create `apps/web/app/page.tsx`:
```tsx
export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-2xl font-semibold text-scipal-green">
        SciPal — Foundation ✓
      </p>
    </main>
  );
}
```

- [ ] **Step 7: Run dev server and verify**

```bash
pnpm --filter @scipal/web dev
```
Open `http://localhost:3000` — expect to see "SciPal — Foundation ✓" in green.

- [ ] **Step 8: Run typecheck**

```bash
pnpm --filter @scipal/web typecheck
```
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add apps/web/
git commit -m "feat(web): Next.js 15 app shell with Tailwind, fonts, and design tokens"
```

---

## Task 10: `apps/mobile` — Expo App Shell

**Files:**
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/app.json`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/tailwind.config.ts`
- Create: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/index.tsx`

**Interfaces:**
- Produces: Expo 52 app with NativeWind v4, shared types, and `--accent` equivalent (JS token) ready
- Consumes: `@scipal/ui`, `@scipal/hooks`, `@scipal/types`

- [ ] **Step 1: Scaffold Expo app**

```bash
pnpm create expo-app apps/mobile --template blank-typescript
```

- [ ] **Step 2: Install NativeWind v4 and workspace deps**

```bash
pnpm --filter @scipal/mobile add nativewind@^4.0.0 react-native-reanimated
pnpm --filter @scipal/mobile add @scipal/ui@workspace:* @scipal/hooks@workspace:* @scipal/types@workspace:*
```

- [ ] **Step 3: Create `apps/mobile/tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss';
import sharedConfig from '@scipal/ui/tailwind.config';

const config: Config = {
  ...sharedConfig,
  content: [
    './app/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};

export default config;
```

- [ ] **Step 4: Create `apps/mobile/app/_layout.tsx`**

```tsx
import { Stack } from 'expo-router';
import '../global.css';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 5: Create `apps/mobile/app/index.tsx`**

```tsx
import { Text, View } from 'react-native';
import { getAccentColor } from '@scipal/ui';

export default function HomeScreen() {
  const accent = getAccentColor('informatics');
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text style={{ color: accent }} className="text-2xl font-semibold">
        SciPal Mobile — Foundation ✓
      </Text>
    </View>
  );
}
```

- [ ] **Step 6: Run Expo dev server and verify**

```bash
pnpm --filter @scipal/mobile start
```
Scan QR with Expo Go — expect "SciPal Mobile — Foundation ✓" in green.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): Expo 52 app shell with NativeWind v4 and design tokens"
```

---

## Task 11: Full Turbo Build + CI Config

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: root `package.json` (add `lint` script)

**Interfaces:**
- Produces: `pnpm turbo build` succeeds; GitHub Actions CI runs tests + typecheck on push

- [ ] **Step 1: Verify full build from root**

```bash
pnpm turbo build
```
Expected: all packages and apps build without errors.

- [ ] **Step 2: Run all tests**

```bash
pnpm turbo test
```
Expected: `@scipal/types` and `@scipal/hooks` tests pass; `@scipal/api` auth tests pass.

- [ ] **Step 3: Run typecheck across all workspaces**

```bash
pnpm turbo typecheck
```
Expected: zero TypeScript errors.

- [ ] **Step 4: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo typecheck
      - run: pnpm turbo test
      - run: pnpm turbo build
```

- [ ] **Step 5: Commit and push**

```bash
git add .github/
git commit -m "chore: add GitHub Actions CI (typecheck + test + build)"
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

- [ ] **Step 6: Verify CI passes on GitHub**

Expected: green checkmarks on all three steps.

---

## Task 12: Informatics Sample Lesson Seed

**Files:**
- Create: `supabase/seed/informatics_sample.sql`

**Interfaces:**
- Produces: One Informatics topic + one published lesson with all block types (theory, code, quiz, term-ref), so S3 and S4 plan implementors have real data to render

- [ ] **Step 1: Create `supabase/seed/informatics_sample.sql`**

```sql
-- Topic: Chủ đề F — Giải quyết vấn đề với sự trợ giúp của máy tính
WITH subj AS (SELECT id FROM subjects WHERE slug = 'informatics')
INSERT INTO topics (subject_id, slug, name_en, name_vi, sort_order)
SELECT id, 'topic-f-algorithms', 'Topic F — Algorithms', 'Chủ đề F — Thuật toán', 0
FROM subj
ON CONFLICT (subject_id, slug) DO NOTHING;

-- Term: Algorithm
WITH subj AS (SELECT id FROM subjects WHERE slug = 'informatics')
INSERT INTO terms (subject_id, term_en, term_vi, part_of_speech, definition_en, definition_vi)
SELECT id,
  'algorithm',
  'thuật toán',
  'noun',
  'A step-by-step procedure for solving a problem.',
  'Một tập hợp các bước có thứ tự để giải quyết một vấn đề.'
FROM subj
ON CONFLICT (subject_id, term_en) DO NOTHING;

-- Lesson: Binary Search
WITH topic AS (
  SELECT t.id AS topic_id, t.subject_id
  FROM topics t
  JOIN subjects s ON s.id = t.subject_id
  WHERE s.slug = 'informatics' AND t.slug = 'topic-f-algorithms'
),
term AS (
  SELECT id FROM terms WHERE term_en = 'algorithm'
)
INSERT INTO lessons (topic_id, subject_id, slug, title_en, title_vi, grade, published, blocks)
SELECT
  topic.topic_id,
  topic.subject_id,
  'binary-search',
  'Binary Search',
  'Tìm kiếm nhị phân',
  11,
  true,
  jsonb_build_array(
    jsonb_build_object(
      'type', 'theory',
      'content', jsonb_build_object(
        'en', 'Binary search is an efficient algorithm for finding a target value in a **sorted** array. It works by repeatedly halving the search interval.',
        'vi', 'Tìm kiếm nhị phân là thuật toán hiệu quả để tìm giá trị mục tiêu trong mảng **đã sắp xếp**. Thuật toán hoạt động bằng cách liên tục thu hẹp phạm vi tìm kiếm một nửa.'
      )
    ),
    jsonb_build_object(
      'type', 'term-ref',
      'term_id', (SELECT id::text FROM term)
    ),
    jsonb_build_object(
      'type', 'code',
      'tabs', jsonb_build_array(
        jsonb_build_object(
          'lang', 'python',
          'code', E'def binary_search(arr, target):\n    lo, hi = 0, len(arr) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1'
        ),
        jsonb_build_object(
          'lang', 'cpp',
          'code', E'int binarySearch(vector<int>& arr, int target) {\n    int lo = 0, hi = arr.size() - 1;\n    while (lo <= hi) {\n        int mid = lo + (hi - lo) / 2;\n        if (arr[mid] == target) return mid;\n        else if (arr[mid] < target) lo = mid + 1;\n        else hi = mid - 1;\n    }\n    return -1;\n}'
        )
      )
    ),
    jsonb_build_object(
      'type', 'interactive',
      'kind', 'algorithm-sim',
      'heading', jsonb_build_object('en', 'Try Binary Search', 'vi', 'Thử tìm kiếm nhị phân'),
      'offline', true,
      'config', jsonb_build_object(
        'algorithm', 'binary-search',
        'data', jsonb_build_array(4,8,15,16,23,42),
        'target', 23
      )
    )
  )
FROM topic
ON CONFLICT (subject_id, slug) DO NOTHING;
```

- [ ] **Step 2: Run seed in Supabase SQL Editor**

Copy and run the SQL above. Verify in Table Editor:
- `topics` table has 1 row for Informatics
- `lessons` table has 1 published row `binary-search`
- `terms` table has `algorithm`

- [ ] **Step 3: Commit**

```bash
git add supabase/seed/
git commit -m "seed: add Informatics sample topic, lesson (binary-search), and term"
```

---

## Verification Plan

### Automated Tests
```bash
pnpm turbo test        # all unit tests
pnpm turbo typecheck   # TypeScript strict mode
pnpm turbo build       # full build
```

### Manual Verification
1. `http://localhost:3000` shows "SciPal — Foundation ✓" in `#16a34a` green
2. Expo Go shows "SciPal Mobile — Foundation ✓" in the same green
3. Supabase Table Editor: all 14 tables present; `subjects` has 5 rows; `lessons` has 1 published row
4. `GET http://localhost:3001/health` → `{"status":"ok"}`
5. `GET http://localhost:3001/` without token → `401 {"error":"Missing authorization header"}`
6. `grep -r "SERVICE_ROLE" apps/web apps/mobile packages/` → zero results (key isolation check)
