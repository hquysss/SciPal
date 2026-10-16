'use client';

import { useState } from 'react';
import { InteractiveRenderer } from '@/components/blocks/InteractiveRenderer';
import { SimulationEditor, newSimulationBlock } from '@/features/simulations/SimulationEditor';
import { BUTTON } from '@/features/simulations/controls';
import type { InteractiveBlock } from '@scipal/types';
import sumTrace from '@/features/simulations/__fixtures__/code-trace-sum.json';
import fnTrace from '@/features/simulations/__fixtures__/code-trace-fn-error.json';

const PAGE = {
  html: `<header>
  <h1>Lớp 12A</h1>
</header>
<ul>
  <li>Toán</li>
  <li>Tin học</li>
  <li>Vật lí</li>
</ul>
<p>Xem <a href="#">thời khoá biểu</a>.</p>`,
  css: `header {
  background: tomato;
  padding: 8px;
}
h1 {
  color: white;
  margin: 0;
}
li {
  color: seagreen;
  font-weight: bold;
}`,
};
// The longest list a lesson may give (32 values), to see the stage at phone width.
const LONG = [27, 3, 18, 31, 9, 14, 1, 22, 30, 6, 12, 25, 4, 19, 28, 10, 2, 16, 23, 8, 29, 13, 5, 20, 26, 11, 32, 7, 17, 24, 15, 21];

function Sim({ initial, lang, onLangChange }: { initial: InteractiveBlock; lang: 'vi' | 'en'; onLangChange: (lang: 'vi' | 'en') => void }) {
  const [block, setBlock] = useState(initial);
  return (
    <section className="flex flex-col gap-3">
      <InteractiveRenderer block={block} lang={lang} />
      <details className="rounded-lg border border-line bg-surface p-4">
        <summary className="cursor-pointer text-ink">{lang === 'vi' ? 'Thiết lập trong Studio' : 'Studio settings'}</summary>
        <div className="mt-4">
          <SimulationEditor block={block} onChange={setBlock} lang={lang} onLangChange={onLangChange} />
        </div>
      </details>
    </section>
  );
}

export function InformaticsPreview() {
  const [lang, setLang] = useState<'vi' | 'en'>('vi');
  return (
    <div className="flex flex-col gap-8">
      <button type="button" className={`${BUTTON} self-start`} onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}>
        {lang === 'vi' ? 'English' : 'Tiếng Việt'}
      </button>
      <Sim initial={{ ...newSimulationBlock('algorithm-sim'), config: { algorithm: 'bubble-sort', values: LONG, target: 17 } }} lang={lang} onLangChange={setLang} />
      <Sim initial={newSimulationBlock('complexity-sim')} lang={lang} onLangChange={setLang} />
      <Sim initial={{ ...newSimulationBlock('code-trace'), config: sumTrace }} lang={lang} onLangChange={setLang} />
      <Sim initial={{ ...newSimulationBlock('code-trace'), config: fnTrace }} lang={lang} onLangChange={setLang} />
      <Sim initial={{ ...newSimulationBlock('web-preview'), config: PAGE }} lang={lang} onLangChange={setLang} />
    </div>
  );
}
