'use client';

import { Component, lazy, Suspense, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { LOGIC_GATES, LOGIC_MODES } from '@scipal/types';
import { BUTTON, CheckField, NumberField, PANEL, SelectField, SelfCheck, SelfCheckFields } from './controls';
import { useReducedMotion } from './animation';
import { useOnScreen } from './useOnScreen';
import { GATES, divisionSteps, evalGate, halfAdder, placeValueSentence, toBits, truthTable, type Bit, type Gate } from './engines/logic';
import { binaryCircuit, gateCircuit, halfAdderCircuit } from './logicCircuit';
import { pick, type Bilingual, type Lang, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';
import type { LogicPart } from './logicScene';
import overlay from './simOverlay.module.css';
import styles from './logic.module.css';

/** The parts pinned with a label in the 3D view, as in the ripple tank; pressing one explains it. */
const PARTS: Record<LogicPart, { readonly name: Bilingual; readonly about: Bilingual }> = {
  switch: { name: { vi: 'Công tắc', en: 'Switch' }, about: { vi: 'Mỗi công tắc là một đầu vào A, B… Nhãn trên công tắc cho biết giá trị (A = 1 là có điện, A = 0 là không). Bấm vào công tắc trong hình hoặc nút bên cạnh để đổi.', en: 'Each switch is an input A, B… The tag above it shows its value (A = 1 is on, A = 0 is off). Click a switch in the view or a button beside it to flip it.' } },
  gate: { name: { vi: 'Cổng logic', en: 'Logic gate' }, about: { vi: 'Khối màu xanh nhận các bit đầu vào và cho ra một bit theo quy tắc của cổng (AND, OR, XOR, NOT…). Vòng tròn nhỏ ở đầu ra nghĩa là đảo bit (NOT).', en: 'The blue block takes the input bits and gives one bit by the gate’s rule (AND, OR, XOR, NOT…). A small circle on the output means the bit is inverted (NOT).' } },
  wire: { name: { vi: 'Dây dẫn', en: 'Wire' }, about: { vi: 'Dây màu vàng sáng và có chấm chạy là đang mang bit 1; dây xám tối mang bit 0.', en: 'A bright yellow wire with moving dots carries a 1; a dark grey wire carries a 0.' } },
  lamp: { name: { vi: 'Đèn', en: 'Lamp' }, about: { vi: 'Đèn cho biết kết quả: sáng là 1, tắt là 0. Ở bộ cộng, đèn S là bit tổng và đèn C là bit nhớ; ở chế độ nhị phân, mỗi đèn là một bit có trọng số 2ⁿ.', en: 'The lamp shows the result: on is 1, off is 0. In the adder, S is the sum bit and C the carry; in binary mode each lamp is one bit worth 2ⁿ.' } },
};


const LogicScene = lazy(() => import('./logicScene'));
type Props = SimulationViewProps<'logic-gates'>;
type Mode = (typeof LOGIC_MODES)[number];

const MODE_NAME: Record<Mode, Bilingual> = {
  gate: { en: 'One logic gate', vi: 'Một cổng logic' },
  'half-adder': { en: 'Half adder (adding two bits)', vi: 'Bộ cộng bán phần (cộng hai bit)' },
  binary: { en: 'Binary number', vi: 'Số nhị phân' },
};
const SUPERSCRIPT = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷'];

class SceneBoundary extends Component<{ readonly fallback: ReactNode; readonly children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** A switch as a real button, for keyboards and screen readers: the same toggle as clicking it in 3D. */
function SwitchButton({ label, on, onToggle }: { label: string; on: Bit; onToggle: () => void }) {
  return (
    <button type="button" aria-pressed={on === 1} onClick={onToggle} className={`${BUTTON} tabular-nums`}>
      <span aria-hidden="true" className={`inline-block h-3 w-3 rounded-full ${on ? styles.lit : styles.unlit}`} />
      {label} = {on}
    </button>
  );
}

function TruthTable({ columns, rows, current, caption }: { columns: string[]; rows: Bit[][]; current: number; caption: string }) {
  return (
    <table className="w-full max-w-xs border-collapse text-center text-sm tabular-nums">
      <caption className="pb-1 text-left text-xs font-semibold text-ink-muted">{caption}</caption>
      <thead>
        <tr>{columns.map((c) => <th key={c} scope="col" className="border-b border-line px-2 py-1 font-semibold text-ink">{c}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} aria-current={i === current ? 'true' : undefined} className={i === current ? 'bg-surface-sunken font-bold text-ink' : 'text-ink-muted'}>
            {row.map((v, k) => <td key={k} className="border-b border-line px-2 py-1">{i === current && k === row.length - 1 ? `▶ ${v}` : v}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LogicExperiment({ config, lang }: Props) {
  const t = pick(lang);
  const host = useRef<HTMLDivElement>(null);
  const decimalId = useId();
  const reduced = useReducedMotion();
  const active = useOnScreen(host);
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<Mode>(config.mode);
  const [gate, setGate] = useState<Gate>(config.gate);
  const [a, setA] = useState<Bit>(0);
  const [b, setB] = useState<Bit>(0);
  const max = 2 ** config.bits - 1;
  const [value, setValue] = useState(config.value % (max + 1));
  useEffect(() => setMounted(true), []);

  const bits = toBits(value, config.bits);
  const [part, setPart] = useState<LogicPart | null>(null);
  const single = GATES[gate].inputs === 1;
  const out = evalGate(gate, a, single ? 0 : b);
  const sum = halfAdder(a, b);
  const circuit = mode === 'gate' ? gateCircuit(gate, a, single ? 0 : b) : mode === 'half-adder' ? halfAdderCircuit(a, b) : binaryCircuit(bits);

  const toggle = (id: string) => {
    if (id === 'A') setA((v) => (v ? 0 : 1));
    else if (id === 'B') setB((v) => (v ? 0 : 1));
    else if (id.startsWith('b')) setValue((v) => v ^ (1 << Number(id.slice(1))));
  };

  const description =
    mode === 'gate'
      ? t({ en: `A board with ${single ? 'switch A' : 'switches A and B'}, a ${GATES[gate].name.en} gate and a lamp Q. A = ${a}${single ? '' : `, B = ${b}`}, Q = ${out}.`, vi: `Bảng mạch có ${single ? 'công tắc A' : 'công tắc A và B'}, cổng ${GATES[gate].name.en} và đèn Q. A = ${a}${single ? '' : `, B = ${b}`}, Q = ${out}.` })
      : mode === 'half-adder'
        ? t({ en: `Half adder: A = ${a}, B = ${b}; sum S = ${sum.s}, carry C = ${sum.c}.`, vi: `Bộ cộng bán phần: A = ${a}, B = ${b}; tổng S = ${sum.s}, nhớ C = ${sum.c}.` })
        : t({ en: `${config.bits} switches and lamps showing ${bits.join('')} in binary, ${value} in decimal.`, vi: `${config.bits} công tắc và đèn biểu diễn ${bits.join('')} ở hệ nhị phân, bằng ${value} ở hệ thập phân.` });
  const fallback = (message: string) => (
    <div className={`${styles.stage} flex flex-col items-center justify-center gap-2 rounded-md border border-line p-4 text-center`}>
      <p className="text-sm font-semibold text-ink">{message}</p>
      <p className="text-xs text-ink-muted">{t({ vi: 'Các nút công tắc và bảng bên dưới vẫn dùng được.', en: 'The switch buttons and the tables below still work.' })}</p>
    </div>
  );
  const steps = divisionSteps(value);
  const switches = mode === 'binary'
    ? bits.map((bit, i) => { const k = config.bits - 1 - i; return <SwitchButton key={k} label={`2${SUPERSCRIPT[k]}`} on={bit} onToggle={() => toggle(`b${k}`)} />; })
    : [<SwitchButton key="A" label="A" on={a} onToggle={() => toggle('A')} />, ...(mode === 'gate' && single ? [] : [<SwitchButton key="B" label="B" on={b} onToggle={() => toggle('B')} />])];
  // Drawn over the 3D view, like the ripple tank: readouts on top, the picked part's explanation
  // (and in full screen the switches) at the bottom.
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
  const hud = (expanded: boolean) => (
    <>
      <dl className={`${overlay.readouts} ${overlay.card}`}>
        {mode === 'binary'
          ? <><dt>{t({ vi: 'Nhị phân', en: 'Binary' })}</dt><dd>{bits.join('')}₂</dd><dt>{t({ vi: 'Thập phân', en: 'Decimal' })}</dt><dd>{value}</dd></>
          : <><dt>A</dt><dd>{a}</dd>{!(mode === 'gate' && single) && <><dt>B</dt><dd>{b}</dd></>}{mode === 'gate' ? <><dt>Q = {GATES[gate].expression}</dt><dd>{out}</dd></> : <><dt>{t({ vi: 'Tổng S', en: 'Sum S' })}</dt><dd>{sum.s}</dd><dt>{t({ vi: 'Nhớ C', en: 'Carry C' })}</dt><dd>{sum.c}</dd></>}</>}
      </dl>
      <div className={overlay.bottom}>
        {part && (
          <div aria-live="polite" className={`${overlay.card} ${overlay.part} ${overlay.interactive}`} onPointerDown={stop}>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{t(PARTS[part].name)}</p>
              <p className="mt-0.5 text-ink-muted">{t(PARTS[part].about)}</p>
            </div>
            <button type="button" className={overlay.tool} aria-label={t({ vi: 'Đóng', en: 'Close' })} onClick={() => setPart(null)}><X aria-hidden="true" className="h-4 w-4" /></button>
          </div>
        )}
        {expanded && <div className={`${overlay.card} ${overlay.dock} ${overlay.interactive}`} onPointerDown={stop}>{switches}</div>}
      </div>
    </>
  );
  const partNames = { switch: t(PARTS.switch.name), gate: t(PARTS.gate.name), wire: t(PARTS.wire.name), lamp: t(PARTS.lamp.name) };

  return (
    <div ref={host} className={`${PANEL} ${styles.palette}`}>
      {config.adjustable && (
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label={t({ en: 'What to explore', vi: 'Chế độ' })} value={mode} options={LOGIC_MODES.map((m) => ({ value: m, label: t(MODE_NAME[m]) }))} onChange={setMode} />
          {mode === 'gate' && <SelectField label={t({ en: 'Gate', vi: 'Cổng logic' })} value={gate} options={LOGIC_GATES.map((g) => ({ value: g, label: t(GATES[g].name) }))} onChange={setGate} />}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
      <div className="flex flex-col gap-3 lg:sticky lg:top-20">
      {mounted ? (
        <SceneBoundary fallback={fallback(t({ vi: 'Trình duyệt này không hiển thị được 3D.', en: 'This browser cannot display 3D.' }))}>
          <Suspense fallback={fallback(t({ vi: 'Đang tải hình 3D…', en: 'Loading the 3D view…' }))}>
            <LogicScene circuit={circuit} onToggle={toggle} running={active && !reduced} reduced={reduced} description={description} lang={lang} hud={hud} parts={partNames} part={part} onPart={setPart} />
          </Suspense>
        </SceneBoundary>
      ) : fallback(t({ vi: 'Đang tải hình 3D…', en: 'Loading the 3D view…' }))}
      </div>
      <div className="flex flex-col gap-4">

      {mode === 'gate' && (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-1">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <SwitchButton label="A" on={a} onToggle={() => toggle('A')} />
              {!single && <SwitchButton label="B" on={b} onToggle={() => toggle('B')} />}
            </div>
            <p aria-live="polite" className="rounded-md border border-line p-3 text-sm text-ink">
              <span className="font-semibold tabular-nums">Q = {GATES[gate].expression} = {out}</span>
              <span className="block text-ink-muted">{t(GATES[gate].rule)}</span>
            </p>
          </div>
          <TruthTable
            caption={t({ en: `Truth table of ${GATES[gate].name.en}`, vi: `Bảng chân lí của ${GATES[gate].name.en}` })}
            columns={single ? ['A', 'Q'] : ['A', 'B', 'Q']}
            rows={truthTable(gate).map((r) => (single ? [r.a, r.out] : [r.a, r.b!, r.out]))}
            current={single ? a : a * 2 + b}
          />
        </div>
      )}

      {mode === 'half-adder' && (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-1">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <SwitchButton label="A" on={a} onToggle={() => toggle('A')} />
              <SwitchButton label="B" on={b} onToggle={() => toggle('B')} />
            </div>
            <p aria-live="polite" className="rounded-md border border-line p-3 text-sm text-ink">
              <span className="block font-semibold tabular-nums">{a} + {b} = {sum.c}{sum.s}₂ = {a + b}</span>
              <span className="block tabular-nums">S = A XOR B = {sum.s} · C = A AND B = {sum.c}</span>
              <span className="block text-ink-muted">{t({ en: 'S is the sum bit, C the carry to the next column: 1 + 1 = 10 in binary.', vi: 'S là bit tổng, C là bit nhớ sang cột kế tiếp: 1 + 1 = 10 trong hệ nhị phân.' })}</span>
            </p>
          </div>
          <TruthTable caption={t({ en: 'Half adder', vi: 'Bộ cộng bán phần' })} columns={['A', 'B', 'C', 'S']} rows={([[0, 0], [0, 1], [1, 0], [1, 1]] as const).map(([x, y]) => [x, y, halfAdder(x, y).c, halfAdder(x, y).s])} current={a * 2 + b} />
        </div>
      )}

      {mode === 'binary' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label={t({ en: 'Bits, from the most significant', vi: 'Các bit, từ bit có trọng số lớn nhất' })}>
            {bits.map((bit, i) => {
              const k = config.bits - 1 - i;
              return <SwitchButton key={k} label={`2${SUPERSCRIPT[k]}`} on={bit} onToggle={() => toggle(`b${k}`)} />;
            })}
          </div>
          <p aria-live="polite" className="rounded-md border border-line p-3 text-sm text-ink">
            <span className="block text-lg font-bold tabular-nums">{bits.join('')}₂ = {value}₁₀</span>
            <span className="block tabular-nums">{placeValueSentence(value, config.bits)}</span>
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <button type="button" className={BUTTON} onClick={() => setValue((v) => (v + 1) % (max + 1))}><Plus aria-hidden="true" className="h-4 w-4" />1</button>
            <button type="button" className={BUTTON} onClick={() => setValue((v) => (v + max) % (max + 1))}><Minus aria-hidden="true" className="h-4 w-4" />1</button>
            <div className="flex flex-col gap-1">
              <label htmlFor={decimalId} className="text-sm font-semibold text-ink">{t({ en: `Decimal (0–${max})`, vi: `Số thập phân (0–${max})` })}</label>
              <input id={decimalId} type="number" inputMode="numeric" min={0} max={max} value={value} onChange={(e) => setValue(Math.min(Math.max(Math.round(Number(e.target.value) || 0), 0), max))} className="h-11 w-28 rounded-md border border-line bg-surface px-3 tabular-nums text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus" />
            </div>
          </div>
          {steps.length > 0 && (
            <div className="rounded-md bg-surface-sunken p-3 text-sm text-ink">
              <p className="font-semibold">{t({ en: `${value} to binary: divide by 2 until the quotient is 0`, vi: `Đổi ${value} sang nhị phân: chia liên tiếp cho 2 đến khi thương bằng 0` })}</p>
              <ol className="mt-1 tabular-nums">
                {steps.map((s, i) => <li key={i}>{s.n} : 2 = {s.q} {t({ en: 'remainder', vi: 'dư' })} <span className="font-bold">{s.r}</span></li>)}
              </ol>
              <p className="mt-1">{t({ en: 'Read the remainders from the bottom up:', vi: 'Đọc các số dư từ dưới lên:' })} <span className="font-bold tabular-nums">{steps.map((s) => s.r).reverse().join('')}₂</span></p>
            </div>
          )}
          <p className="text-xs text-ink-muted">{t({ en: `With ${config.bits} bits the largest number is ${max}; adding 1 to it wraps round to 0.`, vi: `Với ${config.bits} bit, số lớn nhất là ${max}; cộng thêm 1 sẽ quay về 0.` })}</p>
        </div>
      )}
      </div>
      </div>
      <SelfCheck question={config.question} answer={config.answer} lang={lang} />
    </div>
  );
}

function LogicView(props: Props) { return <LogicExperiment key={JSON.stringify(props.config)} {...props} />; }

function LogicEditor({ config, onChange, lang }: SimulationEditorProps<'logic-gates'>) {
  const t = pick(lang);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SelectField label={t({ en: 'Mode', vi: 'Chế độ' })} value={config.mode} options={LOGIC_MODES.map((m) => ({ value: m, label: t(MODE_NAME[m]) }))} onChange={(mode) => onChange({ ...config, mode })} />
      <SelectField label={t({ en: 'Gate', vi: 'Cổng logic' })} value={config.gate} options={LOGIC_GATES.map((g) => ({ value: g, label: t(GATES[g].name) }))} onChange={(gate) => onChange({ ...config, gate })} />
      <NumberField label={t({ en: 'Bits (binary mode)', vi: 'Số bit (chế độ nhị phân)' })} value={config.bits} min={4} max={8} step={1} onChange={(bits) => onChange({ ...config, bits })} />
      <NumberField label={t({ en: 'Starting value (binary mode)', vi: 'Giá trị ban đầu (chế độ nhị phân)' })} value={config.value} min={0} max={255} step={1} onChange={(value) => onChange({ ...config, value })} />
      <div className="sm:col-span-2">
        <CheckField label={t({ en: 'Learners may switch the mode and the gate', vi: 'Cho học sinh đổi chế độ và cổng logic' })} checked={config.adjustable} onChange={(adjustable) => onChange({ ...config, adjustable })} />
      </div>
      <div className="sm:col-span-2">
        <SelfCheckFields question={config.question} answer={config.answer} lang={lang} onChange={(next) => onChange({ ...config, ...next })} />
      </div>
    </div>
  );
}

export const logicModule: SimulationModule<'logic-gates'> = {
  kind: 'logic-gates',
  label: { en: 'Logic gates and binary 3D', vi: 'Cổng logic và hệ nhị phân 3D' },
  subject: { en: 'Informatics', vi: 'Tin học' },
  Editor: LogicEditor,
  Renderer: LogicView,
};
