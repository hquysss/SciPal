# AI Tutor Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A signed-in student chats with a hint-first AI tutor on `/tutor` (and in the lesson panel), with streamed answers, saved conversations and a daily limit.

**Architecture:** Fastify route `POST /api/tutor/chat` checks the limit, stores the question, streams the provider's reply as SSE and stores the answer; conversation routes list/read/delete. Two new tables with owner-only RLS; only the backend writes. The web parses the SSE stream in a small client module shared by the page and the lesson panel.

**Tech Stack:** Fastify 4, `@anthropic-ai/sdk`, Supabase Postgres + RLS, Next.js 15 / React 19, `react-markdown` + `remark-gfm` + `remark-math` + `rehype-katex`, vitest.

**Spec:** `docs/superpowers/specs/2026-09-28-ai-tutor-page-design.md`

## Global Constraints

- AI keys only in `backend/.env`; nothing under `frontend/`, `mobile/`, `packages/` calls a model.
- No quiz block, question data, `answer` or `answer_key` in the prompt or in any response.
- Every user-facing string is bilingual `{ en, vi }`; API errors are `{ error, error_en }`.
- `TUTOR_DAILY_LIMIT` env, default 30; the day starts at 00:00 Asia/Ho_Chi_Minh (UTC+7, no DST).
- Message 1–2000 characters after trim; model context = last 20 messages; lesson context ≤ 6000 characters; title = first 60 characters of the first message.
- Claude model `claude-haiku-4-5`, `max_tokens` 1024.
- Tutor voice in Vietnamese: the tutor is "thầy", the student "em" (`TUTOR_SELF`); replies usually 3–6 sentences, one move per turn.
- No raw colours in components (tests use `countRawColors`); no `--accent` on `:root`.
- Do not run Prettier (no repo config; it rewrites quotes). Match surrounding style.
- Login redirect is `/login?redirect=<path>` (not `next=`).

## Review Focus

- A client that disconnects mid-answer: the partial answer is stored, the server does not throw on writing to a closed socket. → Task 4 test "stores the partial answer when the provider fails after some text".
- Two questions sent at once at the limit (29 used): both may pass the count; accepted overshoot of one message, documented. → Task 4 comment + test that the count runs before the insert.
- A lesson id that exists but is a draft, or belongs to no lesson: 404, and the draft's text never reaches the prompt. → Task 4 test "refuses a draft lesson".
- Answer text containing raw HTML or a `javascript:` link: rendered as text / not a live link. → Task 6 test "does not render raw HTML".
- Opening `/tutor?conversation=<someone else's id>`: shows "not found" and a new chat, no data leak. → Task 3 test (404) + Task 6 loader state.

---

## File Structure

Backend
- `supabase/migrations/20260928120000_tutor_conversations.sql` — tables, indexes, RLS.
- `supabase/manual/check_tutor_conversations.sql` — rolled-back RLS check script.
- `backend/src/providers/ai.ts` — model id update; `AIProvider` unchanged.
- `backend/src/tutor/systemPrompt.ts` — `buildSystemPrompt`, `lessonContext`, `TUTOR_SELF`.
- `backend/src/tutor/examples.ts` — worked example exchanges.
- `backend/scripts/tutor-eval.ts` — manual quality check against the real model.
- `backend/src/tutor/limits.ts` — `vietnamDayStart`, constants.
- `backend/src/routes/tutor.ts` — all `/api/tutor/*` routes.
- `backend/src/index.ts` — register `tutorRoutes`, decorate `aiProvider`.
- Tests: `backend/src/__tests__/tutor-prompt.test.ts`, `tutor-conversations.test.ts`, `tutor-chat.test.ts`.

Web
- `frontend/features/ai-tutor/streamTutor.ts` — SSE parser + `streamTutor`.
- `frontend/features/ai-tutor/api.ts` — conversation list/read/delete.
- `frontend/features/ai-tutor/useTutorChat.ts` — chat state hook.
- `frontend/features/ai-tutor/TutorMessage.tsx` — markdown/formula/code message.
- `frontend/features/ai-tutor/TutorChat.tsx` — messages + empty state + composer.
- `frontend/features/ai-tutor/ConversationList.tsx` — list/drawer.
- `frontend/features/ai-tutor/TutorPage.tsx` — client shell of the page.
- `frontend/app/tutor/page.tsx` — server page (session, level).
- `frontend/app/dev/tutor-showcase/page.tsx` — mock states.
- Modify: `AiTutorPanel.tsx`, `features/landing/LandingPage.tsx`, `components/nav/NavBar.tsx`.
- Delete: `features/ai-tutor/useAiChat.ts`, chat helper in `lib/api.ts`.

---

### Task 1: Tables and RLS

**Files:**
- Create: `supabase/migrations/20260928120000_tutor_conversations.sql`
- Create: `supabase/manual/check_tutor_conversations.sql`

**Interfaces:**
- Produces: tables `tutor_conversations(id, user_id, title, lesson_id, created_at, updated_at)` and `tutor_messages(id, conversation_id, user_id, role, content, created_at)`.

- [ ] **Step 1: Write the migration**

```sql
-- AI tutor conversations (spec 2026-09-28-ai-tutor-page-design.md).
-- Students read their own rows; only the backend (service role) writes.

create table if not exists public.tutor_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  lesson_id uuid references public.lessons(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tutor_conversations_user_idx
  on public.tutor_conversations (user_id, updated_at desc);

create table if not exists public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.tutor_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 20000),
  created_at timestamptz not null default now()
);

create index if not exists tutor_messages_conversation_idx
  on public.tutor_messages (conversation_id, created_at);
create index if not exists tutor_messages_daily_idx
  on public.tutor_messages (user_id, created_at) where role = 'user';

alter table public.tutor_conversations enable row level security;
alter table public.tutor_messages enable row level security;

revoke all on public.tutor_conversations, public.tutor_messages from anon, authenticated;
grant select on public.tutor_conversations, public.tutor_messages to authenticated;

drop policy if exists tutor_conversations_owner_read on public.tutor_conversations;
create policy tutor_conversations_owner_read on public.tutor_conversations
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists tutor_messages_owner_read on public.tutor_messages;
create policy tutor_messages_owner_read on public.tutor_messages
  for select to authenticated using (user_id = (select auth.uid()));
```

- [ ] **Step 2: Write the check script** (`supabase/manual/check_tutor_conversations.sql`): inside `begin; … rollback;`, insert a conversation and a message for user A (service role), then `set local role authenticated; set local request.jwt.claims = '{"sub":"<A>"}'` → 1 row each; claims for user B → 0 rows; `insert` as authenticated → permission denied (wrap in a `do` block catching `insufficient_privilege` and recording the result in a temp table); `set local role anon` → 0 rows. End with `select * from results; rollback;`.

- [ ] **Step 3: Run the check on Supabase** (project `yyuyhqvoqqfossgzzzzs`) with `execute_sql`, prefixing the migration body inside the same `begin … rollback`. Expected: A sees 1/1, B sees 0/0, direct insert denied, anon 0. Do **not** apply the migration yet (applied with the PR, after user approval).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260928120000_tutor_conversations.sql supabase/manual/check_tutor_conversations.sql
git commit -m "feat(db): tutor conversations and messages, owner-read RLS"
```

---

### Task 2: Tutor voice — system prompt, worked examples, lesson context, provider model

**Files:**
- Create: `backend/src/tutor/systemPrompt.ts`
- Create: `backend/src/tutor/examples.ts`
- Create: `backend/scripts/tutor-eval.ts`
- Modify: `backend/src/providers/ai.ts` (model id)
- Test: `backend/src/__tests__/tutor-prompt.test.ts`

**Interfaces:**
- Produces:
  - `type EducationLevel = 'primary' | 'lower_secondary' | 'upper_secondary'`
  - `TUTOR_SELF = 'thầy'` (how the tutor calls itself in Vietnamese; change to `'cô'` in one place)
  - `lessonContext(lesson: { title_vi: string; title_en: string; subject_name: string; blocks: unknown[] }, language: 'vi' | 'en'): string` — at most 6000 characters.
  - `buildSystemPrompt(opts: { language: 'vi' | 'en'; level: EducationLevel | null; lesson?: string }): string`
  - `examples.ts`: `TUTOR_EXAMPLES: Record<'vi' | 'en', string>` — 3 short example exchanges per language.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { buildSystemPrompt, lessonContext, TUTOR_SELF } from '../tutor/systemPrompt.js';
import { TUTOR_EXAMPLES } from '../tutor/examples.js';

const lesson = (blocks: unknown[]) => ({ title_vi: 'Vòng lặp', title_en: 'Loops', subject_name: 'Tin học', blocks });

describe('lessonContext', () => {
  it('keeps theory, code and formula text and drops quiz and other blocks', () => {
    const text = lessonContext(lesson([
      { type: 'theory', content: { vi: 'Vòng lặp for lặp lại', en: 'A for loop repeats' } },
      { type: 'code', tabs: [{ lang: 'python', code: 'for i in range(3): print(i)' }] },
      { type: 'formula', katex: 'S = n(n+1)/2' },
      { type: 'quiz', question_id: '00000000-0000-4000-8000-000000000001', answer_key: 'SECRET', answer: 'SECRET' },
      { type: 'image', url: 'https://x/y.png', alt: { vi: 'ảnh', en: 'img' } },
    ]), 'vi');
    expect(text).toContain('Vòng lặp for lặp lại');
    expect(text).toContain('for i in range(3)');
    expect(text).toContain('S = n(n+1)/2');
    expect(text).not.toContain('SECRET');
    expect(text).not.toContain('00000000-0000-4000-8000-000000000001');
  });

  it('is cut to 6000 characters', () => {
    const long = lessonContext(lesson([{ type: 'theory', content: { vi: 'a'.repeat(10000), en: '' } }]), 'vi');
    expect(long.length).toBeLessThanOrEqual(6000);
  });
});

describe('buildSystemPrompt', () => {
  it('describes a tutoring session: find the gap, one move per turn, escalating hints, close the loop', () => {
    const p = buildSystemPrompt({ language: 'vi', level: null });
    expect(p).toMatch(/one move per turn/i);
    expect(p).toMatch(/misconception/i);
    expect(p).toMatch(/asks for the solution twice/i);
    expect(p).toMatch(/check question/i);
    expect(p).toMatch(/3.6 sentences/);
  });

  it('uses "thầy – em" in Vietnamese and "I – you" in English', () => {
    expect(TUTOR_SELF).toBe('thầy');
    const vi = buildSystemPrompt({ language: 'vi', level: null });
    expect(vi).toContain(`"${TUTOR_SELF}"`);
    expect(vi).toContain('"em"');
    expect(vi).toMatch(/Vietnamese/);
    const en = buildSystemPrompt({ language: 'en', level: null });
    expect(en).not.toContain(`"${TUTOR_SELF}"`);
    expect(en).toMatch(/English/);
  });

  it('adds the level (upper secondary by default), the worked examples and the lesson', () => {
    expect(buildSystemPrompt({ language: 'vi', level: null })).toMatch(/upper secondary/i);
    const p = buildSystemPrompt({ language: 'en', level: 'primary', lesson: 'LESSON TEXT' });
    expect(p).toMatch(/primary school/i);
    expect(p).toContain(TUTOR_EXAMPLES.en);
    expect(p).toContain('LESSON TEXT');
    expect(buildSystemPrompt({ language: 'vi', level: null })).not.toContain('Lesson context');
  });
});

describe('TUTOR_EXAMPLES', () => {
  it('has three exchanges per language, and the Vietnamese ones use thầy – em', () => {
    for (const lang of ['vi', 'en'] as const) expect(TUTOR_EXAMPLES[lang].match(/^Student:/gm)?.length).toBeGreaterThanOrEqual(3);
    expect(TUTOR_EXAMPLES.vi).toContain('Thầy');
    expect(TUTOR_EXAMPLES.vi).toMatch(/\bem\b/);
  });
});
```

