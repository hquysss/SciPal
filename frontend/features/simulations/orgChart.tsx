'use client';

import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { ORG_CHART_MAX_DEPTH, ORG_CHART_MAX_NODES, SIMULATION_CONFIGS, type OrgChartNode, type SimulationConfigByKind } from '@scipal/types';
import { BUTTON, PANEL } from './controls';
import { JsonConfigEditor, issuePath, type ConfigIssue } from './jsonConfigEditor';
import { pick, type Lang, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';

type Chart = SimulationConfigByKind['org-chart'];

const hasMore = (node: OrgChartNode) => node.children.length > 0 || Boolean(node.text.vi || node.text.en);

/** Paths ("0", "0.1", "0.1.2"…) of every box that opens. */
function openable(node: OrgChartNode, path = '0'): string[] {
  return [...(hasMore(node) ? [path] : []), ...node.children.flatMap((child, i) => openable(child, `${path}.${i}`))];
}

function Box({ node, path, depth, open, onToggle, lang }: { node: OrgChartNode; path: string; depth: number; open: Set<string>; onToggle: (path: string, open: boolean) => void; lang: Lang }) {
  const t = pick(lang);
  const text = t(node.text);
  const box = `flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-left ${
    depth === 0 ? 'border-[var(--accent,var(--action))] bg-surface-sunken font-bold text-ink' : 'border-line bg-surface font-semibold text-ink'
  }`;
  // A short tick joins each box to its parent's line.
  const item = depth === 0 ? '' : "relative before:absolute before:-left-3 before:top-[1.375rem] before:h-0.5 before:w-3 before:bg-line before:content-[''] sm:before:-left-4 sm:before:w-4";

  if (!hasMore(node)) {
    return (
      <li className={item}>
        <div className={box}>{t(node.label)}</div>
      </li>
    );
  }
  const isOpen = open.has(path);
  return (
    <li className={item}>
      <details open={isOpen} onToggle={(e) => onToggle(path, e.currentTarget.open)}>
        <summary className={`${box} cursor-pointer list-none hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden`}>
          <ChevronRight aria-hidden="true" className={`h-4 w-4 shrink-0 text-ink-muted transition-transform motion-reduce:transition-none ${isOpen ? 'rotate-90' : ''}`} />
          <span className="min-w-0 flex-1">{t(node.label)}</span>
          {node.children.length > 0 && (
            <span className="shrink-0 rounded-full bg-surface-sunken px-2 text-xs font-semibold tabular-nums text-ink-muted">
              {node.children.length}
              <span className="sr-only"> {t({ en: 'parts', vi: 'bộ phận' })}</span>
            </span>
          )}
        </summary>
        {text && <p className="ml-6 mt-1.5 text-sm text-ink">{text}</p>}
        {node.children.length > 0 && (
          <ul className="ml-2 mt-2 flex flex-col gap-2 border-l-2 border-line pl-3 sm:ml-3 sm:pl-4">
            {node.children.map((child, i) => (
              <Box key={i} node={child} path={`${path}.${i}`} depth={depth + 1} open={open} onToggle={onToggle} lang={lang} />
            ))}
          </ul>
        )}
      </details>
    </li>
  );
}

/** The chart as a tree that opens one level at a time; only the top box starts open. */
export function OrgChartView({ config, lang }: SimulationViewProps<'org-chart'>) {
  const t = pick(lang);
  const all = useMemo(() => openable(config.root), [config.root]);
  const [open, setOpen] = useState<Set<string>>(() => new Set(['0']));
  const toggle = (path: string, isOpen: boolean) =>
    setOpen((current) => {
      if (current.has(path) === isOpen) return current;
      const next = new Set(current);
      if (isOpen) next.add(path);
      else next.delete(path);
      return next;
    });

  return (
    <div className={PANEL}>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={BUTTON} disabled={open.size === all.length} onClick={() => setOpen(new Set(all))}>
          {t({ en: 'Open all', vi: 'Mở hết' })}
        </button>
        <button type="button" className={BUTTON} disabled={open.size === 0} onClick={() => setOpen(new Set())}>
          {t({ en: 'Close all', vi: 'Thu gọn' })}
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        <Box node={config.root} path="0" depth={0} open={open} onToggle={toggle} lang={lang} />
      </ul>
    </div>
  );
}

function explain(issue: ConfigIssue): { en: string; vi: string } {
  const at = issuePath(issue.path);
  if (issue.message === 'depth') return { en: `${at}: too deep; a chart has at most ${ORG_CHART_MAX_DEPTH} levels.`, vi: `${at}: quá sâu; sơ đồ tối đa ${ORG_CHART_MAX_DEPTH} cấp.` };
  if (issue.message === 'count') return { en: `${at}: at most ${ORG_CHART_MAX_NODES} boxes in all.`, vi: `${at}: cả sơ đồ tối đa ${ORG_CHART_MAX_NODES} ô.` };
  return { en: `${at}: ${issue.message}`, vi: `${at}: giá trị không hợp lệ (${issue.message}).` };
}

function OrgChartEditor({ config, onChange, lang }: SimulationEditorProps<'org-chart'>) {
  return (
    <JsonConfigEditor
      config={config}
      schema={SIMULATION_CONFIGS['org-chart']}
      onChange={onChange as (c: Chart) => void}
      lang={lang}
      explain={explain}
      help={{
        en: `root: the top box. Each box has label { vi, en }, text (opens with the box) and children (up to 12 boxes). At most ${ORG_CHART_MAX_DEPTH} levels and ${ORG_CHART_MAX_NODES} boxes.`,
        vi: `root: ô trên cùng. Mỗi ô có label { vi, en } (tên), text (giải thích, hiện khi mở ô) và children (tối đa 12 ô con). Tối đa ${ORG_CHART_MAX_DEPTH} cấp và ${ORG_CHART_MAX_NODES} ô.`,
      }}
    />
  );
}

export const orgChartModule: SimulationModule<'org-chart'> = {
  kind: 'org-chart',
  label: { en: 'Organisation chart', vi: 'Sơ đồ tổ chức' },
  subject: { en: 'History', vi: 'Lịch sử' },
  Editor: OrgChartEditor,
  Renderer: OrgChartView,
};
