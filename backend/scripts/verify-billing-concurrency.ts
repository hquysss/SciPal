import { execFile } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const databaseUrl = process.env.SCIPAL_BILLING_TEST_DATABASE_URL;
if (process.env.SCIPAL_BILLING_TEST_APPROVED !== 'true' || !databaseUrl) {
  throw new Error('Set the explicit billing test database confirmation and connection URL first.');
}

let parsedUrl: URL;
try {
  parsedUrl = new URL(databaseUrl);
} catch {
  throw new Error('The billing test database URL is invalid.');
}
const host = parsedUrl.hostname;
const database = decodeURIComponent(parsedUrl.pathname.replace(/^\//, ''));
if (!['localhost', '127.0.0.1', '::1'].includes(host) || !database.startsWith('scipal_test')) {
  throw new Error('Billing concurrency checks only run on a loopback scipal_test database.');
}

const connection = {
  host,
  port: parsedUrl.port || '5432',
  user: decodeURIComponent(parsedUrl.username),
  password: decodeURIComponent(parsedUrl.password),
  database,
};

async function query(sql: string): Promise<{ stdout: string; stderr: string }> {
  const { stdout, stderr } = await execFileAsync('psql', [
    '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1',
    '--host', connection.host,
    '--port', connection.port,
    '--username', connection.user,
    '--dbname', connection.database,
    '-c', sql,
  ], {
    env: {
      PATH: process.env.PATH ?? process.env.Path,
      SystemRoot: process.env.SystemRoot,
      WINDIR: process.env.WINDIR,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      PGPASSWORD: connection.password,
      PGCONNECT_TIMEOUT: '5',
    },
    timeout: 30000,
    windowsHide: true,
  });
  return { stdout: stdout.trim(), stderr };
}

function literal(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

const userA = '00000000-0000-4000-8000-000000000001';
const userB = '00000000-0000-4000-8000-000000000002';
await query(`
  delete from public.quota_operations where user_id = '${userA}';
  delete from public.quota_usage where user_id = '${userA}' and metric = 'tutor_requests';
  insert into public.account_quota_overrides (user_id, metric, limit_value, expires_at, version)
  values ('${userA}', 'tutor_requests', 1, null, 1)
  on conflict (user_id, metric) do update
    set limit_value = excluded.limit_value, expires_at = null, version = excluded.version;
`);

const outcomes = await Promise.all(Array.from({ length: 20 }, async () => {
  const operationId = randomUUID();
  const requestHash = createHash('sha256').update(operationId).digest('hex');
  const sql = `set role service_role; select public.billing_reserve_quota('${userA}', 'tutor_requests', '${operationId}', '${requestHash}', 1); reset role`;
  try {
    const result = await query(sql);
    return { success: true, result: result.stdout };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const stderr = typeof error === 'object' && error !== null && 'stderr' in error ? String(error.stderr) : '';
    const details = `${message} ${stderr}`;
    if (details.includes('QUOTA_EXCEEDED')) return { success: false, exhausted: true };
    throw new Error('A billing concurrency request failed for a reason other than quota exhaustion.');
  }
}));

const successful = outcomes.filter((outcome) => outcome.success);
const exhausted = outcomes.filter((outcome) => 'exhausted' in outcome && outcome.exhausted);
if (successful.length !== 1 || exhausted.length !== 19) {
  throw new Error(`Expected 1 reservation and 19 quota rejections; got ${successful.length} and ${exhausted.length}.`);
}

const isolation = await query(`
  select coalesce(q.used, 0)::text || ',' || coalesce(q.reserved, 0)::text
    from (select 1) as seed
    left join public.quota_usage as q
      on q.user_id = '${userB}'
     and q.metric = 'tutor_requests'
     and q.period_start = pg_catalog.date_trunc('month', pg_catalog.clock_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date;
`);
if (isolation.stdout !== '0,0') {
  throw new Error('Quota usage for one account appeared in another account.');
}

process.stdout.write('Billing concurrency verified: 1 reservation, 19 rejections, isolated accounts.\n');
