/**
 * One-time script to grant admin role to a user.
 * Usage: pnpm --filter @scipal/api tsx scripts/seed-admin.ts <email_or_uuid>
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const target = process.argv[2];
if (!target) {
  console.error('Usage: tsx scripts/seed-admin.ts <email_or_uuid>');
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(url, key);

// Resolve email → UUID if necessary
let userId = target;
const isEmail = target.includes('@');
if (isEmail) {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) { console.error('listUsers error:', error.message); process.exit(1); }
  const found = data.users.find((u) => u.email === target);
  if (!found) { console.error(`No user with email: ${target}`); process.exit(1); }
  userId = found.id;
}

const { data, error } = await supabase.auth.admin.updateUserById(userId, {
  app_metadata: { app_role: 'admin' },
});

if (error) {
  console.error('Failed to set admin role:', error.message);
  process.exit(1);
}

console.log(`✅ app_role set to 'admin' for user: ${data.user.email ?? userId}`);
