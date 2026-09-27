'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { BUTTON, NumberField, PANEL, PRIMARY_BUTTON, SelectField } from './controls';
import { faceCount, throwBatch } from './engines/probability';
import { pick, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';

const BATCHES = [1, 10, 100, 1000] as const;

function faceName(object: 'coin' | 'die', i: number, lang: 'vi' | 'en'): string {
  if (object === 'coin') return i === 0 ? (lang === 'en' ? 'Heads' : 'Sấp') : lang === 'en' ? 'Tails' : 'Ngửa';
  return String(i + 1);
}

function ProbabilityView({ config, lang }: SimulationViewProps<'probability'>) {
  const t = pick(lang);
  const faces = faceCount(config);
  const [counts, setCounts] = useState<number[]>(() => new Array(faces).fill(0));
  const list = counts.length === faces ? counts : new Array<number>(faces).fill(0);
  const total = list.reduce((a, b) => a + b, 0);
  const expected = 1 / faces;

  const run = (n: number) => {
    const batch = throwBatch(config, n);
    setCounts(list.map((c, i) => c + batch[i]!));
  };

  return (
    <div className={PANEL}>
      <div className="flex flex-wrap gap-2">
        {BATCHES.map((n) => (
          <button key={n} type="button" className={n === config.defaultTrials ? PRIMARY_BUTTON : BUTTON} onClick={() => run(n)}>
            {t({ en: `Throw ${n} times`, vi: `Tung ${n} lần` })}
          </button>
        ))}
        <button type="button" className={BUTTON} onClick={() => setCounts(new Array(faces).fill(0))} aria-label={t({ en: 'Start again', vi: 'Làm lại' })}>
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <p aria-live="polite" className="text-sm text-ink">
        {t({ en: 'Total throws', vi: 'Tổng số lần tung' })}: <span className="font-semibold tabular-nums">{total}</span> ·{' '}
        {t({ en: 'probability of each face', vi: 'xác suất mỗi mặt' })}: 1/{faces} ≈ {expected.toFixed(3)}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[18rem] border-collapse text-left text-sm">
          <thead>
            <tr className="text-ink-muted">
              <th className="py-1 pr-2 font-semibold">{config.object === 'coin' ? t({ en: 'Side', vi: 'Mặt' }) : t({ en: 'Face', vi: 'Mặt' })}</th>
              <th className="py-1 pr-2 font-semibold">{t({ en: 'Count', vi: 'Số lần' })}</th>
              <th className="w-1/2 py-1 font-semibold">{t({ en: 'Frequency', vi: 'Tần suất' })}</th>
            </tr>
          </thead>
          <tbody>
            {list.map((count, i) => {
              const frequency = total ? count / total : 0;
              return (
                <tr key={i} className="border-t border-line">
                  <td className="py-1.5 pr-2 font-semibold text-ink">{faceName(config.object, i, lang)}</td>
                  <td className="py-1.5 pr-2 tabular-nums text-ink">{count}</td>
                  <td className="py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="relative h-3 flex-1 overflow-hidden rounded bg-surface-sunken" aria-hidden="true">
                        <div className="h-full bg-accent" style={{ width: `${Math.min(frequency / Math.max(expected * 2, 0.01), 1) * 100}%` }} />
                        <div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: '50%' }} />
                      </div>
                      <span className="w-12 text-right tabular-nums text-ink">{frequency.toFixed(3)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-muted">
        {t({ en: 'The dark line marks the theoretical probability. More throws bring the bars closer to it.', vi: 'Vạch đậm là xác suất lý thuyết. Tung càng nhiều, cột càng gần vạch.' })}
      </p>
    </div>
  );
}

function ProbabilityEditor({ config, onChange, lang }: SimulationEditorProps<'probability'>) {
  const t = pick(lang);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <SelectField
        label={t({ en: 'Object', vi: 'Vật tung' })}
        value={config.object}
        options={[
          { value: 'coin', label: t({ en: 'Coin', vi: 'Đồng xu' }) },
          { value: 'die', label: t({ en: 'Die', vi: 'Xúc xắc' }) },
        ]}
        onChange={(object) => onChange({ ...config, object })}
      />
      {config.object === 'die' && (
        <NumberField label={t({ en: 'Faces', vi: 'Số mặt' })} value={config.faces} min={2} max={20} onChange={(faces) => onChange({ ...config, faces: Math.round(faces) })} />
      )}
      <SelectField
        label={t({ en: 'Suggested batch', vi: 'Số lần tung gợi ý' })}
        value={String(config.defaultTrials) as '1'}
        options={BATCHES.map((n) => ({ value: String(n) as '1', label: String(n) }))}
        onChange={(v) => onChange({ ...config, defaultTrials: Number(v) as 1 })}
      />
    </div>
  );
}

export const probabilityModule: SimulationModule<'probability'> = {
  kind: 'probability',
  label: { en: 'Probability experiment', vi: 'Xác suất thực nghiệm' },
  subject: { en: 'Mathematics', vi: 'Toán' },
  Editor: ProbabilityEditor,
  Renderer: ProbabilityView,
};
