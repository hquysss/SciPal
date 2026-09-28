# AI Tutor page

## Goal

A student asks the tutor at any time, from the landing page ("Thử ngay") or from a lesson, and
gets a streamed answer that **hints step by step so the student works out the rest** (the promise
of the landing `TutorSection`). Answers are in Vietnamese or English and pitched to the student's
education level. Conversations are kept so the student can return to them. Cost stays bounded.

Today the lesson panel (`frontend/features/ai-tutor/`) calls `POST /api/ai/chat`, which does not
exist, so it always fails. `backend/src/providers/ai.ts` has Claude/OpenAI providers that nothing uses.

Decisions from the user: sign-in required; conversations saved with a list; text input only
(markdown, formulas and code in answers). Out of scope: image input, teachers reading students'
conversations, automatic deletion of old conversations.

## Architecture

The Fastify backend calls the model, streams the reply to the browser (SSE) and writes both
messages to Supabase. AI keys stay in `backend/.env` (invariant 5); Next.js never calls a model.

## Data (migration `20260928120000_tutor_conversations.sql`)

- `tutor_conversations`: `id uuid pk`, `user_id uuid not null` → `auth.users` on delete cascade,
  `title text not null` (≤ 80 characters), `lesson_id uuid null` → `lessons` on delete set null,
  `created_at`, `updated_at` (bumped on each message). Index `(user_id, updated_at desc)`.
- `tutor_messages`: `id uuid pk`, `conversation_id` → `tutor_conversations` on delete cascade,
  `user_id uuid not null` (copied from the conversation, for the daily count), `role text` check
  in (`user`, `assistant`), `content text not null` (≤ 20000 characters), `created_at`.
  Indexes `(conversation_id, created_at)` and `(user_id, created_at) where role = 'user'`.
- RLS on both tables: `select` only where `user_id = auth.uid()`; no insert, update or delete for
  `authenticated` or `anon`. The backend (service role) writes; deleting goes through the API.
- Students may delete their own conversations; nothing is deleted automatically.

## API (`backend/src/routes/tutor.ts`; every route needs a signed-in user)

### `POST /api/tutor/chat`

Body `{ conversation_id?, message, lesson_id?, language: 'vi' | 'en' }`.

1. Validate: message 1–2000 characters after trimming; the conversation, if given, belongs to the
   user (otherwise 404); the lesson, if given, is published (otherwise 404).
2. Daily limit: count the user's `role = 'user'` messages since 00:00 Asia/Ho_Chi_Minh. At
   `TUTOR_DAILY_LIMIT` (env, default 30) answer 429 with a bilingual message and `remaining: 0`.
3. Create the conversation if none was given (title = first 60 characters of the message, with
   the lesson id when given) and store the user message.
4. Model input: the system prompt plus the conversation's last 20 messages.
5. Stream SSE events: `meta { conversation_id, remaining }`, then `delta { text }` chunks, then
   `done`. A provider error mid-stream sends `error { error, error_en }` and ends the stream.
6. Store the assistant message with the full text. If the client disconnects or the provider
   fails after some text arrived, store that partial text; store nothing if no text arrived.

### Conversation routes

- `GET /api/tutor/conversations?page=` → the user's conversations, newest first
  (`id, title, lesson_id, updated_at`), 50 per page.
- `GET /api/tutor/conversations/:id` → the conversation and its messages; 404 if not the user's.
- `DELETE /api/tutor/conversations/:id` → 204; 404 if not the user's.

Errors are `{ error, error_en }`, as in the authoring routes.

### System prompt (`backend/src/tutor/systemPrompt.ts`, a pure tested function)

- Role: the SciPal tutor for Vietnamese students following the GDPT 2018 curriculum.
- The tutor behaves like a private tutor in a session, not an answer engine:
  1. **Find where the student is** before teaching: if the question is vague, ask one question
     (which exercise, how far they got, where they are stuck).
  2. **Name the misconception**, not just "wrong" (e.g. "Em đang nghĩ `range(5)` chạy tới 5…").
  3. **One move per turn**: a single hint or a single question, then stop and wait.
  4. **Hints escalate**: a direction, then a specific hint, then a worked step. After the student
     asks for the solution twice, give it with each step explained.
  5. **Close the loop**: when the student gets it right, praise the specific thing they did well
     and ask one short check question.
- Voice: in Vietnamese the tutor calls itself **"thầy"** and the student **"em"** (one constant,
  `TUTOR_SELF`, if it should become "cô"); in English "I" and "you". Warm, no empty praise, no
  filler. Usually 3–6 sentences; longer only when the student asks.
