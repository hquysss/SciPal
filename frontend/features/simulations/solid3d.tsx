'use client';

import { Component, Suspense, lazy, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import type { SimulationConfigByKind } from '@scipal/types';
import { dimsUsed, measures, solid as buildSolid, type DimKey, type Dims, type SolidKind } from './engines/solid';
import { BUTTON, CheckField, NumberField, PANEL, SelectField, SelfCheck, SelfCheckFields, Slider } from './controls';
import { pick, type Bilingual, type Lang, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';

type SolidConfig = SimulationConfigByKind['solid-3d'];

// three.js is only fetched when a lesson actually shows a 3D solid.
const SolidScene = lazy(() => import('./solid3dScene'));

const NAME: Record<SolidKind, Bilingual> = {
  cube: { vi: 'Hình lập phương ABCD.A′B′C′D′', en: 'Cube ABCD.A′B′C′D′' },
  cuboid: { vi: 'Hình hộp chữ nhật ABCD.A′B′C′D′', en: 'Cuboid ABCD.A′B′C′D′' },
  tetrahedron: { vi: 'Tứ diện đều ABCD', en: 'Regular tetrahedron ABCD' },
  pyramid: { vi: 'Hình chóp tứ giác đều S.ABCD', en: 'Regular square pyramid S.ABCD' },
  prism: { vi: 'Lăng trụ tam giác đều ABC.A′B′C′', en: 'Regular triangular prism ABC.A′B′C′' },
  cylinder: { vi: 'Hình trụ (đáy tâm O và O′)', en: "Cylinder (bases centred at O and O′)" },
  cone: { vi: 'Hình nón đỉnh S, đáy tâm O', en: 'Cone with apex S, base centred at O' },
  sphere: { vi: 'Mặt cầu tâm O', en: 'Sphere centred at O' },
};

function dimLabel(kind: SolidKind, key: DimKey): Bilingual {
  if (kind === 'cuboid') return { a: { vi: 'Chiều dài a', en: 'Length a' }, b: { vi: 'Chiều rộng b', en: 'Width b' }, c: { vi: 'Chiều cao c', en: 'Height c' } }[key as 'a' | 'b' | 'c'];
  if (key === 'a') return kind === 'pyramid' || kind === 'prism' ? { vi: 'Cạnh đáy a', en: 'Base edge a' } : { vi: 'Cạnh a', en: 'Edge a' };
  if (key === 'h') return { vi: 'Chiều cao h', en: 'Height h' };
  if (key === 'r') return { vi: 'Bán kính r', en: 'Radius r' };
  return { vi: key, en: key };
}

const dimsOf = (c: Pick<SolidConfig, DimKey>): Dims => ({ a: c.a, b: c.b, c: c.c, h: c.h, r: c.r });
const display = (name: string) => name.replace(/'/g, '′');

/** WebGL can be missing or blocked; the formulas and coordinates still teach without the picture. */
class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function SolidView({ config, lang }: SimulationViewProps<'solid-3d'>) {
  const t = pick(lang);
  const nf = new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: 3 });
  const format = (v: number) => nf.format(v).replace('-', '−');
  const [dims, setDims] = useState<Dims>(() => dimsOf(config));
  const [labels, setLabels] = useState(config.labels);
  // The Studio preview follows the teacher's lengths as they change them.
  const [seen, setSeen] = useState(() => JSON.stringify([dimsOf(config), config.labels]));
  const key = JSON.stringify([dimsOf(config), config.labels]);
  if (seen !== key) {
    setSeen(key);
    setDims(dimsOf(config));
    setLabels(config.labels);
  }
  // The 3D view only exists in the browser: the server and first paint show its frame and the text.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const kind = config.solid;
  const shape = useMemo(() => buildSolid(kind, dims), [kind, dims]);
  const used = dimsUsed(kind);
  const sizes = used.map((k) => `${k} = ${format(dims[k])}`).join(', ');
  const description = `${t(NAME[kind])}, ${sizes}`;
  const missing = config.segments.filter((s) => !shape.points[s.from] || !shape.points[s.to]);
  const frame = (message: string) => (
    <div className="grid aspect-[4/3] w-full place-items-center rounded-md border border-line bg-surface-sunken p-4 text-center text-sm text-ink-muted">{message}</div>
  );

  return (
    <div className={PANEL}>
      <p className="font-semibold text-ink">{t(NAME[kind])}</p>
      {mounted ? (
        <SceneBoundary fallback={frame(t({ en: 'This browser cannot show 3D. The formulas below still apply.', vi: 'Trình duyệt này không hiển thị được hình 3D. Công thức bên dưới vẫn dùng được.' }))}>
          <Suspense fallback={frame(t({ en: 'Loading the 3D view…', vi: 'Đang tải hình 3D…' }))}>
            <SolidScene
              solid={shape}
              segments={config.segments.filter((s) => !missing.includes(s))}
              labels={labels}
              axes={config.coordinates}
              description={description}
              lang={lang}
            />
          </Suspense>
        </SceneBoundary>
      ) : (
        frame(t({ en: 'Loading the 3D view…', vi: 'Đang tải hình 3D…' }))
      )}
      <p className="text-xs text-ink-muted">
        {t({
          en: 'Drag to turn, pinch or Ctrl + scroll to zoom. With the view focused: arrow keys turn it, + and − zoom, 0 resets.',
          vi: 'Kéo để xoay, chụm hai ngón hoặc Ctrl + cuộn để phóng to. Khi chọn hình: phím mũi tên để xoay, + và − để phóng to, 0 để về ban đầu.',
        })}
      </p>

      <div className="flex flex-wrap gap-2">
        <CheckField label={t({ en: 'Point names', vi: 'Tên điểm' })} checked={labels} onChange={setLabels} />
      </div>

      {config.adjustable && (
        <div className="grid gap-3 sm:grid-cols-2">
          {used.map((k) => (
            <Slider key={k} label={t(dimLabel(kind, k))} value={dims[k]} min={0.5} max={10} step={0.5} onChange={(v) => setDims((d) => ({ ...d, [k]: v }))} />
          ))}
        </div>
      )}

      <dl className="grid gap-2 sm:grid-cols-2">
        {measures(kind, dims).map((m) => (
          <div key={m.key} className="flex min-h-11 flex-col justify-center gap-0.5 rounded-lg border border-line bg-surface px-3 py-2">
            <dt className="text-sm font-semibold text-ink">{t(m.label)}</dt>
            <dd className="flex flex-wrap items-baseline justify-between gap-x-3 text-ink">
              <span className="font-mono text-sm text-ink-muted">{m.formula}</span>
              <span className="font-semibold tabular-nums">≈ {format(m.value)}</span>
            </dd>
          </div>
        ))}
      </dl>

      {config.coordinates && (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full border-collapse text-left text-sm tabular-nums">
            <caption className="px-3 pt-2 text-left text-sm font-semibold text-ink">
              {t({ en: 'Coordinates in Oxyz', vi: 'Toạ độ trong hệ Oxyz' })}
            </caption>
            <thead>
              <tr className="text-ink-muted">
                <th scope="col" className="px-3 py-2 font-semibold">{t({ en: 'Point', vi: 'Điểm' })}</th>
                <th scope="col" className="px-3 py-2 font-semibold">x</th>
                <th scope="col" className="px-3 py-2 font-semibold">y</th>
                <th scope="col" className="px-3 py-2 font-semibold">z</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(shape.points).map(([n, p]) => (
                <tr key={n} className="border-t border-line text-ink">
                  <th scope="row" className="px-3 py-1.5 font-semibold">{display(n)}</th>
                  {p.map((v, i) => (
                    <td key={i} className="px-3 py-1.5">{format(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SelfCheck question={config.question} answer={config.answer} lang={lang} />
    </div>
  );
}

const KINDS: SolidKind[] = ['cube', 'cuboid', 'tetrahedron', 'pyramid', 'prism', 'cylinder', 'cone', 'sphere'];

function SolidEditor({ config, onChange, lang }: SimulationEditorProps<'solid-3d'>) {
  const t = pick(lang);
  const shape = buildSolid(config.solid, dimsOf(config));
  const names = Object.keys(shape.points);
  const setSegment = (i: number, patch: Partial<SolidConfig['segments'][number]>) =>
    onChange({ ...config, segments: config.segments.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const pointOptions = (current: string) =>
    [...new Set([...names, current])].map((n) => ({ value: n, label: shape.points[n] ? display(n) : `${display(n)} (${t({ en: 'not in this solid', vi: 'không có trong hình này' })})` }));
  const freePair = (): { from: string; to: string } | null => {
    for (const from of names) for (const to of names) if (from < to && !config.segments.some((s) => s.from === from && s.to === to)) return { from, to };
    return null;
  };
  const next = freePair();

  return (
    <div className="flex flex-col gap-4">
      <SelectField
        label={t({ en: 'Solid', vi: 'Khối' })}
        value={config.solid}
        options={KINDS.map((k) => ({ value: k, label: t(NAME[k]) }))}
        onChange={(solid) => onChange({ ...config, solid })}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {dimsUsed(config.solid).map((k) => (
          <NumberField key={k} label={t(dimLabel(config.solid, k))} value={config[k]} min={0.5} max={10} step={0.5} onChange={(v) => onChange({ ...config, [k]: v })} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <CheckField label={t({ en: 'Learners can change the lengths', vi: 'Học sinh được đổi độ dài' })} checked={config.adjustable} onChange={(adjustable) => onChange({ ...config, adjustable })} />
        <CheckField label={t({ en: 'Show point names', vi: 'Hiện tên điểm' })} checked={config.labels} onChange={(labels) => onChange({ ...config, labels })} />
        <CheckField label={t({ en: 'Oxyz axes and coordinates', vi: 'Trục Oxyz và toạ độ' })} checked={config.coordinates} onChange={(coordinates) => onChange({ ...config, coordinates })} />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold text-ink">{t({ en: 'Highlighted segments (up to 12)', vi: 'Đoạn tô nổi (tối đa 12)' })}</legend>
        {config.segments.map((s, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
            <SelectField label={t({ en: 'From', vi: 'Từ' })} value={s.from} options={pointOptions(s.from)} onChange={(from) => setSegment(i, { from })} />
            <SelectField label={t({ en: 'To', vi: 'Đến' })} value={s.to} options={pointOptions(s.to)} onChange={(to) => setSegment(i, { to })} />
            <button
              type="button"
              className={BUTTON}
              aria-label={t({ en: `Remove segment ${display(s.from)}${display(s.to)}`, vi: `Xóa đoạn ${display(s.from)}${display(s.to)}` })}
              onClick={() => onChange({ ...config, segments: config.segments.filter((_, j) => j !== i) })}
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
            {s.from === s.to && (
              <p role="alert" className="col-span-3 text-sm font-medium text-danger">
                {t({ en: 'Pick two different points.', vi: 'Chọn hai điểm khác nhau.' })}
              </p>
            )}
          </div>
        ))}
        <button
          type="button"
          className={`${BUTTON} self-start`}
          disabled={config.segments.length >= 12 || !next}
          onClick={() => next && onChange({ ...config, segments: [...config.segments, next] })}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          {t({ en: 'Add a segment', vi: 'Thêm đoạn' })}
        </button>
      </fieldset>

      <SelfCheckFields question={config.question} answer={config.answer} lang={lang} onChange={(next) => onChange({ ...config, ...next })} />
    </div>
  );
}

export const solid3dModule: SimulationModule<'solid-3d'> = {
  kind: 'solid-3d',
  label: { en: '3D solid', vi: 'Hình không gian 3D' },
  subject: { en: 'Mathematics', vi: 'Toán' },
  Editor: SolidEditor,
  Renderer: SolidView,
};
