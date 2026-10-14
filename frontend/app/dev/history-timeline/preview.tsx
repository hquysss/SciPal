'use client';

import { useState } from 'react';
import { InteractiveRenderer } from '@/components/blocks/InteractiveRenderer';
import { SimulationEditor, newSimulationBlock } from '@/features/simulations/SimulationEditor';
import { BUTTON } from '@/features/simulations/controls';
import type { InteractiveBlock } from '@scipal/types';

const FIGURE = {
  image_url: 'https://pub-18da27e4214544ea925f840aeb35b9e6.r2.dev/5c032928-5f3e-4db0-9a2a-cef3e03c4451/f0c24068-d5de-4963-97aa-a426d8529846.png',
  alt: { vi: 'Sơ đồ Hình 2', en: 'Figure 2 diagram' },
  caption: { vi: 'Hình 2. Sơ đồ sự xác lập của chủ nghĩa tư bản ở châu Âu và Bắc Mỹ (SGK Lịch sử 11, tr.12)', en: 'Figure 2' },
};

export function HistoryTimelinePreview() {
  const [block, setBlock] = useState<InteractiveBlock>(() => {
    const block = newSimulationBlock('history-timeline');
    // Bài 2's textbook figure, already in lesson media.
    return { ...block, config: { ...block.config, figure: FIGURE } };
  });
  const [lang, setLang] = useState<'vi' | 'en'>('vi');
  return <div className="flex flex-col gap-5">
    <button type="button" className={`${BUTTON} self-start`} onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}>{lang === 'vi' ? 'English' : 'Tiếng Việt'}</button>
    <InteractiveRenderer block={block} lang={lang} />
    <details className="rounded-lg border border-line bg-surface p-4"><summary className="cursor-pointer text-ink">{lang === 'vi' ? 'Thiết lập trong Studio' : 'Studio settings'}</summary><div className="mt-4"><SimulationEditor block={block} onChange={setBlock} lang={lang} onLangChange={setLang} /></div></details>
  </div>;
}
