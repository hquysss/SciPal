// Render cả 4 bản: node render.mjs [id...]
import { execSync } from 'node:child_process';
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['vi-wide', 'vi-tall', 'en-wide', 'en-tall'];
for (const id of ids) execSync(`npx remotion render src/index.ts trailer-${id} out/scipal-trailer-${id}.mp4 --codec h264 --crf 22 --concurrency 6`, { stdio: 'inherit' });
