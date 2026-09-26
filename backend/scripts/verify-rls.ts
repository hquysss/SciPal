/**
 * Probe live RLS with the anon key and a TEST student account.
 * Usage (bash):
 *   SUPABASE_ANON_KEY=... RLS_TEST_EMAIL=... RLS_TEST_PASSWORD=... \
 *     pnpm --filter @scipal/api exec tsx scripts/verify-rls.ts
 * SUPABASE_URL is read from backend/.env. Use a throwaway student account
 * created in /admin/accounts — never a real user's credentials.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const email = process.env.RLS_TEST_EMAIL;
const password = process.env.RLS_TEST_PASSWORD;

if (!url || !anonKey || !email || !password) {
  console.error('Missing SUPABASE_URL, SUPABASE_ANON_KEY, RLS_TEST_EMAIL or RLS_TEST_PASSWORD.');
  process.exit(1);
}

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
const check = (name: string, ok: boolean, detail?: string) => results.push({ name, ok, detail });
const options = { auth: { persistSession: false, autoRefreshToken: false } };

// Anonymous visitor
const anon = createClient(url, anonKey, options);
const questions = await anon.from('questions').select('id, data').limit(1);
check('anon cannot read questions', Boolean(questions.error) || (questions.data ?? []).length === 0, questions.error?.message);
const subjects = await anon.from('subjects').select('id').limit(1);
check('anon can read subjects', !subjects.error, subjects.error?.message);
const anonSurvey = await anon.from('surveys').insert({ type: 'demand', payload: { probe: true } });
check('anon cannot insert surveys directly', Boolean(anonSurvey.error));

// Signed-in test student
const client = createClient(url, anonKey, options);
const signIn = await client.auth.signInWithPassword({ email, password });
if (signIn.error || !signIn.data.user) {
  console.error('Test account sign-in failed:', signIn.error?.message);
  process.exit(1);
}
const uid = signIn.data.user.id;

const subjectRow = await client.from('subjects').select('id').limit(1).single();
const xpInsert = await client.from('xp_log').insert({
  user_id: uid,
  subject_id: subjectRow.data?.id,
  delta: 999,
  reason: 'rls_probe',
});
check('user cannot insert xp_log', Boolean(xpInsert.error));

const xpRead = await client.from('xp_log').select('delta').eq('user_id', uid);
check('user can still read own xp_log', !xpRead.error, xpRead.error?.message);

const roleUpdate = await client.from('profiles').update({ role: 'teacher' }).eq('id', uid);
check('user cannot change profiles.role', Boolean(roleUpdate.error));

const profile = await client.from('profiles').select('preferred_education_level').eq('id', uid).single();
const levelUpdate = await client
  .from('profiles')
  .update({ preferred_education_level: profile.data?.preferred_education_level ?? null })
  .eq('id', uid);
check('user can still save education level', !levelUpdate.error, levelUpdate.error?.message);

const rooms = await client.from('class_rooms').select('id').limit(1);
check('class_rooms select has no policy recursion', !rooms.error, rooms.error?.message);
const members = await client.from('class_members').select('class_id').limit(1);
check('class_members select has no policy recursion', !members.error, members.error?.message);

await client.auth.signOut();

for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  (${r.detail})` : ''}`);
}
process.exit(results.every((r) => r.ok) ? 0 : 1);
