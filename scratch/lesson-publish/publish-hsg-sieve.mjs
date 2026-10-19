// Nạp 16 bài lập trình Sàng nguyên tố vào Bồi dưỡng HSG Tin (câu `code`, data.track = 'hsg').
// rows.json do hsg_tests.py sinh (test đã đối chiếu với lời giải C++ độc lập). Chép vào backend/publish-hsg-sieve.tmp.mjs rồi chạy từ backend/:
//   ROWS=<đường dẫn rows.json> npx tsx publish-hsg-sieve.tmp.mjs            (kiểm tra, không ghi)
//   ROWS=<đường dẫn rows.json> npx tsx publish-hsg-sieve.tmp.mjs --publish  (ghi)
import fs from 'node:fs/promises';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { validateQuestionInput } from './src/schemas/questions.ts';

dotenv.config({ path: new URL('./.env', import.meta.url) });
const rows = JSON.parse(await fs.readFile(process.env.ROWS, 'utf8'));
const write = process.argv.includes('--publish');
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const checked = (r) => { if (r.error) throw new Error(r.error.message); return r.data; };

const HSG_KEYS = ['track', 'order', 'problem_code', 'tags', 'source'];
for (const row of rows) {
  // The authoring schema checks the judge fields; the HSG fields ride alongside it.
  const core = Object.fromEntries(Object.entries(row.data).filter(([k]) => !HSG_KEYS.includes(k)));
  const v = validateQuestionInput({ type: 'code', usage: 'practice', subject_id: '00000000-0000-4000-8000-000000000000', lesson_id: null, difficulty: row.difficulty, data: core });
  if (!v.ok) throw new Error(`${row.data.problem_code}: ${v.message.vi}`);
}
console.log(`${rows.length} bài hợp lệ theo schema câu code.`);

const subject = checked(await db.from('subjects').select('id').eq('slug', 'informatics').single());
const existing = checked(await db.from('questions').select('id, data->>problem_code').eq('type', 'code').eq('data->>track', 'hsg'));
const have = new Set(existing.map((r) => r.problem_code));
const fresh = rows.filter((r) => !have.has(r.data.problem_code));
console.log(`Đã có ${have.size} bài HSG; sẽ thêm ${fresh.length}.`);
if (!write) process.exit(0);

const now = new Date().toISOString();
const inserted = checked(
  await db
    .from('questions')
    .insert(fresh.map((r) => ({ subject_id: subject.id, type: 'code', usage: 'practice', lesson_id: null, difficulty: r.difficulty, data: r.data, status: 'published', created_at: now })))
    .select('id, data->>problem_code'),
);
console.log(`Đã nạp ${inserted.length} bài:`, inserted.map((r) => r.problem_code).join(', '));