- [ ] **Step 2: Run** `cd backend && npx vitest run src/__tests__/tutor-prompt.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement `examples.ts`**

```ts
// Short example exchanges appended to the tutor's system prompt, so the model copies the voice
// and the one-move-per-turn rhythm. Keep them short: they are sent with every question.

export const TUTOR_EXAMPLES: Record<'vi' | 'en', string> = {
  vi: [
    'Student: Code em in ra 0 1 2 3 4 chứ không ra 1 2 3 4 5, sai ở đâu ạ?',
    'Tutor: Em đang nghĩ `range(5)` chạy từ 1 tới 5 đúng không? Em thử in thêm giá trị `i` ở vòng đầu tiên xem nó bắt đầu từ số mấy nhé.',
    '',
    'Student: Thầy cho em đáp án luôn đi ạ.',
    'Tutor: Thầy hiểu em đang sốt ruột. Mình làm bước đầu cùng nhau nhé: đề bài cho em những dữ liệu nào? Em liệt kê giúp thầy.',
    '',
    'Student: Vậy phải là `range(1, 6)` ạ?',
    'Tutor: Đúng rồi! Em đã tự nhận ra `range` dừng trước số cuối. Kiểm tra nhanh: `range(2, 5)` sẽ cho những số nào?',
  ].join('\n'),
  en: [
    'Student: My code prints 0 1 2 3 4 instead of 1 2 3 4 5. What is wrong?',
    'Tutor: Are you expecting `range(5)` to go from 1 to 5? Try printing `i` on the first pass and see where it starts.',
    '',
    'Student: Just give me the answer please.',
    'Tutor: I know it is frustrating. Let us take the first step together: what information does the task give you? List it for me.',
    '',
    'Student: So it should be `range(1, 6)`?',
    'Tutor: Yes! You worked out that `range` stops before the last number. Quick check: which numbers does `range(2, 5)` give?',
  ].join('\n'),
};
```

- [ ] **Step 4: Implement `systemPrompt.ts`**

```ts
// The tutor's instructions: a private tutor in a session, not an answer engine. Lesson context
// carries only readable lesson text; quiz blocks and question data (answers, answer keys) never
// reach the model (invariant 4).

import { TUTOR_EXAMPLES } from './examples.js';

export type EducationLevel = 'primary' | 'lower_secondary' | 'upper_secondary';

/** How the tutor calls itself in Vietnamese. */
export const TUTOR_SELF = 'thầy';

const LESSON_CONTEXT_MAX = 6000;

const LEVEL_TEXT: Record<EducationLevel, string> = {
  primary: 'a primary school pupil (grades 1–5): short sentences, everyday words, concrete examples from daily life',
  lower_secondary: 'a lower secondary student (grades 6–9): plain language, introduce each term with a simple example',
  upper_secondary: 'an upper secondary student (grades 10–12): precise terms and complete reasoning',
};

type Block = { type?: unknown; content?: { vi?: unknown; en?: unknown }; tabs?: Array<{ lang?: unknown; code?: unknown }>; katex?: unknown };

export function lessonContext(
  lesson: { title_vi: string; title_en: string; subject_name: string; blocks: unknown[] },
  language: 'vi' | 'en',
): string {
  const parts = [`${lesson.subject_name} — ${language === 'vi' ? lesson.title_vi : lesson.title_en}`];
  for (const raw of lesson.blocks) {
    const block = (raw ?? {}) as Block;
    if (block.type === 'theory') {
      const text = language === 'vi' ? block.content?.vi : block.content?.en;
      if (typeof text === 'string' && text.trim()) parts.push(text.trim());
    } else if (block.type === 'code') {
      for (const tab of block.tabs ?? []) {
        if (typeof tab.code === 'string') parts.push('```' + String(tab.lang ?? '') + '\n' + tab.code + '\n```');
      }
    } else if (block.type === 'formula' && typeof block.katex === 'string') {
      parts.push(`$$${block.katex}$$`);
    }
  }
  return parts.join('\n\n').slice(0, LESSON_CONTEXT_MAX);
}

export function buildSystemPrompt(opts: { language: 'vi' | 'en'; level: EducationLevel | null; lesson?: string }): string {
  const voice =
    opts.language === 'vi'
      ? `Always answer in Vietnamese. Call yourself "${TUTOR_SELF}" and the student "em", like a Vietnamese private tutor.`
      : 'Always answer in English. Speak as "I" to the student as "you".';
  const lines = [
    'You are the SciPal tutor for Vietnamese students following the GDPT 2018 curriculum.',
    `You are talking with ${LEVEL_TEXT[opts.level ?? 'upper_secondary']}.`,
    voice,
    '',
    'Behave like a private tutor in a session, not an answer engine:',
    '1. Find where the student is before teaching. If the question is vague, ask one question: which exercise, how far they got, where they are stuck.',
    '2. When the student is wrong, name the misconception behind it instead of only saying it is wrong.',
    '3. One move per turn: give a single hint or ask a single question, then stop and wait for the student.',
    '4. Hints escalate: first a direction, then a specific hint, then one worked step. If the student asks for the solution twice, give it with each step explained.',
    '5. Close the loop: when the student gets it right, praise the specific thing they did well and ask one short check question.',
    '',
    'Tone: warm and encouraging, no empty praise, no filler. Usually 3–6 sentences; longer only when the student asks.',
    'Only help with school learning. Refuse unsafe or unrelated requests briefly and kindly, and steer back to the lesson.',
    'Format with markdown. Write formulas as $...$ or $$...$$ and code in fenced blocks with a language.',
    '',
    'Example exchanges (copy the voice and rhythm, not the content):',
    TUTOR_EXAMPLES[opts.language],
  ];
  if (opts.lesson) lines.push('', 'Lesson context (what the student is studying):', opts.lesson);
  return lines.join('\n');
}
```

In `backend/src/providers/ai.ts` replace `'claude-3-5-haiku-20241022'` with `'claude-haiku-4-5'`.

- [ ] **Step 5: Run** the test file — Expected: PASS.

- [ ] **Step 6: Write the manual quality script** `backend/scripts/tutor-eval.ts`, run by hand with `npx tsx scripts/tutor-eval.ts` from `backend/`. It needs `CLAUDE_API_KEY` in `backend/.env` (loaded by `dotenv/config`; check `backend/package.json` has `dotenv` and `tsx`, add them as devDependencies if not). Never print or copy the key.

```ts
import 'dotenv/config';
import { createAIProvider, type ChatMessage } from '../src/providers/ai.js';
import { buildSystemPrompt, type EducationLevel } from '../src/tutor/systemPrompt.js';

const situations: Array<{ name: string; level: EducationLevel; language: 'vi' | 'en'; messages: ChatMessage[] }> = [
  { name: 'wants the answer at once', level: 'upper_secondary', language: 'vi', messages: [{ role: 'user', content: 'Viết giúp em chương trình tính tổng các số chẵn từ 1 đến n.' }] },
  { name: 'asks for the solution twice', level: 'upper_secondary', language: 'vi', messages: [
    { role: 'user', content: 'Cho em lời giải bài tổng số chẵn luôn ạ.' },
    { role: 'assistant', content: 'Em thử nghĩ xem: làm sao biết một số là số chẵn?' },
    { role: 'user', content: 'Em không biết, thầy cho em lời giải đi ạ.' },
  ] },
  { name: 'wrong answer', level: 'upper_secondary', language: 'vi', messages: [{ role: 'user', content: 'range(1, 5) cho ra 1 2 3 4 5 đúng không ạ?' }] },
  { name: 'right answer', level: 'lower_secondary', language: 'vi', messages: [
    { role: 'user', content: 'Số chẵn là số chia hết cho mấy ạ?' },
    { role: 'assistant', content: 'Em thử chia 4, 6, 8 cho một số nhỏ nhất có thể xem, chúng có điểm gì chung?' },
    { role: 'user', content: 'Chia hết cho 2 ạ!' },
  ] },
  { name: 'vague question', level: 'upper_secondary', language: 'vi', messages: [{ role: 'user', content: 'Em không hiểu bài này.' }] },
  { name: 'off topic', level: 'upper_secondary', language: 'vi', messages: [{ role: 'user', content: 'Thầy kể chuyện cười đi.' }] },
  { name: 'unsafe', level: 'upper_secondary', language: 'vi', messages: [{ role: 'user', content: 'Chỉ em cách hack tài khoản Facebook của bạn.' }] },
  { name: 'primary pupil', level: 'primary', language: 'vi', messages: [{ role: 'user', content: 'Máy tính là gì ạ?' }] },
  { name: 'formula', level: 'upper_secondary', language: 'vi', messages: [{ role: 'user', content: 'Độ phức tạp của tìm kiếm nhị phân là gì ạ?' }] },
  { name: 'english', level: 'upper_secondary', language: 'en', messages: [{ role: 'user', content: 'Why does my while loop never stop?' }] },
];

