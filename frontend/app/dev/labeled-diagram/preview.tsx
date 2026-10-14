'use client';

import { useState } from 'react';
import { InteractiveRenderer } from '@/components/blocks/InteractiveRenderer';
import { SimulationEditor, newSimulationBlock } from '@/features/simulations/SimulationEditor';
import { BUTTON } from '@/features/simulations/controls';
import type { InteractiveBlock } from '@scipal/types';

const IMAGE = 'https://pub-18da27e4214544ea925f840aeb35b9e6.r2.dev/5c032928-5f3e-4db0-9a2a-cef3e03c4451/ae5a94bb-f8ff-48fc-89ea-5100521c9173.jpg';
const LABELS = [{"id": "l1", "x": 0.57, "y": 0.25, "text": {"vi": "Bể dầu Standard Oil", "en": "Standard Oil tank"}}, {"id": "l2", "x": 0.6, "y": 0.42, "text": {"vi": "Bạch tuộc – độc quyền", "en": "Octopus – the monopoly"}}, {"id": "l3", "x": 0.885, "y": 0.37, "text": {"vi": "Vòi quấn Quốc hội Mỹ", "en": "Grip on Congress"}}, {"id": "l4", "x": 0.11, "y": 0.37, "text": {"vi": "Vòi quấn chính quyền bang", "en": "Grip on a state house"}}, {"id": "l5", "x": 0.235, "y": 0.21, "text": {"vi": "Vòi quấn ngành vận tải biển", "en": "Grip on shipping"}}, {"id": "l6", "x": 0.67, "y": 0.83, "text": {"vi": "Người dân bị siết chặt", "en": "People crushed"}}, {"id": "l7", "x": 0.11, "y": 0.74, "text": {"vi": "Nhà Trắng – “kế tiếp!”", "en": "White House – “Next!”"}}];

export function LabeledDiagramPreview() {
  const [block, setBlock] = useState<InteractiveBlock>(() => {
    const block = newSimulationBlock('labeled-diagram');
    // Bài 2's oil-monopoly cartoon, already in lesson media.
    return { ...block, config: { ...block.config, image_url: IMAGE, labels: LABELS } };
  });
  const [lang, setLang] = useState<'vi' | 'en'>('vi');
  return <div className="flex flex-col gap-5">
    <button type="button" className={`${BUTTON} self-start`} onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}>{lang === 'vi' ? 'English' : 'Tiếng Việt'}</button>
    <InteractiveRenderer block={block} lang={lang} />
    <details className="rounded-lg border border-line bg-surface p-4"><summary className="cursor-pointer text-ink">{lang === 'vi' ? 'Thiết lập trong Studio' : 'Studio settings'}</summary><div className="mt-4"><SimulationEditor block={block} onChange={setBlock} lang={lang} onLangChange={setLang} /></div></details>
  </div>;
}
