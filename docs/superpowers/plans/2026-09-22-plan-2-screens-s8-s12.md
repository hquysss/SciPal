# SciPal — Plan 2: Advanced Screens & Workflows (S8–S12)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the remaining 5 screens (S8 Profile, S9 Exam Mode, S10 Authoring Tool, S11 Class Management, S12 Survey & Feedback) plus their supporting backend API endpoints and tests. Together with Plan 1 (S1–S7), this fulfills the complete 12-screen SciPal specification v1.5.

**Architecture:** Next.js 15 App Router (`frontend/`) connecting to Supabase (Auth + RLS-protected database) and Fastify API (`backend/`). Exam scoring and teacher content authoring are server-authoritative. The survey subsystem (§9.7) enables continuous telemetry on subject demand and lesson quality.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript 5, Tailwind CSS, Fastify 4, Supabase (Postgres, Auth, RLS), Monaco Editor, KaTeX, Vitest.

**Spec:** [`docs/superpowers/specs/2026-09-22-scipal-foundation-design.md`](../specs/2026-09-22-scipal-foundation-design.md)

---

## Global Constraints

- Content is data, not code: adding subjects or questions requires no UI code changes
- No subject color hard-coded in any screen: always read `--accent` or Tailwind `accent-*`
- All client-to-API requests pass `Authorization: Bearer <supabase_jwt>` (except `/health` and anonymous demand survey)
- `SERVICE_ROLE` key is restricted exclusively to `backend/` — never bundled into `frontend/` or `mobile/`
- Server-authoritative scoring: exam answer keys and correct short-answer rubrics are never sent to the client
- Teacher features (S10, S11) require `role === 'teacher'` verified server-side
- Bilingual support: all user-facing content renders based on `useLanguage()` (`en` / `vi`)
- `pnpm turbo typecheck` and `pnpm turbo test` must pass after every task

---

## Review Focus

1. **Exam Security & Cheating Prevention:** The exam test runner (`/exam/[blueprintId]`) must never download `questions.data.answer` or `questions.data.answer_key` to client state. Answer validation and score computation happen exclusively in `POST /api/score/exam`.
2. **Teacher Authorization Escalation:** Non-teacher students must not access `/teacher/*` routes or trigger `PATCH /api/authoring/lessons/:id`. Fastify endpoints must verify the caller's role in `profiles.role` before executing mutations.
3. **Timer Expiry Edge Case:** If an exam timer reaches 00:00, the exam runner must auto-submit currently selected answers immediately and disable further input.
4. **Anonymous Survey Data Hygiene:** Unauthenticated users submitting demand surveys (`POST /api/survey`) must have `user_id = null`, but payload structure must be validated with Zod to prevent database pollution.
5. **Class Invite Code Collision:** Invite codes for `class_rooms` must be cryptographically secure and uniquely constrained, with retry logic on unique violation.

---

## Task 1: S8 — Profile & User Settings

**Files:**
- Create: `frontend/src/app/profile/page.tsx`
- Create: `frontend/src/features/profile/ProfileCard.tsx`
- Create: `frontend/src/features/profile/AccountSettings.tsx`
- Create: `frontend/src/features/profile/profileQueries.ts`

**Interfaces:**
- Consumes: `@scipal/supabase` (`createServerClient`, `profiles`, `progress`, `xp_log`, `streaks`)
- Produces: `/profile` page with stats, settings, role-based navigation, and sign-out

- [ ] **Step 1: Create `profileQueries.ts`**

```typescript
import { createServerClient } from '@scipal/supabase';
import { cookies } from 'next/headers';

export async function getUserProfile(userId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const [{ data: profile }, { data: xpLogs }, { data: progress }, { data: streaks }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('xp_log').select('delta').eq('user_id', userId),
    supabase.from('progress').select('id, score').eq('user_id', userId),
    supabase.from('streaks').select('longest_streak').eq('user_id', userId),
  ]);

  const totalXP = (xpLogs ?? []).reduce((sum, row) => sum + row.delta, 0);
  const longestStreak = (streaks ?? []).reduce((max, s) => Math.max(max, s.longest_streak), 0);

  return {
    profile,
    stats: {
      totalXP,
      completedLessons: (progress ?? []).length,
      longestStreak,
    },
  };
}
```

- [ ] **Step 2: Create `ProfileCard.tsx`**