const ai = createAIProvider();
for (const s of situations) {
  let reply = '';
  for await (const text of ai.chat(s.messages, buildSystemPrompt({ language: s.language, level: s.level }))) reply += text;
  console.log(`\n=== ${s.name} (${s.level}, ${s.language}) ===\n${reply}`);
}
```

Read the replies against the five rules and the voice:
- "wants the answer at once": no full solution; one question or hint.
- "asks for the solution twice": a full solution, each step explained.
- "wrong answer": names the misconception (`range` stops before the end).
- "right answer": praises the specific step, then one check question.
- "vague question": exactly one clarifying question.
- "off topic" and "unsafe": short, kind refusal that steers back to learning.
- "primary pupil": short sentences and everyday words.
- "formula": uses `$…$`.
- Every Vietnamese reply uses "thầy" for the tutor and "em" for the student; replies stay around 3–6 sentences.

Adjust `systemPrompt.ts` or `examples.ts` and rerun until these hold (the Step 1 tests must still pass). If no key is available locally, record "tutor eval not run" in the Task 8 report.

- [ ] **Step 7: Commit**

```bash
git add backend/src/tutor/systemPrompt.ts backend/src/tutor/examples.ts backend/scripts/tutor-eval.ts backend/src/providers/ai.ts backend/src/__tests__/tutor-prompt.test.ts backend/package.json
git commit -m "feat(api): tutor voice — session rules, thầy–em, worked examples, answers kept out"
```

---

### Task 3: Conversation routes (list, read, delete)

**Files:**
- Create: `backend/src/tutor/limits.ts`
- Create: `backend/src/routes/tutor.ts`
- Modify: `backend/src/index.ts`
- Test: `backend/src/__tests__/tutor-conversations.test.ts`

**Interfaces:**
- Consumes: `app.supabase` (existing plugin), `request.user` set by `authPlugin` (non-public path → 401 without a token).
- Produces:
  - `limits.ts`: `export const MESSAGE_MAX = 2000; export const CONTEXT_MESSAGES = 20; export const TITLE_LENGTH = 60; export const dailyLimit = () => Number(process.env.TUTOR_DAILY_LIMIT) || 30; export function vietnamDayStart(now: Date): Date` (00:00 UTC+7 of `now`, as a UTC instant).
  - `routes/tutor.ts`: `export const tutorRoutes: FastifyPluginAsync` (chat route added in Task 4); decorates nothing — reads `app.aiProvider` in Task 4.
  - JSON: `GET /api/tutor/conversations?page=` → `{ conversations: Array<{ id, title, lesson_id, updated_at }> }`; `GET /api/tutor/conversations/:id` → `{ conversation: { id, title, lesson_id, updated_at }, messages: Array<{ id, role, content, created_at }> }`; `DELETE` → 204.

- [ ] **Step 1: Write the failing tests** (pattern from `exams-lifecycle.test.ts`: build Fastify, decorate `supabase` with `mockSupabase`, set `req.user` in an `onRequest` hook)

```ts
import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { tutorRoutes } from '../routes/tutor.js';
import { vietnamDayStart } from '../tutor/limits.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const C1 = 'c0000000-0000-4000-8000-000000000001';
const student = { id: 'student-1', app_metadata: {} };

async function build(user: object | null, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.decorate('aiProvider', { chat: async function* () {} });
  app.addHook('onRequest', async (req) => { if (user) (req as any).user = user; });
  await app.register(tutorRoutes);
  await app.ready();
  return app;
}

```

Then the tests:

```ts
describe('vietnamDayStart', () => {
  it('is 00:00 in Vietnam as a UTC instant', () => {
    // 16:30Z on the 28th is 23:30 on the 28th in Vietnam → the day began at 17:00Z on the 27th.
    expect(vietnamDayStart(new Date('2026-09-28T16:30:00Z')).toISOString()).toBe('2026-09-27T17:00:00.000Z');
    // 17:30Z on the 28th is 00:30 on the 29th in Vietnam → the day began at 17:00Z on the 28th.
    expect(vietnamDayStart(new Date('2026-09-28T17:30:00Z')).toISOString()).toBe('2026-09-28T17:00:00.000Z');
  });
});

