'use client';

import { Component, Suspense, lazy, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Eye, EyeOff, Plus, RotateCcw, X } from 'lucide-react';
import { GRAPH3D_PARAMETER_NAME, undeclaredNames, type Graph3dObject, type SimulationConfigByKind } from '@scipal/types';
import { buildShape, OBJECT_COLORS, type Box, type ObjectColor, type Shape } from './engines/graph3d';
import { BUTTON, CheckField, FIELD, NumberField, PANEL, SelectField, SelfCheck, SelfCheckFields, Slider } from './controls';
import { pick, type Bilingual, type Lang, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';
import type { GraphItem } from './graph3dScene';

type GraphConfig = SimulationConfigByKind['graph-3d'];
type ObjectType = Graph3dObject['type'];

// three.js is only fetched when a lesson actually shows a 3D graph.
const Graph3dScene = lazy(() => import('./graph3dScene'));
const COLORS = OBJECT_COLORS;

const TYPE_NAME: Record<ObjectType, Bilingual> = {
  surface: { vi: 'Mặt z = f(x, y)', en: 'Surface z = f(x, y)' },
  curve: { vi: 'Đường cong tham số', en: 'Parametric curve' },
  point: { vi: 'Điểm', en: 'Point' },
  vector: { vi: 'Vectơ', en: 'Vector' },
  plane: { vi: 'Mặt phẳng', en: 'Plane' },
  sphere: { vi: 'Mặt cầu', en: 'Sphere' },
};

const NEW_OBJECT: Record<ObjectType, Graph3dObject> = {
  surface: { type: 'surface', z: 'x^2/4 - y^2/4' },
  curve: { type: 'curve', x: '3cos(t)', y: '3sin(t)', z: 't/3', tMin: 0, tMax: 12.56 },
  point: { type: 'point', x: '1', y: '2', z: '3', label: 'M' },
  vector: { type: 'vector', x: '2', y: '1', z: '3', label: 'u' },
  plane: { type: 'plane', a: '1', b: '1', c: '1', d: '-3' },
  sphere: { type: 'sphere', x: '0', y: '0', z: '0', r: '3' },
};

const boxOf = (c: GraphConfig): Box => ({ xMin: c.xMin, xMax: c.xMax, yMin: c.yMin, yMax: c.yMax, zMin: c.zMin, zMax: c.zMax });

/** How an object reads in words, for the screen-reader description of the picture. */
function describe(o: Graph3dObject, t: (b: Bilingual) => string): string {
  switch (o.type) {
    case 'surface':
      return `z = ${o.z}`;
    case 'curve':
      return `${t(TYPE_NAME.curve)} (${o.x}; ${o.y}; ${o.z})`;
    case 'point':
      return `${o.label || t(TYPE_NAME.point)}(${o.x}; ${o.y}; ${o.z})`;
    case 'vector':
      return `${t(TYPE_NAME.vector)} ${o.label} = (${o.x}; ${o.y}; ${o.z})`;
    case 'plane':
      return `${t(TYPE_NAME.plane)} (${o.a})x + (${o.b})y + (${o.c})z + (${o.d}) = 0`;
    case 'sphere':
      return `${t(TYPE_NAME.sphere)} ${t({ vi: 'tâm', en: 'centre' })} (${o.x}; ${o.y}; ${o.z}), r = ${o.r}`;
  }
}

class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** One expression box with its math prefix: `z =`, `x(t) =`… */
function ExprInput({ prefix, value, onChange, invalid, label, wide = true }: { prefix: string; value: string; onChange: (v: string) => void; invalid: boolean; label: string; wide?: boolean }) {
  return (
    <label className={`flex min-w-0 items-center gap-1.5 ${wide ? 'w-full' : ''}`}>
      <span className="shrink-0 font-mono text-sm italic text-ink-muted">{prefix}</span>
      <input
        value={value}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        maxLength={200}
        aria-label={label}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`${FIELD} min-w-0 px-2 font-mono text-sm ${wide ? '' : 'w-16'}`}
      />
    </label>
  );
}