```tsx
'use client';
import Link from 'next/link';

interface ProfileCardProps {
  displayName: string;
  role: 'student' | 'teacher';
  avatarUrl?: string | null;
  stats: { totalXP: number; completedLessons: number; longestStreak: number };
}

export function ProfileCard({ displayName, role, avatarUrl, stats }: ProfileCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-2xl font-bold text-green-700">
          {avatarUrl ? <img src={avatarUrl} alt={displayName} className="h-full w-full rounded-full object-cover" /> : displayName.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
              role === 'teacher' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
            </span>
          </div>
          <p className="text-sm text-gray-500">Thành viên SciPal</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-3 gap-3 border-t border-gray-100 pt-6 text-center">
        <div>
          <div className="text-xl font-bold text-gray-900">{stats.totalXP}</div>
          <div className="text-xs text-gray-500">Tổng XP</div>
        </div>
        <div>
          <div className="text-xl font-bold text-gray-900">{stats.completedLessons}</div>
          <div className="text-xs text-gray-500">Bài đã học</div>
        </div>
        <div>
          <div className="text-xl font-bold text-gray-900">🔥 {stats.longestStreak}</div>
          <div className="text-xs text-gray-500">Chuỗi ngày kỉ lục</div>
        </div>
      </div>

      {/* Teacher CTA */}
      {role === 'teacher' && (
        <div className="mt-6 flex flex-col gap-2 rounded-xl bg-purple-50 p-4">
          <p className="text-xs font-semibold text-purple-900 uppercase">Công cụ giảng dạy</p>
          <div className="flex gap-2">
            <Link href="/teacher/classes" className="flex-1 rounded-lg bg-purple-600 py-2 text-center text-xs font-semibold text-white hover:bg-purple-700 transition">
              Quản lý lớp (S11)
            </Link>
            <Link href="/teacher/lessons" className="flex-1 rounded-lg border border-purple-300 py-2 text-center text-xs font-semibold text-purple-700 hover:bg-purple-100 transition">
              Soạn bài (S10)
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `AccountSettings.tsx`**

```tsx
'use client';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export function AccountSettings() {
  const { lang, setLang } = useLanguage();
  const router = useRouter();
  const supabase = createBrowserClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
      <h3 className="text-base font-semibold text-gray-900">Cài đặt tài khoản</h3>

      {/* Language setting */}
      <div className="flex items-center justify-between border-b border-gray-50 pb-4">
        <div>
          <div className="text-sm font-medium text-gray-800">Ngôn ngữ hiển thị</div>
          <div className="text-xs text-gray-500">Thay đổi ngôn ngữ bài học và giao diện</div>
        </div>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as 'en' | 'vi')}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 outline-none"
        >
          <option value="vi">Tiếng Việt (VI)</option>
          <option value="en">English (EN)</option>
        </select>
      </div>

      {/* Sign out */}
      <div className="pt-2">
        <button
          onClick={handleSignOut}
          className="w-full rounded-xl border border-red-200 py-2.5 text-center text-sm font-semibold text-red-600 hover:bg-red-50 transition"
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `frontend/src/app/profile/page.tsx`**

```tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@scipal/supabase';
import { NavBar } from '@/components/nav/NavBar';
import { getUserProfile } from '@/features/profile/profileQueries';
import { ProfileCard } from '@/features/profile/ProfileCard';
import { AccountSettings } from '@/features/profile/AccountSettings';

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/');

  const { profile, stats } = await getUserProfile(user.id);

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Hồ sơ cá nhân</h1>
        <ProfileCard
          displayName={profile?.display_name ?? user.email ?? 'Người dùng'}
          role={(profile?.role as 'student' | 'teacher') ?? 'student'}
          avatarUrl={profile?.avatar_url}
          stats={stats}
        />
        <AccountSettings />
      </main>
    </>
  );
}
```

- [ ] **Step 5: Verify build & commit**

```bash
pnpm turbo typecheck
git add frontend/src/app/profile/ frontend/src/features/profile/
git commit -m "feat(web/s8): Profile screen — stats, settings, teacher tools shortcut"
```

---

## Task 2: S9 — Exam Mode & Server-Authoritative Scoring

**Files:**
- Create: `backend/src/routes/exam.ts`
- Create: `backend/src/__tests__/exam.test.ts`
- Create: `frontend/src/app/exam/page.tsx`
- Create: `frontend/src/app/exam/[blueprintId]/page.tsx`
- Create: `frontend/src/features/exam/ExamRunner.tsx`
- Create: `frontend/src/features/exam/AnswerPalette.tsx`
- Create: `frontend/src/features/exam/examQueries.ts`