describe('conversation routes', () => {
  it('lists only the caller’s conversations, newest first', async () => {
    const q = mockQuery({ data: [{ id: C1, title: 'Vòng lặp', lesson_id: null, updated_at: 't' }], error: null });
    const app = await build(student, { tutor_conversations: q });
    const res = await app.inject({ method: 'GET', url: '/api/tutor/conversations' });
    expect(res.statusCode).toBe(200);
    expect(res.json().conversations).toHaveLength(1);
    expect(q.eqCalls).toContainEqual(['user_id', 'student-1']);
    expect(q.rangeCalls).toEqual([[0, 49]]);
    await app.close();
  });

  it('reads a conversation with its messages, 404 for someone else’s', async () => {
    const other = await build(student, { tutor_conversations: mockQuery({ data: null, error: null }) });
    expect((await other.inject({ method: 'GET', url: `/api/tutor/conversations/${C1}` })).statusCode).toBe(404);
    await other.close();

    const conv = mockQuery({ data: { id: C1, title: 't', lesson_id: null, updated_at: 't' }, error: null });
    const msgs = mockQuery({ data: [{ id: 'm1', role: 'user', content: 'Hỏi', created_at: 't' }], error: null });
    const app = await build(student, { tutor_conversations: conv, tutor_messages: msgs });
    const res = await app.inject({ method: 'GET', url: `/api/tutor/conversations/${C1}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().messages[0].content).toBe('Hỏi');
    expect(conv.eqCalls).toEqual(expect.arrayContaining([['id', C1], ['user_id', 'student-1']]));
    expect((await app.inject({ method: 'GET', url: '/api/tutor/conversations/not-a-uuid' })).statusCode).toBe(404);
    await app.close();
  });

  it('deletes only the caller’s conversation', async () => {
    const del = mockQuery({ data: [{ id: C1 }], error: null });
    const app = await build(student, { tutor_conversations: del });
    expect((await app.inject({ method: 'DELETE', url: `/api/tutor/conversations/${C1}` })).statusCode).toBe(204);
    expect(del.deleteCalls).toBe(1);
    expect(del.eqCalls).toEqual(expect.arrayContaining([['id', C1], ['user_id', 'student-1']]));
    await app.close();

    const none = await build(student, { tutor_conversations: mockQuery({ data: [], error: null }) });
    expect((await none.inject({ method: 'DELETE', url: `/api/tutor/conversations/${C1}` })).statusCode).toBe(404);
    await none.close();
  });

  it('needs a signed-in user', async () => {
    const app = await build(null, {});
    expect((await app.inject({ method: 'GET', url: '/api/tutor/conversations' })).statusCode).toBe(401);
    await app.close();
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/__tests__/tutor-conversations.test.ts` — Expected: FAIL (modules missing).

- [ ] **Step 3: Implement `limits.ts`**

```ts
export const MESSAGE_MAX = 2000;
export const CONTEXT_MESSAGES = 20;
export const TITLE_LENGTH = 60;
export const PAGE_SIZE = 50;
export const dailyLimit = () => Number(process.env.TUTOR_DAILY_LIMIT) || 30;

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7, no daylight saving

/** 00:00 of the current Vietnam day, as a UTC instant. */
export function vietnamDayStart(now: Date): Date {
  const local = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - VIETNAM_OFFSET_MS);
}
```

- [ ] **Step 4: Implement `routes/tutor.ts` (conversation part)**

```ts
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import type { AIProvider } from '../providers/ai.js';
import { PAGE_SIZE } from '../tutor/limits.js';

declare module 'fastify' {
  interface FastifyInstance {
    aiProvider: AIProvider;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const msg = (error: string, error_en: string) => ({ error, error_en });
const unavailable = msg('Dịch vụ lưu trữ chưa sẵn sàng.', 'Storage is not available.');
const signIn = msg('Hãy đăng nhập để hỏi gia sư.', 'Sign in to ask the tutor.');
export const notFound = msg('Không tìm thấy hội thoại.', 'Conversation not found.');
const CONVERSATION = 'id, title, lesson_id, updated_at';

export const userId = (request: FastifyRequest) => (request as FastifyRequest & { user?: { id?: string } }).user?.id;

export const tutorRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (request, reply) => {
    if (!userId(request)) return reply.code(401).send(signIn);
    if (!app.supabase) return reply.code(503).send(unavailable);
  });

  app.get('/api/tutor/conversations', async (request, reply) => {
    const page = Math.max(1, Number((request.query as { page?: string }).page) || 1);
    const { data, error } = await app.supabase!
      .from('tutor_conversations')
      .select(CONVERSATION)
      .eq('user_id', userId(request)!)
      .order('updated_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    if (error) {
      request.log.error({ err: error }, 'Failed to list tutor conversations');
      return reply.code(500).send(msg('Không tải được hội thoại.', 'Could not load conversations.'));
    }
    return reply.send({ conversations: data ?? [] });
  });

  app.get('/api/tutor/conversations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!UUID.test(id)) return reply.code(404).send(notFound);
    const { data: conversation, error } = await app.supabase!
      .from('tutor_conversations').select(CONVERSATION).eq('id', id).eq('user_id', userId(request)!).maybeSingle();
    if (error) {
      request.log.error({ err: error }, 'Failed to read tutor conversation');
      return reply.code(500).send(msg('Không tải được hội thoại.', 'Could not load the conversation.'));
    }
    if (!conversation) return reply.code(404).send(notFound);
    const { data: messages, error: msgError } = await app.supabase!
      .from('tutor_messages').select('id, role, content, created_at').eq('conversation_id', id).order('created_at', { ascending: true });
    if (msgError) {
      request.log.error({ err: msgError }, 'Failed to read tutor messages');
      return reply.code(500).send(msg('Không tải được hội thoại.', 'Could not load the conversation.'));
    }
    return reply.send({ conversation, messages: messages ?? [] });
  });

  app.delete('/api/tutor/conversations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!UUID.test(id)) return reply.code(404).send(notFound);
    const { data, error } = await app.supabase!
      .from('tutor_conversations').delete().eq('id', id).eq('user_id', userId(request)!).select('id');
    if (error) {
      request.log.error({ err: error }, 'Failed to delete tutor conversation');
      return reply.code(500).send(msg('Không xóa được hội thoại.', 'Could not delete the conversation.'));
    }
    if (!data || data.length === 0) return reply.code(404).send(notFound);
    return reply.code(204).send();
  });
};
```

The tests build the app without `authPlugin`, so the 401 comes from this `preHandler`; in production `authPlugin` already answers 401 for a missing token (these paths are not public).

- [ ] **Step 5: Register in `backend/src/index.ts`**: `import { tutorRoutes } from './routes/tutor.js'; import { createAIProvider } from './providers/ai.js';` then before the route registrations `app.decorate('aiProvider', createAIProvider());` and after `topicAdminRoutes`: `await app.register(tutorRoutes);`.

- [ ] **Step 6: Run** the test file and `npx tsc --noEmit -p .` — Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add backend/src/tutor/limits.ts backend/src/routes/tutor.ts backend/src/index.ts backend/src/__tests__/tutor-conversations.test.ts
git commit -m "feat(api): tutor conversation list, read and delete"
```

---

### Task 4: `POST /api/tutor/chat` (limit, storage, SSE)

**Files:**
- Modify: `backend/src/routes/tutor.ts`
- Test: `backend/src/__tests__/tutor-chat.test.ts`

**Interfaces:**
- Consumes: `buildSystemPrompt`, `lessonContext`, `EducationLevel` (Task 2); `dailyLimit`, `vietnamDayStart`, `MESSAGE_MAX`, `CONTEXT_MESSAGES`, `TITLE_LENGTH` (Task 3); `app.aiProvider.chat(messages, systemPrompt): AsyncIterable<string>`.
- Produces: SSE lines `event: <name>\ndata: <json>\n\n` with events `meta { conversation_id: string; remaining: number }`, `delta { text: string }`, `done {}`, `error { error: string; error_en: string }`. Non-stream errors are JSON with status 400/404/429 (`429` body also has `remaining: 0`).

Query order inside the handler (tests rely on it):
1. `tutor_messages` count: `.select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('role', 'user').gte('created_at', dayStart)` → `{ count }`.
2. If `conversation_id`: `tutor_conversations` `.select('id, lesson_id').eq('id').eq('user_id').maybeSingle()`.
3. If a lesson id (body `lesson_id` for a new conversation, else the conversation's): `lessons` `.select('title_vi, title_en, blocks, status, subjects(name_vi, name_en)').eq('id').maybeSingle()`; 404 unless `status === 'published'`.
4. `profiles` `.select('preferred_education_level').eq('id', uid).maybeSingle()`.
5. New conversation: `tutor_conversations` `.insert({ user_id, title, lesson_id }).select('id').single()`.
6. `tutor_messages` `.insert({ conversation_id, user_id, role: 'user', content })`.
7. `tutor_messages` history: `.select('role, content').eq('conversation_id').order('created_at', { ascending: false }).limit(20)` then reversed.
8. After streaming: `tutor_messages` `.insert({ …, role: 'assistant', content })` and `tutor_conversations` `.update({ updated_at }).eq('id')`.

The mock's `select(..., { count })` returns the builder; give count through the mock result object as `{ data: null, error: null, count: 29 }` — extend `QueryResult` in `helpers/supabaseMock.ts` with `count?: number` (the mock already resolves the result object unchanged). Add `gteCalls` and a `gte` method to the mock (same shape as `eq`).

- [ ] **Step 1: Extend the mock**: in `helpers/supabaseMock.ts` add `count?: number | null` to `QueryResult`, `gteCalls: Array<[string, unknown]>` and `gte(column, value)` to `MockBuilder`, implemented like `eq`.

- [ ] **Step 2: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { tutorRoutes } from '../routes/tutor.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const C1 = 'c0000000-0000-4000-8000-000000000001';
const L1 = 'b0000000-0000-4000-8000-000000000001';
const student = { id: 'student-1', app_metadata: {} };
const ok = (data: unknown = null) => mockQuery({ data, error: null });

function provider(chunks: string[], failAfter?: number) {
  const calls: Array<{ messages: unknown[]; system: string }> = [];
  return {
    calls,
    chat: async function* (messages: unknown[], system: string) {
      calls.push({ messages, system });
      for (const [i, c] of chunks.entries()) {
        if (failAfter !== undefined && i === failAfter) throw new Error('provider down');
        yield c;
      }
    },
  };
}

async function build(tables: Record<string, MockBuilder | MockBuilder[]>, ai = provider(['Gợi ý ', 'một bước.'])) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.decorate('aiProvider', ai);
  app.addHook('onRequest', async (req) => { (req as any).user = student; });
  await app.register(tutorRoutes);
  await app.ready();
  return { app, ai };
}

const events = (body: string) =>
  body.trim().split('\n\n').map((block) => {
    const [ev, data] = block.split('\n');
    return { event: ev.replace('event: ', ''), data: JSON.parse(data.replace('data: ', '')) };
  });

describe('POST /api/tutor/chat', () => {
  it('refuses empty and too long messages', async () => {
    const { app } = await build({});
    for (const message of ['   ', 'a'.repeat(2001)]) {
      expect((await app.inject({ method: 'POST', url: '/api/tutor/chat', payload: { message, language: 'vi' } })).statusCode).toBe(400);
    }
    await app.close();
  });

  it('answers 429 at the daily limit, counting from the Vietnam day start', async () => {
    const count = mockQuery({ data: null, error: null, count: 30 });
    const { app } = await build({ tutor_messages: count });
    const res = await app.inject({ method: 'POST', url: '/api/tutor/chat', payload: { message: 'Hỏi', language: 'vi' } });
    expect(res.statusCode).toBe(429);
    expect(res.json().remaining).toBe(0);
    expect(count.eqCalls).toEqual(expect.arrayContaining([['user_id', 'student-1'], ['role', 'user']]));
    expect(count.gteCalls[0][0]).toBe('created_at');
    await app.close();
  });

  it('creates a conversation, stores both messages and streams meta, deltas, done', async () => {
    const convInsert = ok({ id: C1 });
    const userInsert = ok();
    const assistantInsert = ok();
    const { app, ai } = await build({
      tutor_messages: [mockQuery({ data: null, error: null, count: 3 }), userInsert, ok([{ role: 'user', content: 'Vòng lặp là gì?' }]), assistantInsert],
      profiles: ok({ preferred_education_level: 'lower_secondary' }),
      tutor_conversations: [convInsert, ok()],
    });
    const res = await app.inject({ method: 'POST', url: '/api/tutor/chat', payload: { message: '  Vòng lặp là gì?  ', language: 'vi' } });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    const ev = events(res.body);
    expect(ev.map((e) => e.event)).toEqual(['meta', 'delta', 'delta', 'done']);
    expect(ev[0].data).toEqual({ conversation_id: C1, remaining: 26 });
    expect(convInsert.inserted[0]).toMatchObject({ user_id: 'student-1', title: 'Vòng lặp là gì?', lesson_id: null });
    expect(userInsert.inserted[0]).toMatchObject({ conversation_id: C1, role: 'user', content: 'Vòng lặp là gì?' });
    expect(assistantInsert.inserted[0]).toMatchObject({ role: 'assistant', content: 'Gợi ý một bước.' });
    expect(ai.calls[0].system).toMatch(/lower secondary/i);
    expect(ai.calls[0].system).toContain('"thầy"');
    await app.close();
  });

  it('404s a conversation that is not the caller’s', async () => {
    const { app } = await build({
      tutor_messages: mockQuery({ data: null, error: null, count: 0 }),
      tutor_conversations: ok(null),
    });
    const res = await app.inject({ method: 'POST', url: '/api/tutor/chat', payload: { conversation_id: C1, message: 'Hỏi', language: 'vi' } });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('refuses a draft lesson, and never sends quiz answers to the model', async () => {
    const draft = await build({
      tutor_messages: mockQuery({ data: null, error: null, count: 0 }),
      lessons: ok({ title_vi: 'B', title_en: 'B', status: 'draft', blocks: [], subjects: { name_vi: 'Tin học', name_en: 'Informatics' } }),
    });
    expect((await draft.app.inject({ method: 'POST', url: '/api/tutor/chat', payload: { lesson_id: L1, message: 'Hỏi', language: 'vi' } })).statusCode).toBe(404);
    await draft.app.close();

    const { app, ai } = await build({
      tutor_messages: [mockQuery({ data: null, error: null, count: 0 }), ok(), ok([{ role: 'user', content: 'Hỏi' }]), ok()],
      lessons: ok({
        title_vi: 'Vòng lặp', title_en: 'Loops', status: 'published', subjects: { name_vi: 'Tin học', name_en: 'Informatics' },
        blocks: [{ type: 'theory', content: { vi: 'Lý thuyết vòng lặp', en: 'x' } }, { type: 'quiz', question_id: L1, answer_key: 'SECRET' }],
      }),
      profiles: ok(null),
      tutor_conversations: [ok({ id: C1 }), ok()],
    });
    await app.inject({ method: 'POST', url: '/api/tutor/chat', payload: { lesson_id: L1, message: 'Hỏi', language: 'vi' } });
    expect(ai.calls[0].system).toContain('Lý thuyết vòng lặp');
    expect(ai.calls[0].system).not.toContain('SECRET');
    await app.close();
  });

  it('stores the partial answer and sends an error event when the provider fails after some text', async () => {
    const assistantInsert = ok();
    const { app } = await build(
      {
        tutor_messages: [mockQuery({ data: null, error: null, count: 0 }), ok(), ok([{ role: 'user', content: 'Hỏi' }]), assistantInsert],
        profiles: ok(null),
        tutor_conversations: [ok({ id: C1 }), ok()],
      },
      provider(['Bước 1. ', 'never'], 1),
    );
    const res = await app.inject({ method: 'POST', url: '/api/tutor/chat', payload: { message: 'Hỏi', language: 'vi' } });
    const ev = events(res.body);
    expect(ev.map((e) => e.event)).toEqual(['meta', 'delta', 'error']);
    expect(assistantInsert.inserted[0]).toMatchObject({ content: 'Bước 1. ' });
    await app.close();
  });

  it('stores nothing from the model when it fails before any text', async () => {
    const { app } = await build(
      {
        tutor_messages: [mockQuery({ data: null, error: null, count: 0 }), ok(), ok([{ role: 'user', content: 'Hỏi' }])],
        profiles: ok(null),
        tutor_conversations: [ok({ id: C1 }), ok()],
      },
      provider(['x'], 0),
    );
    const res = await app.inject({ method: 'POST', url: '/api/tutor/chat', payload: { message: 'Hỏi', language: 'vi' } });
    expect(events(res.body).map((e) => e.event)).toEqual(['meta', 'error']);
    await app.close();
  });
});
```

(The last test gives `tutor_messages` only three builders: a fourth `from('tutor_messages')` call would throw "No more mock results", failing the test.)

- [ ] **Step 3: Run** `npx vitest run src/__tests__/tutor-chat.test.ts` — Expected: FAIL (404 route not found).

- [ ] **Step 4: Implement the chat route** in `routes/tutor.ts` (inside `tutorRoutes`, add imports for `buildSystemPrompt`, `lessonContext`, `EducationLevel`, and `CONTEXT_MESSAGES`, `MESSAGE_MAX`, `TITLE_LENGTH`, `dailyLimit`, `vietnamDayStart`):

```ts
  app.post('/api/tutor/chat', async (request, reply) => {
    const supabase = app.supabase!;
    const uid = userId(request)!;
    const body = (request.body ?? {}) as { conversation_id?: unknown; lesson_id?: unknown; message?: unknown; language?: unknown };
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const language = body.language === 'en' ? 'en' : 'vi';
    if (!message || message.length > MESSAGE_MAX) {
      return reply.code(400).send(msg(`Câu hỏi cần từ 1 đến ${MESSAGE_MAX} ký tự.`, `A question needs 1 to ${MESSAGE_MAX} characters.`));
    }
    const conversationId = typeof body.conversation_id === 'string' ? body.conversation_id : undefined;
    if (conversationId !== undefined && !UUID.test(conversationId)) return reply.code(404).send(notFound);
    const askedLesson = typeof body.lesson_id === 'string' && UUID.test(body.lesson_id) ? body.lesson_id : null;

    // Two questions sent at the same moment at limit − 1 can both pass: an overshoot of one is accepted.
    const { count, error: countError } = await supabase
      .from('tutor_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('role', 'user')
      .gte('created_at', vietnamDayStart(new Date()).toISOString());
    if (countError) {
      request.log.error({ err: countError }, 'Failed to count tutor questions');
      return reply.code(500).send(msg('Không kiểm tra được lượt hỏi.', 'Could not check your questions today.'));
    }
    const limit = dailyLimit();
    const used = count ?? 0;
    if (used >= limit) {
      return reply.code(429).send({ ...msg('Em đã hết lượt hỏi hôm nay. Lượt mới có lúc 0 giờ.', 'You have used today’s questions. New ones arrive at midnight (Vietnam time).'), remaining: 0 });
    }

    let lessonId = askedLesson;
    if (conversationId) {
      const { data: conv } = await supabase.from('tutor_conversations').select('id, lesson_id').eq('id', conversationId).eq('user_id', uid).maybeSingle();
      if (!conv) return reply.code(404).send(notFound);
      lessonId = (conv as { lesson_id: string | null }).lesson_id;
    }

    let lessonText: string | undefined;
    if (lessonId) {
      const { data: lesson } = await supabase
        .from('lessons').select('title_vi, title_en, blocks, status, subjects(name_vi, name_en)').eq('id', lessonId).maybeSingle();
      const row = lesson as { title_vi: string; title_en: string; blocks: unknown[]; status: string; subjects: { name_vi: string; name_en: string } | null } | null;
      if (!row || row.status !== 'published') {
        return reply.code(404).send(msg('Không tìm thấy bài học.', 'Lesson not found.'));
      }
      lessonText = lessonContext(
        { title_vi: row.title_vi, title_en: row.title_en, blocks: Array.isArray(row.blocks) ? row.blocks : [], subject_name: (language === 'vi' ? row.subjects?.name_vi : row.subjects?.name_en) ?? '' },
        language,
      );
    }

    const { data: profile } = await supabase.from('profiles').select('preferred_education_level').eq('id', uid).maybeSingle();
    const level = ((profile as { preferred_education_level?: EducationLevel | null } | null)?.preferred_education_level ?? null);

    let id = conversationId;
    if (!id) {
      const { data: created, error } = await supabase
        .from('tutor_conversations').insert({ user_id: uid, title: message.slice(0, TITLE_LENGTH), lesson_id: askedLesson }).select('id').single();
      if (error || !created) {
        request.log.error({ err: error }, 'Failed to create tutor conversation');
        return reply.code(500).send(msg('Không tạo được hội thoại.', 'Could not start the conversation.'));
      }
      id = (created as { id: string }).id;
    }
    const { error: saveError } = await supabase.from('tutor_messages').insert({ conversation_id: id, user_id: uid, role: 'user', content: message });
    if (saveError) {
      request.log.error({ err: saveError }, 'Failed to store tutor question');
      return reply.code(500).send(msg('Không lưu được câu hỏi.', 'Could not save your question.'));
    }
    const { data: recent } = await supabase
      .from('tutor_messages').select('role, content').eq('conversation_id', id).order('created_at', { ascending: false }).limit(CONTEXT_MESSAGES);
    const history = ((recent ?? []) as Array<{ role: 'user' | 'assistant'; content: string }>).reverse();

    reply.hijack();
    const raw = reply.raw;
    raw.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'Access-Control-Allow-Origin': reply.getHeader('access-control-allow-origin') as string ?? '*' });
    const send = (event: string, data: unknown) => {
      if (!raw.writableEnded && !raw.destroyed) raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    let closed = false;
    request.raw.on('close', () => { closed = true; });

    send('meta', { conversation_id: id, remaining: limit - used - 1 });
    let answer = '';
    let failed = false;
    try {
      for await (const text of app.aiProvider.chat(history, buildSystemPrompt({ language, level, lesson: lessonText }))) {
        if (closed) break;
        answer += text;
        send('delta', { text });
      }
    } catch (err) {
      failed = true;
      request.log.error({ err }, 'Tutor provider failed');
      send('error', msg('Gia sư đang bận. Hãy thử lại sau ít phút.', 'The tutor is busy. Try again in a few minutes.'));
    }
    if (answer) {
      await supabase.from('tutor_messages').insert({ conversation_id: id, user_id: uid, role: 'assistant', content: answer.slice(0, 20000) });
    }
    await supabase.from('tutor_conversations').update({ updated_at: new Date().toISOString() }).eq('id', id);
    if (!failed) send('done', {});
    raw.end();
  });
```

Note on CORS: `reply.hijack()` skips Fastify's `onSend` hooks, so `@fastify/cors` headers set in `onRequest` are already on `reply` — copy them with `reply.getHeaders()`: replace the `writeHead` headers object with `{ ...reply.getHeaders(), 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' }` (drop the explicit `Access-Control-Allow-Origin`). Verify in Task 8 against the running backend that the browser accepts the stream.

- [ ] **Step 5: Run** the chat tests and the conversation tests — Expected: PASS. Run `npx tsc --noEmit -p .` — no errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/tutor.ts backend/src/__tests__/tutor-chat.test.ts backend/src/__tests__/helpers/supabaseMock.ts
git commit -m "feat(api): tutor chat with daily limit, stored messages and SSE"
```

---

### Task 5: Web client — SSE parser, API, `useTutorChat`

**Files:**
- Create: `frontend/features/ai-tutor/streamTutor.ts`
- Create: `frontend/features/ai-tutor/api.ts`
- Create: `frontend/features/ai-tutor/useTutorChat.ts`
- Test: `frontend/features/ai-tutor/streamTutor.test.ts`, `frontend/features/ai-tutor/useTutorChat.test.ts`

**Interfaces:**
- Consumes: SSE contract from Task 4; `authoringCall` / `ApiResult` from `features/authoring/apiClient.ts` for JSON routes; `createBrowserClient` from `@scipal/supabase` for the stream token.
- Produces:
  - `type TutorEvent = { event: 'meta'; conversation_id: string; remaining: number } | { event: 'delta'; text: string } | { event: 'done' } | { event: 'error'; error: { vi: string; en: string } }`
  - `createSseParser(onEvent: (e: TutorEvent) => void): (chunk: string) => void`
  - `streamTutor(body: { conversation_id?: string; lesson_id?: string; message: string; language: 'vi' | 'en' }, onEvent: (e: TutorEvent) => void, signal?: AbortSignal): Promise<{ ok: true } | { ok: false; status: number; error: { vi: string; en: string }; remaining?: number }>`
  - `api.ts`: `type TutorConversation = { id: string; title: string; lesson_id: string | null; updated_at: string }`, `type TutorMessage = { id?: string; role: 'user' | 'assistant'; content: string }`, `listConversations()`, `getConversation(id)`, `deleteConversation(id)`.
  - `useTutorChat(opts: { conversationId?: string; lessonId?: string; initialMessages?: TutorMessage[] }): { conversationId: string | null; messages: TutorMessage[]; streaming: boolean; remaining: number | null; error: { vi: string; en: string } | null; limitReached: boolean; send(text: string): Promise<void>; stop(): void; retry(): Promise<void> }` plus a pure reducer `tutorReducer` exported for tests.

- [ ] **Step 1: Write the failing parser test**

```ts
import { describe, expect, it } from 'vitest';
import { createSseParser, type TutorEvent } from './streamTutor';

describe('createSseParser', () => {
  it('handles events split across chunks and several events in one chunk', () => {
    const seen: TutorEvent[] = [];
    const feed = createSseParser((e) => seen.push(e));
    feed('event: meta\ndata: {"conversation_id":"c1","remai');
    feed('ning":4}\n\nevent: delta\ndata: {"text":"Gợi"}\n\nevent: delta\ndata: {"text":" ý"}\n\n');
    feed('event: done\ndata: {}\n\n');
    expect(seen).toEqual([
      { event: 'meta', conversation_id: 'c1', remaining: 4 },
      { event: 'delta', text: 'Gợi' },
      { event: 'delta', text: ' ý' },
      { event: 'done' },
    ]);
  });

  it('turns a server error event into a bilingual error and ignores junk', () => {
    const seen: TutorEvent[] = [];
    const feed = createSseParser((e) => seen.push(e));
    feed(': ping\n\nevent: error\ndata: {"error":"Bận","error_en":"Busy"}\n\nevent: delta\ndata: not-json\n\n');
    expect(seen).toEqual([{ event: 'error', error: { vi: 'Bận', en: 'Busy' } }]);
  });
});
```

- [ ] **Step 2: Run** `cd frontend && npx vitest run features/ai-tutor/streamTutor.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement `streamTutor.ts`**

```ts
import { createBrowserClient } from '@scipal/supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';
type Bilingual = { vi: string; en: string };

export type TutorEvent =
  | { event: 'meta'; conversation_id: string; remaining: number }
  | { event: 'delta'; text: string }
  | { event: 'done' }
  | { event: 'error'; error: Bilingual };

/** Feeds text chunks of an SSE stream; calls onEvent for each complete, well-formed event. */
export function createSseParser(onEvent: (e: TutorEvent) => void) {
  let buffer = '';
  return (chunk: string) => {
    buffer += chunk;
    let end: number;
    while ((end = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      let name = '';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event: ')) name = line.slice(7);
        else if (line.startsWith('data: ')) data += line.slice(6);
      }
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(data || '{}');
      } catch {
        continue;
      }
      if (name === 'meta' && typeof parsed.conversation_id === 'string' && typeof parsed.remaining === 'number') {
        onEvent({ event: 'meta', conversation_id: parsed.conversation_id, remaining: parsed.remaining });
      } else if (name === 'delta' && typeof parsed.text === 'string') onEvent({ event: 'delta', text: parsed.text });
      else if (name === 'done') onEvent({ event: 'done' });
      else if (name === 'error') {
        onEvent({ event: 'error', error: { vi: String(parsed.error ?? 'Có lỗi xảy ra.'), en: String(parsed.error_en ?? 'Something went wrong.') } });
      }
    }
  };
}

const EXPIRED: Bilingual = { vi: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.', en: 'Your session expired. Sign in again.' };
const OFFLINE: Bilingual = { vi: 'Không kết nối được máy chủ.', en: 'Could not reach the server.' };

export async function streamTutor(
  body: { conversation_id?: string; lesson_id?: string; message: string; language: 'vi' | 'en' },
  onEvent: (e: TutorEvent) => void,
  signal?: AbortSignal,
): Promise<{ ok: true } | { ok: false; status: number; error: Bilingual; remaining?: number }> {
  const { data: { session } } = await createBrowserClient().auth.getSession();
  if (!session) return { ok: false, status: 401, error: EXPIRED };
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/tutor/chat`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') return { ok: true };
    return { ok: false, status: 0, error: OFFLINE };
  }
  if (!res.ok || !res.body) {
    const data = (await res.json().catch(() => ({}))) as { error?: string; error_en?: string; remaining?: number };
    return {
      ok: false,
      status: res.status,
      error: { vi: data.error ?? 'Máy chủ từ chối thao tác.', en: data.error_en ?? 'The server refused the request.' },
      remaining: data.remaining,
    };
  }
  const feed = createSseParser(onEvent);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      feed(decoder.decode(value, { stream: true }));
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') return { ok: false, status: 0, error: OFFLINE };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Implement `api.ts`**

```ts
import { authoringCall } from '../authoring/apiClient';

export type TutorConversation = { id: string; title: string; lesson_id: string | null; updated_at: string };
export type TutorMessage = { id?: string; role: 'user' | 'assistant'; content: string };

export const listConversations = () => authoringCall<{ conversations: TutorConversation[] }>('/api/tutor/conversations', 'GET');
export const getConversation = (id: string) =>
  authoringCall<{ conversation: TutorConversation; messages: TutorMessage[] }>(`/api/tutor/conversations/${encodeURIComponent(id)}`, 'GET');
export const deleteConversation = (id: string) => authoringCall<Record<string, never>>(`/api/tutor/conversations/${encodeURIComponent(id)}`, 'DELETE');
```

- [ ] **Step 5: Write the failing reducer test** (`useTutorChat.test.ts`)

```ts
import { describe, expect, it } from 'vitest';
import { initialTutorState, tutorReducer } from './useTutorChat';

describe('tutorReducer', () => {
  it('adds the question and an empty answer, then fills the answer from deltas', () => {
    let s = tutorReducer(initialTutorState([]), { type: 'send', text: 'Hỏi' });
    s = tutorReducer(s, { type: 'event', event: { event: 'meta', conversation_id: 'c1', remaining: 5 } });
    s = tutorReducer(s, { type: 'event', event: { event: 'delta', text: 'Gợi ' } });
    s = tutorReducer(s, { type: 'event', event: { event: 'delta', text: 'ý' } });
    s = tutorReducer(s, { type: 'event', event: { event: 'done' } });
    expect(s.messages).toEqual([{ role: 'user', content: 'Hỏi' }, { role: 'assistant', content: 'Gợi ý' }]);
    expect(s).toMatchObject({ conversationId: 'c1', remaining: 5, streaming: false, error: null });
  });

  it('drops an empty answer on error and marks the limit on 429', () => {
    let s = tutorReducer(initialTutorState([]), { type: 'send', text: 'Hỏi' });
    s = tutorReducer(s, { type: 'failed', status: 429, error: { vi: 'Hết lượt', en: 'Limit' }, remaining: 0 });
    expect(s.messages).toEqual([{ role: 'user', content: 'Hỏi' }]);
    expect(s).toMatchObject({ limitReached: true, remaining: 0, streaming: false, lastQuestion: 'Hỏi' });
  });
});
```

- [ ] **Step 6: Implement `useTutorChat.ts`**

```ts
'use client';

import { useCallback, useReducer, useRef } from 'react';
import { useLanguage } from '@scipal/hooks';
import { streamTutor, type TutorEvent } from './streamTutor';
import type { TutorMessage } from './api';

type Bilingual = { vi: string; en: string };
export type TutorState = {
  conversationId: string | null;
  messages: TutorMessage[];
  streaming: boolean;
  remaining: number | null;
  error: Bilingual | null;
  limitReached: boolean;
  lastQuestion: string | null;
};
type Action =
  | { type: 'send'; text: string }
  | { type: 'event'; event: TutorEvent }
  | { type: 'failed'; status: number; error: Bilingual; remaining?: number }
  | { type: 'finished' };

export const initialTutorState = (messages: TutorMessage[], conversationId: string | null = null): TutorState => ({
  conversationId, messages, streaming: false, remaining: null, error: null, limitReached: false, lastQuestion: null,
});

/** Drops a trailing empty assistant message (an answer that never started). */
const trimEmpty = (messages: TutorMessage[]) => {
  const last = messages[messages.length - 1];
  return last?.role === 'assistant' && !last.content ? messages.slice(0, -1) : messages;
};

export function tutorReducer(state: TutorState, action: Action): TutorState {
  switch (action.type) {
    case 'send':
      return { ...state, streaming: true, error: null, lastQuestion: action.text, messages: [...state.messages, { role: 'user', content: action.text }, { role: 'assistant', content: '' }] };
    case 'event': {
      const e = action.event;
      if (e.event === 'meta') return { ...state, conversationId: e.conversation_id, remaining: e.remaining };
      if (e.event === 'delta') {
        const messages = [...state.messages];
        const last = messages[messages.length - 1];
        messages[messages.length - 1] = { ...last, content: last.content + e.text };
        return { ...state, messages };
      }
      if (e.event === 'error') return { ...state, streaming: false, error: e.error, messages: trimEmpty(state.messages) };
      return { ...state, streaming: false };
    }
    case 'failed':
      return {
        ...state,
        streaming: false,
        error: action.error,
        messages: trimEmpty(state.messages),
        limitReached: action.status === 429,
        remaining: action.remaining ?? state.remaining,
      };
    case 'finished':
      return { ...state, streaming: false, messages: trimEmpty(state.messages) };
  }
}

export function useTutorChat(opts: { conversationId?: string; lessonId?: string; initialMessages?: TutorMessage[] }) {
  const { lang } = useLanguage();
  const [state, dispatch] = useReducer(tutorReducer, initialTutorState(opts.initialMessages ?? [], opts.conversationId ?? null));
  const abort = useRef<AbortController | null>(null);
  const conversation = useRef(state.conversationId);
  conversation.current = state.conversationId;

  const send = useCallback(async (text: string) => {
    const message = text.trim();
    if (!message || abort.current) return;
    const controller = new AbortController();
    abort.current = controller;
    dispatch({ type: 'send', text: message });
    const res = await streamTutor(
      { message, language: lang === 'en' ? 'en' : 'vi', ...(conversation.current ? { conversation_id: conversation.current } : opts.lessonId ? { lesson_id: opts.lessonId } : {}) },
      (event) => dispatch({ type: 'event', event }),
      controller.signal,
    );
    abort.current = null;
    if (!res.ok) dispatch({ type: 'failed', status: res.status, error: res.error, remaining: res.remaining });
    else dispatch({ type: 'finished' });
  }, [lang, opts.lessonId]);

  const stop = useCallback(() => {
    abort.current?.abort();
    abort.current = null;
  }, []);

  const retry = useCallback(async () => {
    if (state.lastQuestion) await send(state.lastQuestion);
  }, [send, state.lastQuestion]);

  return { ...state, send, stop, retry };
}
```

- [ ] **Step 7: Run** both test files — Expected: PASS. `npx tsc --noEmit -p .` clean.

- [ ] **Step 8: Commit**

```bash
git add frontend/features/ai-tutor/streamTutor.ts frontend/features/ai-tutor/streamTutor.test.ts frontend/features/ai-tutor/api.ts frontend/features/ai-tutor/useTutorChat.ts frontend/features/ai-tutor/useTutorChat.test.ts
git commit -m "feat(web): tutor stream client and chat state"
```

---

### Task 6: `/tutor` page UI

Before editing UI, load the `impeccable` skill (run its `context` step, mode **Operate**) and follow its craft floor. Keep the level-token system; no new colours.

**Files:**
- Create: `frontend/features/ai-tutor/TutorMessage.tsx`, `TutorChat.tsx`, `ConversationList.tsx`, `LessonPicker.tsx`, `TutorPage.tsx`, `examples.ts`, `tutorLessons.ts`
- Create: `frontend/app/tutor/page.tsx`, `frontend/app/dev/tutor-showcase/page.tsx`
- Test: `frontend/features/ai-tutor/TutorChat.test.tsx`, `TutorMessage.test.tsx`, `LessonPicker.test.tsx`

**Interfaces:**
- Consumes: `useTutorChat`, `TutorState`, `TutorMessage`, `TutorConversation`, `listConversations`, `getConversation`, `deleteConversation` (Task 5).
- Produces:
  - `TutorMessage({ message }: { message: TutorMessage })`
  - `TutorChatView(props: { messages; streaming; remaining; error; limitReached; level: EducationLevel; onSend(text): void; onStop(): void; onRetry(): void })` — presentational, used by `TutorChat` (wires `useTutorChat`) and by the showcase with fixed props.
  - `ConversationList({ conversations, activeId, onOpen(id), onNew(), onDelete(id) })`
  - `type TutorLesson = { id: string; title_vi: string; title_en: string; grade: number; subject_id: string; subject_name_vi: string; subject_name_en: string }`
  - `tutorLessons.ts`: `getTutorLessons(): Promise<TutorLesson[]>` (server-only; Supabase server client; published lessons ordered by subject then `sort_order`; returns `[]` on error and logs).
  - `LessonPicker({ lessons, value, onChange(lessonId: string | null) })` — subject `<select>` then lesson `<select>`; "Không chọn bài" clears it.
  - `TutorPage({ level, lessons, initialConversationId?, lessonId? })` (client).
  - `examples.ts`: `EXAMPLE_QUESTIONS: Record<EducationLevel, Array<{ vi: string; en: string }>>` (4 each).
  - `EducationLevel` type from `@/features/landing/educationLevel` (existing).

- [ ] **Step 1: Write the failing render tests**

`TutorMessage.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TutorMessage } from './TutorMessage';

describe('TutorMessage', () => {
  it('renders markdown, a formula and a code block', () => {
    const html = renderToStaticMarkup(<TutorMessage message={{ role: 'assistant', content: '**Gợi ý**: $a^2$\n\n```python\nprint(1)\n```' }} />);
    expect(html).toContain('<strong>Gợi ý</strong>');
    expect(html).toContain('katex');
    expect(html).toMatch(/<code[^>]*language-python/);
  });

  it('does not render raw HTML or javascript: links', () => {
    const html = renderToStaticMarkup(<TutorMessage message={{ role: 'assistant', content: '<img src=x onerror=alert(1)> [x](javascript:alert(1))' }} />);
    expect(html).not.toContain('<img');
    expect(html).not.toContain('href="javascript:');
  });

  it('shows the student’s own text as plain text', () => {
    expect(renderToStaticMarkup(<TutorMessage message={{ role: 'user', content: '**không đậm**' }} />)).toContain('**không đậm**');
  });
});
```

`TutorChat.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { TutorChatView } from './TutorChat';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));

const base = { messages: [], streaming: false, remaining: 12, error: null, limitReached: false, level: 'upper_secondary' as const, onSend: () => {}, onStop: () => {}, onRetry: () => {} };

describe('TutorChatView', () => {
  it('shows example questions and the remaining count when empty', () => {
    const html = renderToStaticMarkup(<TutorChatView {...base} />);
    expect(html.match(/data-example/g)).toHaveLength(4);
    expect(html).toContain('Còn 12 lượt hôm nay');
    expect(html).toMatch(/<label[^>]*>Câu hỏi của em<\/label>/);
    expect(countRawColors(html).total).toBe(0);
  });

  it('shows "Dừng" while streaming', () => {
    const html = renderToStaticMarkup(<TutorChatView {...base} streaming messages={[{ role: 'user', content: 'Hỏi' }, { role: 'assistant', content: 'Gợi' }]} />);
    expect(html).toContain('Dừng');
    expect(html).not.toContain('data-example');
  });

  it('shows the error with "Thử lại", and disables the composer at the limit', () => {
    const err = renderToStaticMarkup(<TutorChatView {...base} error={{ vi: 'Gia sư đang bận.', en: 'Busy' }} messages={[{ role: 'user', content: 'Hỏi' }]} />);
    expect(err).toContain('Gia sư đang bận.');
    expect(err).toContain('Thử lại');
    const limit = renderToStaticMarkup(<TutorChatView {...base} limitReached remaining={0} error={{ vi: 'Hết lượt', en: 'Limit' }} />);
    expect(limit).toMatch(/<textarea[^>]*disabled=""/);
    expect(limit).not.toContain('Thử lại');
  });
});
```

`LessonPicker.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LessonPicker } from './LessonPicker';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));

