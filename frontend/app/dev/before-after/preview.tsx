'use client';

import { useEffect, useState } from 'react';
import { InteractiveRenderer } from '@/components/blocks/InteractiveRenderer';
import { SimulationEditor, newSimulationBlock } from '@/features/simulations/SimulationEditor';
import { BUTTON } from '@/features/simulations/controls';
import type { InteractiveBlock } from '@scipal/types';

export function BeforeAfterPreview() {
  const [block, setBlock] = useState<InteractiveBlock>(() => newSimulationBlock('before-after'));
  // Stand-in pictures from the app's own files, only to try the divider; real pairs come from teachers.
  useEffect(() => {
    const picture = (path: string, vi: string, en: string) => ({ image_url: `${window.location.origin}${path}`, label: { vi, en }, alt: { vi, en }, caption: { vi: '', en: '' }, source: { vi: 'SciPal', en: 'SciPal' } });
    setBlock((b) => ({ ...b, config: { before: picture('/models/history/viet-nam/land.png', 'Đất liền', 'Land'), after: picture('/models/history/viet-nam/relief.jpg', 'Địa hình', 'Relief') } }));
  }, []);
  const [lang, setLang] = useState<'vi' | 'en'>('vi');
  return <div className="flex flex-col gap-5">
    <button type="button" className={`${BUTTON} self-start`} onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}>{lang === 'vi' ? 'English' : 'Tiếng Việt'}</button>
    <InteractiveRenderer block={block} lang={lang} />
    <details className="rounded-lg border border-line bg-surface p-4"><summary className="cursor-pointer text-ink">{lang === 'vi' ? 'Thiết lập trong Studio' : 'Studio settings'}</summary><div className="mt-4"><SimulationEditor block={block} onChange={setBlock} lang={lang} onLangChange={setLang} /></div></details>
  </div>;
}