- Worked examples: 2–3 short example exchanges live in `backend/src/tutor/examples.ts` and are
  appended to the system prompt (e.g. buggy loop → "Em thử in giá trị `i` ở mỗi vòng xem nó chạy
  tới đâu?"; a student demanding the answer; a correct answer followed by a check question).
- Quality check: `backend/scripts/tutor-eval.ts` sends ~10 scripted situations (asks for the
  answer at once, answers wrongly, goes off topic, gets it right, vague question, primary vs upper
  secondary) to the real model and prints the replies for a human to read. Run by hand when the
  prompt changes; not part of CI.
- Language: the requested one. Level: `profiles.preferred_education_level` (primary, lower
  secondary, upper secondary) sets vocabulary and depth; upper secondary when unset.
- Scope: school learning only; refuse unsafe or unrelated requests briefly and kindly.
- Format: markdown, `$…$` and `$$…$$` for formulas, fenced code blocks with a language.
- Lesson context when `lesson_id` is given: subject, lesson title, and the text of its theory,
  code and formula blocks, truncated to 6000 characters. **Quiz blocks, question data, `answer`
  and `answer_key` are never included** (invariant 4); a test asserts it.

### Provider

`providers/ai.ts`: one OpenAI-SDK client for two services, chosen by `AI_PROVIDER` — `gemini`
(default, through Gemini's OpenAI-compatible endpoint, key `GEMINI_API_KEY`, model
`gemini-3.8-flash`) or `openai` (key `OPENAI_API_KEY`, model `gpt-4o-mini`). `TUTOR_MODEL` overrides
the model. Claude was dropped on 28/09 for cost. `max_tokens` 1024. The provider is decorated on the
Fastify app (built on the first question) so tests inject a fake one.

## Web

### `/tutor` page (`frontend/app/tutor/page.tsx`, components in `frontend/features/ai-tutor/`)

- The server page checks the session; signed-out visitors go to `/login?redirect=%2Ftutor`.
- Layout: the conversation list on the left on desktop, a drawer on phones (a "Hội thoại"
  button). "Hội thoại mới" sits at the top of the list; each item shows its title and a delete
  action with a confirmation.
- Chat: messages are rendered with `react-markdown`, `remark-gfm`, `remark-math` and
  `rehype-katex` (already dependencies); code blocks use the existing tokens.
- Empty state: a short greeting and 3–4 example questions chosen by education level; clicking one
  sends it.
- Composer: a textarea where Enter sends and Shift+Enter adds a line, a character counter shown
  near the 2000 limit, a "Dừng" button while streaming (aborts the request), and
  "Còn n lượt hôm nay".
- States: loading history, streaming, provider error (message with "Thử lại"), daily limit
  reached (composer disabled, with when it resets), session expired.
- `?conversation=<id>` opens a conversation; `?lesson=<id>` starts a new one about that lesson.
- Lesson picker ("Hỏi về bài"): on a new, empty chat the student may pick a subject and one of
  its published lessons; the first question then carries that `lesson_id`, so the answer uses
  the lesson's theory (same path as asking from a lesson). The lesson is fixed for the whole
  conversation and shown as a chip above the messages. The server page loads the published
  lessons (`id, title_vi, title_en, grade, subject`) once; no new API.
- Visual design follows the education-level tokens (no hard-coded colours, no `--accent` on
  `:root`). A dev mock view (`/dev/tutor-showcase`) covers the states for review at 375 and
  1280 px, light and dark.

### Shared client code

- `streamTutor.ts`: POSTs to `/api/tutor/chat` with the session token and turns the SSE events
  into callbacks. Its parser is a pure function, tested with events split across chunks.
- `useTutorChat({ conversationId?, lessonId? })`: messages, send, stop, remaining, error; used by
  the page and the lesson panel.
- The lesson panel (`AiTutorPanel`) switches to `useTutorChat` with the lesson id and gains a
  "Mở ở trang Gia sư" link (`/tutor?conversation=<id>`). The old `useAiChat` hook and the chat
  helper in `lib/api.ts` are removed.

### Entry points

- The landing `TutorSection` gets `href="/tutor"`, so its "Thử ngay" button appears.
- Nav: "Gia sư AI" for signed-in users.

## Later (not in this round)

- Retrieval over all published lessons (pgvector embeddings, re-embedded on publish) for free
  questions without a picked lesson — once there is enough content to make it worthwhile.
- A model router (cheap model by default, a stronger one for hard questions), decided from
  `tutor-eval` results and real questions; the `AIProvider` interface already allows it.
- Voice conversations (real-time audio), with its own privacy and cost review.
- Model names and prices for other providers are checked against official docs before use.

## Invariants kept

- AI keys only in `backend/.env`; the web only calls the backend.
- No answer or answer key reaches the model prompt or the client.
- Bilingual interface and error messages.
- Students see only their own conversations (RLS and API checks).

## Testing

- Backend (fake provider, Supabase mock): sign-in required; daily limit (429 at the limit, the
  count uses the Vietnam day); message length; another user's conversation is 404; a new
  conversation gets its title; both messages are stored; a partial answer is stored on
  disconnect; SSE event order; the system prompt carries level, language and lesson theory but
  never quiz or answer data.
- Migration checked on Supabase inside a rolled-back transaction: the owner reads, other users and
  `anon` read nothing, no direct writes.
- Web: the SSE parser; `useTutorChat` state changes; render tests for the empty state, limit
  reached, error, and markdown/formula/code messages; no raw colours.
- Browser check of the mock view at 375 and 1280 px, light and dark.