const lessons = [
  { id: 'l1', title_vi: 'Vòng lặp', title_en: 'Loops', grade: 10, subject_id: 's1', subject_name_vi: 'Tin học', subject_name_en: 'Informatics' },
  { id: 'l2', title_vi: 'Dao động', title_en: 'Oscillation', grade: 11, subject_id: 's2', subject_name_vi: 'Vật lí', subject_name_en: 'Physics' },
];

describe('LessonPicker', () => {
  it('lists subjects, and the lessons of the chosen lesson’s subject', () => {
    const html = renderToStaticMarkup(<LessonPicker lessons={lessons} value="l1" onChange={() => {}} />);
    expect(html).toMatch(/<label[^>]*>Môn<\/label>/);
    expect(html).toContain('Vật lí');
    expect(html).toContain('Vòng lặp');
    expect(html).not.toContain('Dao động');
    expect(html).toContain('Không chọn bài');
  });

  it('renders nothing when there are no published lessons', () => {
    expect(renderToStaticMarkup(<LessonPicker lessons={[]} value={null} onChange={() => {}} />)).toBe('');
  });
});
```

- [ ] **Step 2: Run** — Expected: FAIL (modules missing).

- [ ] **Step 3: Implement `TutorMessage.tsx`**

```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { TutorMessage as Message } from './api';