/** The fields of one object, as inputs (editable) or as plain maths (read only). */
function ObjectFields({ object, onChange, editable, invalidField, lang }: { object: Graph3dObject; onChange: (o: Graph3dObject) => void; editable: boolean; invalidField?: string; lang: Lang }) {
  const t = pick(lang);
  const set = (patch: Partial<Record<string, string>>) => onChange({ ...object, ...patch } as Graph3dObject);
  const box = (field: string, prefix: string, wide = true) => {
    const value = (object as unknown as Record<string, string>)[field] ?? '';
    return editable ? (
      <ExprInput key={field} prefix={prefix} value={value} onChange={(v) => set({ [field]: v })} invalid={invalidField === field} label={`${t(TYPE_NAME[object.type])}: ${prefix.replace('=', '').trim() || field}`} wide={wide} />
    ) : (
      <p key={field} className="font-mono text-sm text-ink">
        <span className="italic text-ink-muted">{prefix}</span> {value}
      </p>
    );
  };
  switch (object.type) {
    case 'surface':
      return box('z', 'z =');
    case 'curve':
      return (
        <div className="flex flex-col gap-1.5">
          {box('x', 'x(t) =')}
          {box('y', 'y(t) =')}
          {box('z', 'z(t) =')}
          <p className="text-xs text-ink-muted">
            t ∈ [{object.tMin}; {object.tMax}]
          </p>
        </div>
      );
    case 'point':
    case 'vector':
      return (
        <div className="grid grid-cols-3 gap-1.5">
          {box('x', 'x', true)}
          {box('y', 'y', true)}
          {box('z', 'z', true)}
        </div>
      );
    case 'plane':
      return (
        <div className="flex flex-col gap-1.5">
          <p className="font-mono text-xs text-ink-muted">a·x + b·y + c·z + d = 0</p>
          <div className="grid grid-cols-2 gap-1.5">
            {box('a', 'a =')}
            {box('b', 'b =')}
            {box('c', 'c =')}
            {box('d', 'd =')}
          </div>
        </div>
      );
    case 'sphere':
      return (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-ink-muted">{t({ vi: 'Tâm', en: 'Centre' })}</p>
          <div className="grid grid-cols-3 gap-1.5">
            {box('x', 'x')}
            {box('y', 'y')}
            {box('z', 'z')}
          </div>
          {box('r', t({ vi: 'bán kính r =', en: 'radius r =' }))}
        </div>
      );
  }
}

const SWATCH: Record<ObjectColor, string> = {
  '--sky': 'var(--sky)',
  '--coral': 'var(--coral)',
  '--action': 'var(--action)',
  '--warning': 'var(--warning)',
  '--sun': 'var(--sun)',
};

