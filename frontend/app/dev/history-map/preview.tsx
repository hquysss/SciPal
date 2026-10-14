'use client';

import { useState } from 'react';
import { InteractiveRenderer } from '@/components/blocks/InteractiveRenderer';
import { SimulationEditor, newSimulationBlock } from '@/features/simulations/SimulationEditor';
import { BUTTON } from '@/features/simulations/controls';
import type { InteractiveBlock } from '@scipal/types';

export function HistoryMapPreview() {
  const [block, setBlock] = useState<InteractiveBlock>(() => newSimulationBlock('history-map'));
  const [lang, setLang] = useState<'vi' | 'en'>('vi');
  return <div className="flex flex-col gap-5">
    <button type="button" className={`${BUTTON} self-start`} onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}>{lang === 'vi' ? 'English' : 'Tiếng Việt'}</button>
    <InteractiveRenderer block={block} lang={lang} />
    <details className="rounded-lg border border-line bg-surface p-4"><summary className="cursor-pointer text-ink">{lang === 'vi' ? 'Thiết lập trong Studio' : 'Studio settings'}</summary><div className="mt-4"><SimulationEditor block={block} onChange={setBlock} lang={lang} onLangChange={setLang} /></div></details>
  </div>;
}
