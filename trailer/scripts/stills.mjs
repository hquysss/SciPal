// Xem trước: node scripts/stills.mjs <id> <frame...> → out/<id>-<frame>.png (bundle một lần)
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
const [id, ...frames] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: 'src/index.ts' });
const composition = await selectComposition({ serveUrl, id: `trailer-${id}` });
for (const f of frames) {
  await renderStill({ serveUrl, composition, frame: Number(f), output: `out/${id}-${f}.png`, scale: 0.5 });
  console.log(`out/${id}-${f}.png`);
}
