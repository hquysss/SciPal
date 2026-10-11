// Runs billing.sql on an in-process PostgreSQL (PGlite). Usage: npm i --no-save @electric-sql/pglite (once, in this folder), then node check-sql.mjs
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
function expand(path) {
 return readFileSync(path, 'utf8').split(String.fromCharCode(13)).join('').split(String.fromCharCode(10)).map(line => {
  const clean = line.replaceAll(String.fromCharCode(92), '');
  if (clean.startsWith('set ON_ERROR')) return '';
  if (clean.startsWith('ir ')) return expand(resolve(dirname(path), clean.slice(3).trim()));
  if (clean.includes('gexec')) return clean.slice(clean.indexOf("'") + 1, clean.indexOf("' where")) + ';';
  if (line.trim().charCodeAt(0) === 92) return '';
  return line;
 }).join(String.fromCharCode(10));
}
const db = new PGlite();
try {
 await db.exec(expand(resolve(dirname(fileURLToPath(import.meta.url)), 'billing.sql')));
 console.log('Existing billing SQL passed');
} catch (error) { console.error(error.message, error.where ?? ''); process.exitCode = 1; }
finally { await db.close(); }