/** The list beside the picture, as on math3d.org: a colour, a name, the maths, show/hide. */
function ObjectList({
  objects,
  shapes,
  hidden,
  editable,
  lang,
  onChange,
  onToggle,
  onRemove,
  parameters,
}: {
  objects: Graph3dObject[];
  shapes: Shape[];
  hidden: Set<number>;
  editable: boolean;
  lang: Lang;
  onChange: (i: number, o: Graph3dObject) => void;
  onToggle?: (i: number) => void;
  onRemove?: (i: number) => void;
  parameters: string[];
}) {
  const t = pick(lang);
  return (
    <ol className="flex flex-col gap-2">
      {objects.map((o, i) => {
        const shape = shapes[i];
        const invalid = shape?.type === 'invalid' ? shape : null;
        const off = hidden.has(i);
        return (
          <li key={i} className={`flex flex-col gap-2 rounded-lg border bg-surface p-2.5 ${invalid ? 'border-danger' : 'border-line'}`}>
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 rounded-full"
                style={{ background: o.type === 'surface' ? 'linear-gradient(135deg, var(--sky), var(--sun), var(--coral))' : SWATCH[COLORS[i % COLORS.length]!] }}
              />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{t(TYPE_NAME[o.type])}</span>
              {onToggle && (
                <button
                  type="button"
                  aria-pressed={!off}
                  aria-label={off ? t({ en: 'Show', vi: 'Hiện' }) : t({ en: 'Hide', vi: 'Ẩn' })}
                  onClick={() => onToggle(i)}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {off ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                </button>
              )}
              {onRemove && objects.length > 1 && (
                <button
                  type="button"
                  aria-label={t({ en: `Remove ${TYPE_NAME[o.type].en.toLowerCase()}`, vi: `Xóa ${TYPE_NAME[o.type].vi.toLowerCase()}` })}
                  onClick={() => onRemove(i)}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
            </div>
            <ObjectFields object={o} editable={editable} invalidField={invalid?.field} lang={lang} onChange={(next) => onChange(i, next)} />
            {invalid && (
              <p className="text-xs font-medium text-danger" aria-live="polite">
                {t(invalid.message)}
                {undeclaredHint(o, parameters, lang)}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** A nudge when the problem is an unknown letter: which variables this kind of object may use. */
function undeclaredHint(o: Graph3dObject, parameters: string[], lang: Lang): string {
  const t = pick(lang);
  const fields = Object.entries(o).filter(([k, v]) => typeof v === 'string' && k !== 'type' && k !== 'label') as Array<[string, string]>;
  const stray = fields.some(([, v]) => undeclaredNames(v, parameters, []).length > 0);
  if (!stray) return '';
  const allowed = o.type === 'surface' ? 'x, y' : o.type === 'curve' ? 't' : t({ vi: 'chỉ số và tham số', en: 'numbers and parameters only' });
  return ` ${t({ vi: `Được dùng: ${allowed}.`, en: `Allowed: ${allowed}.` })}`;
}

function useShapes(objects: Graph3dObject[], box: Box, samples: number, values: Record<string, number>) {
  return useMemo(() => objects.map((o) => buildShape(o, box, samples, values)), [objects, box, samples, values]);
}

function GraphView({ config, lang }: SimulationViewProps<'graph-3d'>) {
  const t = pick(lang);
  const startValues = () => Object.fromEntries(config.parameters.map((p) => [p.name, p.value]));
  const [objects, setObjects] = useState<Graph3dObject[]>(config.objects);
  const [values, setValues] = useState<Record<string, number>>(startValues);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  // The Studio preview follows the teacher's settings as they change them.
  const key = JSON.stringify([config.objects, config.parameters]);
  const [seen, setSeen] = useState(key);
  if (seen !== key) {
    setSeen(key);
    setObjects(config.objects);
    setValues(startValues());
    setHidden(new Set());
  }
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const box = useMemo(() => boxOf(config), [config]);
  const shapes = useShapes(objects, box, config.samples, values);
  const items: GraphItem[] = shapes.flatMap((shape, i) => (shape.type === 'invalid' || hidden.has(i) ? [] : [{ id: String(i), shape, color: COLORS[i % COLORS.length]! }]));
  const changed = JSON.stringify(objects) !== JSON.stringify(config.objects);
  const description = `${t({ vi: 'Đồ thị 3D', en: '3D graph' })}: ${objects.map((o) => describe(o, t)).join('; ')}. x ∈ [${box.xMin}; ${box.xMax}], y ∈ [${box.yMin}; ${box.yMax}], z ∈ [${box.zMin}; ${box.zMax}].`;
  const frame = (message: string) => <div className="grid aspect-square w-full place-items-center rounded-md border border-line bg-surface p-4 text-center text-sm text-ink-muted sm:aspect-[4/3]">{message}</div>;

  return (
    <div className={PANEL}>
      <div className="grid gap-4 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
        <div className="order-2 flex min-w-0 flex-col gap-3 md:order-1">
          <ObjectList
            objects={objects}
            shapes={shapes}
            hidden={hidden}
            editable={config.editable}
            parameters={config.parameters.map((p) => p.name)}
            lang={lang}
            onChange={(i, o) => setObjects((list) => list.map((x, j) => (j === i ? o : x)))}
            onToggle={(i) =>
              setHidden((h) => {
                const next = new Set(h);
                if (next.has(i)) next.delete(i);
                else next.add(i);
                return next;
              })
            }
          />
          {config.editable && changed && (
            <button type="button" className={`${BUTTON} self-start`} onClick={() => setObjects(config.objects)}>
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              {t({ en: 'Back to the original', vi: 'Khôi phục đề bài' })}
            </button>
          )}
          {config.parameters.length > 0 && (
            <div className="flex flex-col gap-2">
              {config.parameters.map((p) => (
                <Slider key={p.name} label={p.name} value={values[p.name] ?? p.value} min={p.min} max={p.max} step={p.step} onChange={(v) => setValues((old) => ({ ...old, [p.name]: v }))} />
              ))}
            </div>
          )}
        </div>
        <div className="order-1 min-w-0 md:order-2">
          {mounted ? (
            <SceneBoundary fallback={frame(t({ en: 'This browser cannot show 3D.', vi: 'Trình duyệt này không hiển thị được hình 3D.' }))}>
              <Suspense fallback={frame(t({ en: 'Loading the 3D view…', vi: 'Đang tải hình 3D…' }))}>
                <Graph3dScene items={items} box={box} description={description} lang={lang} />
              </Suspense>
            </SceneBoundary>
          ) : (
            frame(t({ en: 'Loading the 3D view…', vi: 'Đang tải hình 3D…' }))
          )}
        </div>
      </div>
      <p className="text-xs text-ink-muted">
        {config.editable
          ? t({
              en: 'Type an expression and the picture follows. Use x and y on a surface, t on a curve; + − * / ^, sin cos tan sqrt abs ln exp, pi. Drag to turn, pinch or Ctrl + scroll to zoom.',
              vi: 'Gõ biểu thức là hình đổi theo. Mặt dùng x và y, đường cong dùng t; + − * / ^, sin cos tan sqrt abs ln exp, pi. Kéo để xoay, chụm hai ngón hoặc Ctrl + cuộn để phóng to.',
            })
          : t({ en: 'Drag to turn, pinch or Ctrl + scroll to zoom.', vi: 'Kéo để xoay, chụm hai ngón hoặc Ctrl + cuộn để phóng to.' })}
      </p>
      <SelfCheck question={config.question} answer={config.answer} lang={lang} />
    </div>
  );
}

function GraphEditor({ config, onChange, lang }: SimulationEditorProps<'graph-3d'>) {
  const t = pick(lang);
  const box = boxOf(config);
  const values = useMemo(() => Object.fromEntries(config.parameters.map((p) => [p.name, p.value])), [config.parameters]);
  const shapes = useShapes(config.objects, box, 12, values);
  const [adding, setAdding] = useState<ObjectType>('surface');
  const used = new Set(config.parameters.map((p) => p.name));
  const spare = 'abcdkmnpqrsuvw'.split('').find((n) => !used.has(n) && GRAPH3D_PARAMETER_NAME.test(n));
  const setParameter = (i: number, patch: Partial<GraphConfig['parameters'][number]>) =>
    onChange({
      ...config,
      parameters: config.parameters.map((p, j) => {
        if (j !== i) return p;
        const merged = { ...p, ...patch };
        const low = Math.min(merged.min, merged.max);
        const high = Math.max(merged.min, merged.max);
        return { ...merged, value: Math.min(Math.max(merged.value, low), high) };
      }),
    });

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold text-ink">{t({ en: 'Objects (up to 8)', vi: 'Đối tượng (tối đa 8)' })}</legend>
        <ObjectList
          objects={config.objects}
          shapes={shapes}
          hidden={new Set()}
          editable
          parameters={config.parameters.map((p) => p.name)}
          lang={lang}
          onChange={(i, o) => onChange({ ...config, objects: config.objects.map((x, j) => (j === i ? o : x)) })}
          onRemove={(i) => onChange({ ...config, objects: config.objects.filter((_, j) => j !== i) })}
        />
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1">
            <SelectField
              label={t({ en: 'New object', vi: 'Đối tượng mới' })}
              value={adding}
              options={(Object.keys(TYPE_NAME) as ObjectType[]).map((k) => ({ value: k, label: t(TYPE_NAME[k]) }))}
              onChange={setAdding}
            />
          </div>
          <button type="button" className={BUTTON} disabled={config.objects.length >= 8} onClick={() => onChange({ ...config, objects: [...config.objects, NEW_OBJECT[adding]] })}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            {t({ en: 'Add', vi: 'Thêm' })}
          </button>
        </div>
        {config.objects.map((o, i) =>
          o.type === 'curve' ? (
            <div key={`t${i}`} className="grid grid-cols-2 gap-2">
              <NumberField label={t({ en: `Curve ${i + 1}: t from`, vi: `Đường cong ${i + 1}: t từ` })} value={o.tMin} min={-1000} max={1000} step={0.1} onChange={(tMin) => onChange({ ...config, objects: config.objects.map((x, j) => (j === i ? { ...o, tMin } : x)) })} />
              <NumberField label={t({ en: 'to', vi: 'đến' })} value={o.tMax} min={-1000} max={1000} step={0.1} onChange={(tMax) => onChange({ ...config, objects: config.objects.map((x, j) => (j === i ? { ...o, tMax } : x)) })} />
            </div>
          ) : o.type === 'point' || o.type === 'vector' ? (
            <div key={`l${i}`} className="max-w-xs">
              <NameField
                label={t({ en: `Name of ${o.type === 'point' ? 'point' : 'vector'} ${i + 1}`, vi: `Tên ${o.type === 'point' ? 'điểm' : 'vectơ'} ${i + 1}` })}
                value={o.label}
                onChange={(label) => onChange({ ...config, objects: config.objects.map((x, j) => (j === i ? { ...o, label } : x)) })}
              />
            </div>
          ) : null,
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold text-ink">{t({ en: 'Parameters (learners move a slider)', vi: 'Tham số (học sinh kéo thanh trượt)' })}</legend>
        {config.parameters.map((p, i) => (
          <div key={p.name} className="grid grid-cols-2 items-end gap-2 rounded-lg border border-line p-3 sm:grid-cols-5">
            <p className="col-span-2 font-mono text-lg font-bold text-ink sm:col-span-1">{p.name}</p>
            <NumberField label={t({ en: 'From', vi: 'Từ' })} value={p.min} min={-1000} max={1000} step={p.step} onChange={(min) => setParameter(i, { min })} />
            <NumberField label={t({ en: 'To', vi: 'Đến' })} value={p.max} min={-1000} max={1000} step={p.step} onChange={(max) => setParameter(i, { max })} />
            <NumberField label={t({ en: 'Step', vi: 'Bước' })} value={p.step} min={0.001} max={1000} step={0.001} onChange={(step) => setParameter(i, { step })} />
            <NumberField label={t({ en: 'Start at', vi: 'Ban đầu' })} value={p.value} min={p.min} max={p.max} step={p.step} onChange={(value) => setParameter(i, { value })} />
            <button type="button" className={`${BUTTON} col-span-2 sm:col-span-5 sm:justify-self-end`} onClick={() => onChange({ ...config, parameters: config.parameters.filter((_, j) => j !== i) })}>
              <X aria-hidden="true" className="h-4 w-4" />
              {t({ en: `Remove ${p.name}`, vi: `Bỏ tham số ${p.name}` })}
            </button>
          </div>
        ))}
        {spare && config.parameters.length < 4 && (
          <button type="button" className={`${BUTTON} self-start`} onClick={() => onChange({ ...config, parameters: [...config.parameters, { name: spare, min: -5, max: 5, step: 0.5, value: 1 }] })}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            {t({ en: `Add parameter ${spare}`, vi: `Thêm tham số ${spare}` })}
          </button>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold text-ink">{t({ en: 'Window', vi: 'Khung nhìn' })}</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(['x', 'y', 'z'] as const).flatMap((axis) => [
            <NumberField key={`${axis}min`} label={`${axis} min`} value={config[`${axis}Min`]} min={-100} max={config[`${axis}Max`] - 0.01} step={0.5} onChange={(v) => onChange({ ...config, [`${axis}Min`]: v })} />,
            <NumberField key={`${axis}max`} label={`${axis} max`} value={config[`${axis}Max`]} min={config[`${axis}Min`] + 0.01} max={100} step={0.5} onChange={(v) => onChange({ ...config, [`${axis}Max`]: v })} />,
          ])}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <CheckField label={t({ en: 'Learners can type their own expressions', vi: 'Học sinh được tự gõ biểu thức' })} checked={config.editable} onChange={(editable) => onChange({ ...config, editable })} />
      </div>
      <SelfCheckFields question={config.question} answer={config.answer} lang={lang} onChange={(next) => onChange({ ...config, ...next })} />
    </div>
  );
}

function NameField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
      {label}
      <input value={value} maxLength={12} onChange={(e) => onChange(e.target.value)} className={FIELD} />
    </label>
  );
}

export const graph3dModule: SimulationModule<'graph-3d'> = {
  kind: 'graph-3d',
  label: { en: '3D graph', vi: 'Đồ thị 3D' },
  subject: { en: 'Mathematics', vi: 'Toán' },
  Editor: GraphEditor,
  Renderer: GraphView,
};