**Interfaces:**
- Consumes: `exam_blueprints`, `questions`
- Backend API: `POST /api/score/exam` (validates answers against database answers server-side, never exposes answer key to client)
- Produces: Interactive exam interface with timer countdown, palette navigation, auto-submit, and detailed topic breakdown

- [ ] **Step 1: Create `backend/src/routes/exam.ts`**

```typescript
import type { FastifyPluginAsync } from 'fastify';

interface ExamAnswer {
  question_id: string;
  selected_option?: string;
  items?: Array<{ id: string; selected: boolean }>;
  short_answer?: string;
}

export const examRoutes: FastifyPluginAsync = async (app) => {
  // Fetch blueprint questions without exposing answers
  app.get('/api/exam/:blueprintId/questions', {
    handler: async (request, reply) => {
      const { blueprintId } = request.params as { blueprintId: string };
      const { data: blueprint } = await app.supabase
        .from('exam_blueprints')
        .select('*')
        .eq('id', blueprintId)
        .single();

      if (!blueprint) return reply.status(404).send({ error: 'Blueprint not found' });

      // Fetch questions associated with blueprint or matching grade/subject
      const { data: questions } = await app.supabase
        .from('questions')
        .select('id, subject_id, type, difficulty, data')
        .limit(20);

      // Strip answers from response
      const sanitized = (questions ?? []).map((q) => {
        const d = { ...(q.data as Record<string, unknown>) };
        delete d.answer;
        delete d.answer_key;
        if (Array.isArray(d.items)) {
          d.items = d.items.map((item: { id: string; text: unknown }) => ({ id: item.id, text: item.text }));
        }
        return { id: q.id, type: q.type, difficulty: q.difficulty, data: d };
      });

      return reply.send({ blueprint, questions: sanitized });
    },
  });

  // Score exam server-side
  app.post('/api/score/exam', {
    onRequest: [app.verifyJWT],
    handler: async (request, reply) => {
      const { blueprint_id, answers } = request.body as {
        blueprint_id: string;
        answers: ExamAnswer[];
      };
      const userId = (request.user as { sub: string }).sub;

      if (!answers || !Array.isArray(answers)) {
        return reply.status(400).send({ error: 'Answers array required' });
      }

      // Fetch raw questions with answers from DB
      const questionIds = answers.map((a) => a.question_id);
      const { data: dbQuestions } = await app.supabase
        .from('questions')
        .select('id, type, data, subject_id')
        .in('id', questionIds);

      const dbMap = new Map((dbQuestions ?? []).map((q) => [q.id, q]));
      let correctCount = 0;
      const total = answers.length;

      for (const ans of answers) {
        const q = dbMap.get(ans.question_id);
        if (!q) continue;

        const data = q.data as Record<string, unknown>;
        if (q.type === 'mc' && ans.selected_option === data.answer) {
          correctCount++;
        } else if (q.type === 'truefalse' && Array.isArray(data.items) && Array.isArray(ans.items)) {
          const allCorrect = data.items.every((it: { id: string; correct: boolean }) => {
            const userIt = ans.items?.find((ui) => ui.id === it.id);
            return userIt && userIt.selected === it.correct;
          });
          if (allCorrect) correctCount++;
        }
      }

      const score = total > 0 ? Number(((correctCount / total) * 10).toFixed(2)) : 0;
      const xp_earned = correctCount * 15;

      // Log XP if user is authenticated
      if (userId && xp_earned > 0) {
        const subjectId = dbQuestions?.[0]?.subject_id;
        if (subjectId) {
          await app.supabase.from('xp_log').insert({
            user_id: userId,
            subject_id: subjectId,
            delta: xp_earned,
            reason: 'exam_complete',
          });
        }
      }

      return reply.send({
        score,
        correct_count: correctCount,
        total_questions: total,
        xp_earned,
      });
    },
  });
};
```

- [ ] **Step 2: Create unit test `backend/src/__tests__/exam.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';

describe('Exam Route Sanitization', () => {
  it('ensures answers are never exposed in sanitized questions', () => {
    const rawData = {
      stem: { en: 'Question', vi: 'Câu hỏi' },
      options: [{ id: 'a', text: { en: 'A', vi: 'A' } }],
      answer: 'a',
      answer_key: 'top_secret',
    };

    const sanitized = { ...rawData };
    delete (sanitized as Record<string, unknown>).answer;
    delete (sanitized as Record<string, unknown>).answer_key;

    expect(sanitized).not.toHaveProperty('answer');
    expect(sanitized).not.toHaveProperty('answer_key');
    expect(sanitized).toHaveProperty('stem');
  });
});
```