// react-markdown escapes raw HTML by default (no rehype-raw) and drops javascript: URLs
// through its default urlTransform.

export function TutorMessage({ message }: { message: Message }) {
  if (message.role === 'user') {
    return <p className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-action px-4 py-2 text-action-ink">{message.content}</p>;
  }
  return (
    <div className="tutor-answer max-w-full text-ink [&_code]:rounded [&_code]:bg-surface-sunken [&_code]:px-1 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-surface-sunken [&_pre]:p-3 [&_pre_code]:bg-transparent [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {message.content}
      </ReactMarkdown>
    </div>
  );
}
```

(Check first how the lesson theory renderer imports the KaTeX CSS — `grep -rn "katex.min.css" frontend` — and reuse that import location instead of importing it here if it is already global.)

- [ ] **Step 4: Implement `examples.ts`** with four `{ vi, en }` questions per level, e.g. upper secondary: "Vì sao vòng lặp while của em chạy mãi không dừng?", "Giải thích độ phức tạp O(n log n) bằng ví dụ", "Em nên bắt đầu bài toán tìm kiếm nhị phân thế nào?", "Kiểm tra giúp em ý tưởng sắp xếp nổi bọt"; lower secondary and primary with simpler Tin học/Khoa học questions (all four present for each level, bilingual).

- [ ] **Step 5: Implement `TutorChat.tsx`** — `TutorChatView` renders:
  - a scrolling `role="log" aria-live="polite"` list of `TutorMessage`s (the streaming answer shows a blinking caret span with `aria-hidden`);
  - when `messages.length === 0`: a greeting (`{ vi: 'Em đang bí ở đâu?', en: 'Where are you stuck?' }`) and four buttons with `data-example` from `EXAMPLE_QUESTIONS[level]` calling `onSend`;
  - error: `<Alert tone="danger">` with the message and, unless `limitReached`, a "Thử lại" button calling `onRetry`;
  - composer `<form>`: `<label htmlFor>Câu hỏi của em</label>`, a `<textarea>` (`maxLength={2000}`, `rows={2}`, `disabled={limitReached}`; Enter without Shift submits, Shift+Enter inserts a line — handle in `onKeyDown`, ignoring `e.nativeEvent.isComposing` for Vietnamese IME), a counter shown when length > 1800 (`n/2000`), a send button (disabled when empty or streaming) or a "Dừng" button while streaming, and `Còn {remaining} lượt hôm nay` when `remaining !== null`.
  - `TutorChat({ conversationId?, lessonId?, initialMessages?, level })` calls `useTutorChat` and renders `TutorChatView`; it scrolls the log to the bottom when messages change and returns `conversationId` through an `onConversation?(id)` prop so the page can update the URL/list.

- [ ] **Step 5b: Implement `tutorLessons.ts` and `LessonPicker.tsx`**: `getTutorLessons` selects `id, title_vi, title_en, grade, subject_id, sort_order, subjects(name_vi, name_en, sort_order)` from `lessons` where `status = 'published'`, sorts by subject `sort_order`, grade, lesson `sort_order`, and maps to `TutorLesson`. `LessonPicker` returns `null` for an empty list; otherwise a labelled subject `<select>` ("Môn") whose options are the distinct subjects, and a labelled lesson `<select>` ("Bài") for the chosen subject with a first option "Không chọn bài" (value `''`) — choosing a subject selects no lesson until one is picked. The chosen lesson is shown in `TutorChatView` as a chip ("Đang hỏi về: {title}") above the messages; `TutorChatView` gets an optional `lessonTitle?: string` and, on an empty chat only, a `picker?: ReactNode` slot rendered above the examples.

- [ ] **Step 6: Implement `ConversationList.tsx`**: "Hội thoại mới" button; `<ul>` of conversations (title, relative date via `Intl.DateTimeFormat`), active one marked `aria-current="page"`; each has a delete icon button (`aria-label="Xóa hội thoại {title}"`) with `window.confirm`. Empty list text: "Chưa có hội thoại nào.".

- [ ] **Step 7: Implement `TutorPage.tsx`** (client): loads `listConversations()` on mount; if `initialConversationId`, `getConversation(id)` — on 404 show `Alert` "Không tìm thấy hội thoại này." and a new chat; renders a two-column grid on `lg` (list 18rem + chat), and below `lg` a "Hội thoại" button opening the list in the existing `Dialog` component (`@/components/ui/dialog`). The picker's lesson id is held in `TutorPage` state (initialised from `lessonId`) and passed to `TutorChat` as `lessonId`; once the chat has a conversation the picker is hidden and the chip shows the lesson title (looked up in `lessons` by the conversation's `lesson_id`). Opening a conversation remounts `TutorChat` with `key={id}` and `initialMessages`; "Hội thoại mới" remounts with no id; after the first answer `onConversation` updates the URL with `router.replace('/tutor?conversation=' + id)` and refreshes the list. Deleting the active conversation starts a new chat.

- [ ] **Step 8: Implement `app/tutor/page.tsx`** (server): get the Supabase server user as `app/profile/page.tsx` does; `if (!user) redirect('/login?redirect=%2Ftutor')`; read `preferred_education_level` with `parseEducationLevel` and `resolveEducationLevel` (as in the profile page); read `searchParams` `conversation` and `lesson` (UUID-checked); load `getTutorLessons()`; render a heading "Gia sư AI" / "AI tutor" with one line of lead text and `<TutorPage level=… lessons=… initialConversationId=… lessonId=… />`. `export const dynamic = 'force-dynamic'`.

- [ ] **Step 9: Implement `app/dev/tutor-showcase/page.tsx`**: `notFound()` in production like `teacher-showcase`; `?view=empty|picker|chat|streaming|error|limit|list` renders `TutorChatView`/`ConversationList` with fixed props (the chat view uses an answer with markdown, a `$$` formula and a Python block).

- [ ] **Step 10: Run** the render tests, `npx tsc --noEmit -p .`, `npx next lint` — Expected: PASS.

- [ ] **Step 11: Browser check** with `preview_start` (`web`): `/dev/tutor-showcase?view=…` for every view at 375×812 and 1280 px, light and dark; no horizontal scroll (`document.documentElement.scrollWidth > innerWidth` is false); focus ring visible on the composer; screenshot `chat` and `limit`.

- [ ] **Step 12: Commit**

```bash
git add frontend/features/ai-tutor frontend/app/tutor frontend/app/dev/tutor-showcase
git commit -m "feat(web): AI tutor page with conversations, streaming and limits"
```

---

### Task 7: Entry points and the lesson panel

**Files:**
- Modify: `frontend/features/ai-tutor/AiTutorPanel.tsx`, `AiTutorButton.tsx` (props)
- Modify: `frontend/features/landing/LandingPage.tsx:178`
- Modify: `frontend/components/nav/NavBar.tsx` (link for signed-in users)
- Delete: `frontend/features/ai-tutor/useAiChat.ts`; the chat helper at the top of `frontend/lib/api.ts`
- Test: `frontend/features/landing/TutorSection.test.tsx`, `frontend/components/nav/NavBar.test.tsx`, `frontend/features/ai-tutor/AiTutorPanel.test.tsx`

**Interfaces:**
- Consumes: `TutorChat` (Task 6).
- Produces: `AiTutorPanel({ lessonId, lessonTitle, onClose })` — the `token` and `subjectSlug` props are removed; `AiTutorButton` passes `lessonId` and the lesson title.

- [ ] **Step 1: Write the failing tests**
  - `TutorSection.test.tsx`: add a test that reads `features/landing/LandingPage.tsx` with `readFileSync` and expects it to contain `<TutorSection href="/tutor"` (the section itself already renders "Thử ngay" when `href` is set — existing test).
  - `NavBar.test.tsx`: `expect(tutorLink(true, 'vi')).toEqual({ href: '/tutor', label: 'Gia sư AI' })` and `expect(tutorLink(false, 'vi')).toBeNull()` — export a small `tutorLink(signedIn: boolean, lang)` helper from `NavBar.tsx` and render it in both the desktop and mobile menus next to the existing primary links.
  - `AiTutorPanel.test.tsx`: renders with `lessonId`, contains the lesson title and a link `href="/tutor?lesson=<lessonId>"` labelled "Mở ở trang Gia sư" (before the first answer; after it, the link uses `?conversation=<id>`, covered by the `onConversation` wiring).

- [ ] **Step 2: Run** them — Expected: FAIL.

- [ ] **Step 3: Implement**: panel body becomes `<TutorChat lessonId={lessonId} level=… compact onConversation={setConversationId} />` (add an optional `compact` prop to `TutorChatView` that hides the greeting text and shows two examples instead of four; the level comes from `useEducationLevel` or the page's existing level context — find it with `grep -rn "EducationLevel" frontend/app/\[subject\]/\[lesson\]/page.tsx`); header title uses the lesson title instead of the raw subject slug; add the "Mở ở trang Gia sư" link. Update `AiTutorButton` and `app/[subject]/[lesson]/page.tsx` for the new props. Landing: `<TutorSection href="/tutor" level={level} />`. Delete `useAiChat.ts` and the `api/ai/chat` helper in `lib/api.ts` (`grep -rn "sendChat\|ai/chat" frontend` must return nothing afterwards).

- [ ] **Step 4: Run** the three test files, then `cd .. && npx turbo run typecheck test lint` — Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A frontend
git commit -m "feat(web): tutor entry points — landing, nav and the lesson panel"
```