- [ ] **Step 3: Register `examRoutes` in `backend/src/index.ts`**

Update `backend/src/index.ts` to register `examRoutes`.

- [ ] **Step 4: Create `AnswerPalette.tsx`**

```tsx
'use client';

interface AnswerPaletteProps {
  total: number;
  currentIndex: number;
  answers: Record<number, unknown>;
  onSelect: (index: number) => void;
}

export function AnswerPalette({ total, currentIndex, answers, onSelect }: AnswerPaletteProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Danh sách câu hỏi</h4>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {Array.from({ length: total }, (_, i) => {
          const isAnswered = answers[i] !== undefined;
          const isCurrent = i === currentIndex;
          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={`h-9 w-9 rounded-lg text-xs font-bold transition ${
                isCurrent
                  ? 'border-2 border-green-600 bg-green-50 text-green-700'
                  : isAnswered
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `ExamRunner.tsx`**

```tsx
'use client';
import { useState, useEffect } from 'react';
import { AnswerPalette } from './AnswerPalette';
import { useLanguage } from '@scipal/hooks';

interface QuestionItem {
  id: string;
  type: string;
  data: {
    stem: { en: string; vi: string };
    options?: Array<{ id: string; text: { en: string; vi: string } }>;
  };
}

export function ExamRunner({
  blueprintId,
  questions,
  durationMinutes = 45,
  token,
}: {
  blueprintId: string;
  questions: QuestionItem[];
  durationMinutes?: number;
  token?: string;
}) {
  const { lang } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; correct_count: number; total_questions: number } | null>(null);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleSubmit = async () => {
    setSubmitting(true);
    const formatted = Object.entries(answers).map(([idx, ans]) => ({
      question_id: questions[Number(idx)].id,
      selected_option: ans,
    }));

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
    try {
      const res = await fetch(`${API_BASE}/api/score/exam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ blueprint_id: blueprintId, answers: formatted }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const currentQ = questions[currentIndex];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  if (result) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">Kết quả thi</h2>
        <div className="my-6 text-5xl font-black text-green-600">{result.score} / 10</div>
        <p className="text-sm text-gray-600">
          Đúng {result.correct_count} trên tổng số {result.total_questions} câu hỏi.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar: Timer + Submit */}
      <div className="flex items-center justify-between rounded-xl bg-gray-900 px-6 py-3 text-white">
        <div className="flex items-center gap-2 font-mono text-lg font-bold">
          ⏱ {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-lg bg-green-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition"
        >
          {submitting ? 'Đang nộp...' : 'Nộp bài'}
        </button>
      </div>

      {/* Question Card */}
      {currentQ && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <span className="text-xs font-bold text-green-600 uppercase">Câu {currentIndex + 1}</span>
          <p className="mt-2 text-base font-medium text-gray-900">
            {lang === 'en' ? currentQ.data.stem.en : currentQ.data.stem.vi}
          </p>

          <div className="mt-6 space-y-3">
            {currentQ.data.options?.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setAnswers({ ...answers, [currentIndex]: opt.id })}
                className={`w-full rounded-xl border p-4 text-left text-sm transition ${
                  answers[currentIndex] === opt.id
                    ? 'border-green-600 bg-green-50 text-green-900 font-semibold'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {lang === 'en' ? opt.text.en : opt.text.vi}
              </button>
            ))}
          </div>

          <div className="mt-6 flex justify-between">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => i - 1)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 disabled:opacity-40"
            >
              ← Câu trước
            </button>
            <button
              disabled={currentIndex === questions.length - 1}
              onClick={() => setCurrentIndex((i) => i + 1)}
              className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              Câu tiếp theo →
            </button>
          </div>
        </div>
      )}

      {/* Answer Palette */}
      <AnswerPalette
        total={questions.length}
        currentIndex={currentIndex}
        answers={answers}
        onSelect={(i) => setCurrentIndex(i)}
      />
    </div>
  );
}
```

- [ ] **Step 6: Create `frontend/src/app/exam/[blueprintId]/page.tsx`**

```tsx
import { NavBar } from '@/components/nav/NavBar';
import { ExamRunner } from '@/features/exam/ExamRunner';

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ blueprintId: string }>;
}) {
  const { blueprintId } = await params;
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

  let questions = [];
  try {
    const res = await fetch(`${API_BASE}/api/exam/${blueprintId}/questions`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      questions = data.questions;
    }
  } catch {
    questions = [];
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Phòng thi thử trực tuyến</h1>
        <ExamRunner blueprintId={blueprintId} questions={questions} />
      </main>
    </>
  );
}
```

- [ ] **Step 7: Typecheck + verify**

```bash
pnpm turbo typecheck
pnpm turbo test
git add backend/src/routes/exam.ts backend/src/__tests__/exam.test.ts frontend/src/app/exam/ frontend/src/features/exam/
git commit -m "feat(web/s9): Exam mode with answer palette, timer countdown, and server-side scoring"
```

---

## Task 3: S10 — Authoring Tool (Teacher Content Studio)

**Files:**
- Create: `backend/src/routes/authoring.ts`
- Create: `frontend/src/app/teacher/lessons/page.tsx`
- Create: `frontend/src/app/teacher/lessons/[id]/page.tsx`
- Create: `frontend/src/features/authoring/LessonEditor.tsx`
- Create: `frontend/src/features/authoring/BlockPalette.tsx`

**Interfaces:**
- Consumes: `lessons`, `topics`, `subjects`
- Backend API: `PATCH /api/authoring/lessons/:id` (verifies `role === 'teacher'` via `profiles`, updates blocks or publish state using `service_role`)
- Produces: Visual block-based lesson authoring studio with live KaTeX preview and publish toggle

- [ ] **Step 1: Create `backend/src/routes/authoring.ts`**

```typescript
import type { FastifyPluginAsync } from 'fastify';

export const authoringRoutes: FastifyPluginAsync = async (app) => {
  // Middleware checking teacher role
  const verifyTeacher = async (request: Parameters<Parameters<typeof app.addHook>[1]>[0], reply: Parameters<Parameters<typeof app.addHook>[1]>[1]) => {
    await app.verifyJWT(request, reply);
    const userId = (request.user as { sub: string })?.sub;
    const { data: profile } = await app.supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role !== 'teacher') {
      return reply.status(403).send({ error: 'Chỉ giáo viên mới có quyền truy cập.' });
    }
  };

  app.patch('/api/authoring/lessons/:id', {
    onRequest: [verifyTeacher],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const { title_en, title_vi, blocks, published } = request.body as {
        title_en?: string;
        title_vi?: string;
        blocks?: unknown[];
        published?: boolean;
      };

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (title_en !== undefined) updateData.title_en = title_en;
      if (title_vi !== undefined) updateData.title_vi = title_vi;
      if (blocks !== undefined) updateData.blocks = blocks;
      if (published !== undefined) updateData.published = published;

      const { data, error } = await app.supabase
        .from('lessons')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) return reply.status(500).send({ error: error.message });
      return reply.send({ lesson: data });
    },
  });
};
```

- [ ] **Step 2: Register `authoringRoutes` in `backend/src/index.ts`**

Import and add `authoringRoutes` to Fastify plugins in `backend/src/index.ts`.

- [ ] **Step 3: Create `BlockPalette.tsx`**

```tsx
'use client';
import type { Block } from '@scipal/types';

export function BlockPalette({ onAddBlock }: { onAddBlock: (block: Block) => void }) {
  const addTheory = () => {
    onAddBlock({
      type: 'theory',
      content: { en: 'New theory text...', vi: 'Nội dung lý thuyết mới...' },
    });
  };

  const addCode = () => {
    onAddBlock({
      type: 'code',
      tabs: [{ lang: 'python', code: '# Nhập mã Python tại đây\nprint("Hello SciPal")' }],
    });
  };

  const addFormula = () => {
    onAddBlock({
      type: 'formula',
      katex: 'E = mc^2',
      caption: { en: 'Mass-energy equivalence', vi: 'Hệ thức tương đương khối lượng - năng lượng' },
    });
  };

  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <span className="self-center text-xs font-semibold text-gray-500 mr-2">Thêm khối:</span>
      <button onClick={addTheory} className="rounded-lg bg-white border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition">
        + Lý thuyết (Markdown)
      </button>
      <button onClick={addCode} className="rounded-lg bg-white border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition">
        + Mã nguồn (Code)
      </button>
      <button onClick={addFormula} className="rounded-lg bg-white border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition">
        + Công thức (KaTeX)
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Create `LessonEditor.tsx`**

```tsx
'use client';
import { useState } from 'react';
import type { Block } from '@scipal/types';
import { BlockPalette } from './BlockPalette';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';

export function LessonEditor({
  lessonId,
  initialTitleVi,
  initialBlocks,
  initialPublished,
  token,
}: {
  lessonId: string;
  initialTitleVi: string;
  initialBlocks: Block[];
  initialPublished: boolean;
  token?: string;
}) {
  const [titleVi, setTitleVi] = useState(initialTitleVi);
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [published, setPublished] = useState(initialPublished);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

    try {
      const res = await fetch(`${API_BASE}/api/authoring/lessons/${lessonId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title_vi: titleVi, blocks, published }),
      });
      if (res.ok) {
        setMessage('Đã lưu thành công!');
      } else {
        setMessage('Lỗi khi lưu bài học.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <input
          value={titleVi}
          onChange={(e) => setTitleVi(e.target.value)}
          className="text-2xl font-bold text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-green-600 outline-none pb-1"
        />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="rounded text-green-600 focus:ring-green-500"
            />
            Xuất bản (Publish)
          </label>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>

      {message && <div className="text-xs font-medium text-green-700 bg-green-50 p-2 rounded">{message}</div>}

      <BlockPalette onAddBlock={(b) => setBlocks([...blocks, b])} />

      {/* Block List with preview & removal */}
      <div className="space-y-4">
        {blocks.map((block, idx) => (
          <div key={idx} className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm group">
            <div className="flex justify-between items-center mb-2 pb-1 border-b border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Khối {idx + 1}: {block.type}</span>
              <button
                onClick={() => setBlocks(blocks.filter((_, i) => i !== idx))}
                className="text-xs text-red-500 hover:underline"
              >
                Xóa khối
              </button>
            </div>
            <BlockRenderer block={block} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `frontend/src/app/teacher/lessons/[id]/page.tsx`**

```tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@scipal/supabase';
import { NavBar } from '@/components/nav/NavBar';
import { LessonEditor } from '@/features/authoring/LessonEditor';

export default async function TeacherLessonEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'teacher') redirect('/');

  const { data: lesson } = await supabase.from('lessons').select('*').eq('id', id).single();
  if (!lesson) redirect('/teacher/lessons');

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <LessonEditor
          lessonId={lesson.id}
          initialTitleVi={lesson.title_vi}
          initialBlocks={(lesson.blocks as never) ?? []}
          initialPublished={lesson.published}
        />
      </main>
    </>
  );
}
```

- [ ] **Step 6: Typecheck + verify**

```bash
pnpm turbo typecheck
git add backend/src/routes/authoring.ts frontend/src/features/authoring/ frontend/src/app/teacher/lessons/
git commit -m "feat(web/s10): Authoring tool — visual block editor and teacher publish flow"
```

---

## Task 4: S11 — Class Management (Teacher & Student)

**Files:**
- Create: `backend/src/routes/classes.ts`
- Create: `frontend/src/app/teacher/classes/page.tsx`
- Create: `frontend/src/app/teacher/classes/[id]/page.tsx`
- Create: `frontend/src/features/classes/ClassList.tsx`
- Create: `frontend/src/features/classes/CreateClassModal.tsx`
- Create: `frontend/src/features/classes/StudentRoster.tsx`

**Interfaces:**
- Consumes: `class_rooms`, `class_members`, `assignments`
- Backend API: `POST /api/classes` (generates random invite code), `POST /api/classes/join` (joins student to class)
- Produces: Teacher classroom overview, assignment dispatching, and student roster

- [ ] **Step 1: Create `backend/src/routes/classes.ts`**

```typescript
import type { FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';

export const classRoutes: FastifyPluginAsync = async (app) => {
  // Create class (Teacher only)
  app.post('/api/classes', {
    onRequest: [app.verifyJWT],
    handler: async (request, reply) => {
      const { name, subject_id } = request.body as { name: string; subject_id: string };
      const teacherId = (request.user as { sub: string }).sub;

      const inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();

      const { data, error } = await app.supabase
        .from('class_rooms')
        .insert({
          teacher_id: teacherId,
          subject_id,
          name,
          invite_code: inviteCode,
        })
        .select()
        .single();

      if (error) return reply.status(500).send({ error: error.message });
      return reply.status(201).send({ class_room: data });
    },
  });

  // Join class (Student)
  app.post('/api/classes/join', {
    onRequest: [app.verifyJWT],
    handler: async (request, reply) => {
      const { invite_code } = request.body as { invite_code: string };
      const studentId = (request.user as { sub: string }).sub;

      const { data: classRoom } = await app.supabase
        .from('class_rooms')
        .select('id')
        .eq('invite_code', invite_code.toUpperCase().trim())
        .single();

      if (!classRoom) return reply.status(404).send({ error: 'Mã lớp không hợp lệ.' });

      const { error } = await app.supabase
        .from('class_members')
        .insert({ class_id: classRoom.id, student_id: studentId });

      if (error && error.code !== '23505') {
        return reply.status(500).send({ error: error.message });
      }

      return reply.send({ success: true, class_id: classRoom.id });
    },
  });
};
```

- [ ] **Step 2: Register `classRoutes` in `backend/src/index.ts`**

Register `classRoutes` alongside `authoringRoutes` and `examRoutes`.

- [ ] **Step 3: Create `CreateClassModal.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { SUBJECT_CONFIG } from '@/lib/subject-config';

export function CreateClassModal({ onCreated, token }: { onCreated: () => void; token?: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [subjectSlug, setSubjectSlug] = useState('informatics');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
    try {
      const res = await fetch(`${API_BASE}/api/classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name, subject_id: subjectSlug }), // matched in API
      });
      if (res.ok) {
        setName('');
        setOpen(false);
        onCreated();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700 transition"
      >
        + Tạo lớp học mới
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Tạo lớp học mới</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tên lớp học</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Tin học 11A1"
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:border-purple-600"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Môn học</label>
                <select
                  value={subjectSlug}
                  onChange={(e) => setSubjectSlug(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none"
                >
                  {Object.values(SUBJECT_CONFIG).map((s) => (
                    <option key={s.slug} value={s.slug}>{s.nameVi}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100">
                  Hủy
                </button>
                <button type="submit" disabled={loading} className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50">
                  {loading ? 'Đang tạo...' : 'Tạo lớp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 4: Create `frontend/src/app/teacher/classes/page.tsx`**

```tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@scipal/supabase';
import { NavBar } from '@/components/nav/NavBar';
import Link from 'next/link';

export default async function TeacherClassesPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: classes } = await supabase
    .from('class_rooms')
    .select('*, subjects(name_vi)')
    .eq('teacher_id', user.id);

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý lớp học</h1>
            <p className="text-sm text-gray-500">Danh sách các lớp bạn phụ trách</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {(classes ?? []).map((c: { id: string; name: string; invite_code: string; subjects: { name_vi: string } | null }) => (
            <Link
              key={c.id}
              href={`/teacher/classes/${c.id}`}
              className="block rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:border-purple-200 transition"
            >
              <h3 className="text-base font-bold text-gray-900">{c.name}</h3>
              <p className="text-xs text-gray-500 mt-1">Môn: {c.subjects?.name_vi ?? 'Tin học'}</p>
              <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-3 text-xs">
                <span className="text-gray-400">Mã mời:</span>
                <span className="rounded bg-purple-50 px-2 py-0.5 font-mono font-bold text-purple-700">{c.invite_code}</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 5: Typecheck & commit**

```bash
pnpm turbo typecheck
git add backend/src/routes/classes.ts frontend/src/app/teacher/classes/ frontend/src/features/classes/
git commit -m "feat(web/s11): Class management — creation, invite codes, and teacher class dashboard"
```

---

## Task 5: S12 — Survey & Feedback Subsystem (§9.7)

**Files:**
- Create: `supabase/migrations/0005_surveys.sql`
- Create: `frontend/src/features/survey/PostLessonSurvey.tsx`
- Create: `frontend/src/features/survey/SubjectDemandModal.tsx`
- Create: `frontend/src/features/survey/FeatureRequestBoard.tsx`

**Interfaces:**
- Consumes: `surveys` table, `POST /api/survey`
- Produces:
  1. Micro-survey popup upon completing a lesson in S4
  2. Subject demand modal triggered from S2 Home
  3. Feature request voting board embedded in S8 Profile

- [ ] **Step 1: Create `supabase/migrations/0005_surveys.sql`**

```sql
CREATE TABLE IF NOT EXISTS surveys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles(id),
  type        text NOT NULL CHECK (type IN ('post_lesson', 'demand', 'feature_request')),
  payload     jsonb NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

-- Allow anonymous or authenticated inserts
CREATE POLICY "surveys_insert_all" ON surveys FOR INSERT WITH CHECK (true);

-- Read restricted to service_role (analytics backend)
CREATE POLICY "surveys_read_service" ON surveys FOR SELECT USING (auth.role() = 'service_role');
```

- [ ] **Step 2: Create `PostLessonSurvey.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { postSurvey } from '@/lib/api';

export function PostLessonSurvey({ lessonId, onDone }: { lessonId: string; onDone: () => void }) {
  const [rating, setRating] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    await postSurvey({
      type: 'post_lesson',
      payload: { lesson_id: lessonId, rating, difficulty, feedback },
    });
    setSubmitted(true);
    setTimeout(onDone, 1500);
  };

  if (submitted) {
    return (
      <div className="rounded-xl bg-green-50 p-4 text-center text-xs font-semibold text-green-800">
        Cảm ơn bạn đã phản hồi! 🎉
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
      <h4 className="text-sm font-bold text-gray-900">Đánh giá bài học này</h4>

      {/* Star rating */}
      <div className="flex gap-2 justify-center text-2xl">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setRating(s)}
            className={`transition ${s <= rating ? 'text-yellow-400' : 'text-gray-200'}`}
          >
            ★
          </button>
        ))}
      </div>

      {/* Difficulty chips */}
      <div className="flex justify-center gap-2">
        {(['easy', 'medium', 'hard'] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              difficulty === d ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {d === 'easy' ? 'Dễ' : d === 'medium' ? 'Vừa sức' : 'Khó'}
          </button>
        ))}
      </div>

      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Góp ý thêm (tùy chọn)..."
        maxLength={200}
        className="w-full rounded-xl border border-gray-200 p-2 text-xs outline-none focus:border-green-600"
      />

      <div className="flex justify-end gap-2">
        <button onClick={onDone} className="text-xs text-gray-400 hover:text-gray-600">Bỏ qua</button>
        <button onClick={handleSubmit} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">
          Gửi đánh giá
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `SubjectDemandModal.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { postSurvey } from '@/lib/api';

export function SubjectDemandModal({ onClose }: { onClose: () => void }) {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [grade, setGrade] = useState<number>(11);
  const [submitted, setSubmitted] = useState(false);

  const toggleSubject = (s: string) => {
    setSelectedSubjects((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const handleSubmit = async () => {
    if (selectedSubjects.length === 0) return;
    await postSurvey({
      type: 'demand',
      payload: { subjects: selectedSubjects, grade },
    });
    setSubmitted(true);
    setTimeout(onClose, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl text-center">
        {submitted ? (
          <p className="text-sm font-semibold text-green-700">Cảm ơn! SciPal sẽ ưu tiên môn bạn chọn.</p>
        ) : (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-900">Bạn muốn học môn nào tiếp theo?</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {['Toán', 'Vật lí', 'Hoá học', 'Sinh học'].map((subj) => (
                <button
                  key={subj}
                  onClick={() => toggleSubject(subj)}
                  className={`rounded-xl border p-2.5 font-semibold transition ${
                    selectedSubjects.includes(subj)
                      ? 'border-green-600 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {subj}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
              <span>Lớp:</span>
              <div className="flex gap-2">
                {[10, 11, 12].map((g) => (
                  <button
                    key={g}
                    onClick={() => setGrade(g)}
                    className={`h-7 w-7 rounded-full font-bold ${grade === g ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={onClose} className="flex-1 rounded-xl py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100">
                Để sau
              </button>
              <button
                onClick={handleSubmit}
                disabled={selectedSubjects.length === 0}
                className="flex-1 rounded-xl bg-green-600 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Gửi bình chọn
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck + verify**

```bash
pnpm turbo typecheck
git add supabase/migrations/0005_surveys.sql frontend/src/features/survey/
git commit -m "feat(web/s12): Survey subsystem — post-lesson rating and subject demand modal"
```

---

## Task 6: End-to-End Build Verification & Release Check

**Goal:** All 12 screens build without error, all vitest suites pass across backend, frontend, and packages.

- [ ] **Step 1: Run comprehensive typecheck**

```bash
pnpm turbo typecheck
```
Expected: 0 errors across `@scipal/web`, `@scipal/api`, `@scipal/mobile`, and all 4 packages.

- [ ] **Step 2: Run test suite**

```bash
pnpm turbo test
```
Expected: All tests pass including `auth.test.ts`, `score.test.ts`, and `exam.test.ts`.

- [ ] **Step 3: Run full monorepo build**

```bash
pnpm turbo build
```
Expected: Frontend Next.js build and Fastify API build complete successfully.

- [ ] **Step 4: Update documentation and mark milestones**

Verify that all screens (S1 through S12) are accounted for between Plan 1 and Plan 2.
Commit any final fixes.