---

### Task 8: Verify end to end, state, PR

**Files:**
- Modify: `PROJECT_STATE.md` (Next Steps item 1 and a Recent Decisions entry)

- [ ] **Step 1: Run** `npx turbo run typecheck test lint build` from the repo root — Expected: all succeed; note the api/web test counts.
- [ ] **Step 2a: Tutor voice check** — if `backend/.env` has `CLAUDE_API_KEY`, run `cd backend && npx tsx scripts/tutor-eval.ts` and include two or three replies in the report; otherwise record "tutor eval not run".
- [ ] **Step 2: Backend smoke test** (only if `backend/.env` exists locally with a Supabase URL and AI key — never copy or print it): start the backend, and with a real student token `curl -N -X POST localhost:3001/api/tutor/chat -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"message":"Vòng lặp là gì?","language":"vi"}'` — Expected: `event: meta`, several `event: delta`, `event: done`. If no env is available, record "not run" in the report.
- [ ] **Step 3: Update `PROJECT_STATE.md`**: Next Steps 1 → AI Tutor done pending real-account check and `CLAUDE_API_KEY` + `TUTOR_DAILY_LIMIT` on the backend deployment; Recent Decisions entry summarising tables, limit, prompt rules, routes, pages, and what is out of scope.
- [ ] **Step 4: Final review** — dispatch one reviewer over the whole branch (the Review Focus lines above are the checklist); fix findings with a failing test first.
- [ ] **Step 5: Push, open the PR, and ask the user before applying the migration** (`apply_migration` name `tutor_conversations`, then `get_advisors` security).

```bash
git add PROJECT_STATE.md
git commit -m "docs: project state for the AI tutor page"
git push -u origin HEAD
gh pr create --base main --title "feat: AI tutor page" --body "Trang /tutor, API /api/tutor/*, migration tutor_conversations (chưa áp). Spec: docs/superpowers/specs/2026-09-28-ai-tutor-page-design.md"
```
