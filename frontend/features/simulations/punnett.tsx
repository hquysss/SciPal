'use client';

import { Plus, X } from 'lucide-react';
import type { SimulationConfigByKind } from '@scipal/types';
import { BUTTON, Field, FIELD, PANEL, SelectField } from './controls';
import { punnettCross } from './engines/punnett';
import { pick, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';

type Gene = SimulationConfigByKind['punnett']['genes'][number];

function PunnettView({ config, lang }: SimulationViewProps<'punnett'>) {
  const t = pick(lang);
  const cross = punnettCross(config);
  const parent = (key: 'mother' | 'father') => config.genes.map((g) => g[key]).join('');

  return (
    <div className={PANEL}>
      <p className="text-sm text-ink">
        P: <span className="font-mono font-semibold">{parent('mother')}</span> × <span className="font-mono font-semibold">{parent('father')}</span>
      </p>
      <div className="overflow-x-auto">
        <table className="mx-auto border-collapse text-center font-mono text-sm">
          <caption className="pb-2 text-left font-sans text-xs text-ink-muted">
            {t({ en: "Rows: mother's gametes · columns: father's gametes", vi: 'Hàng: giao tử của mẹ · cột: giao tử của bố' })}
          </caption>
          <thead>
            <tr>
              <td />
              {cross.gametes.father.map((g, i) => (
                <th key={i} scope="col" className="min-w-12 border border-line bg-surface-sunken px-2 py-1.5 font-semibold text-ink">
                  {g}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cross.square.map((row, r) => (
              <tr key={r}>
                <th scope="row" className="border border-line bg-surface-sunken px-2 py-1.5 font-semibold text-ink">
                  {cross.gametes.mother[r]}
                </th>
                {row.map((genotype, c) => (
                  <td key={c} className="border border-line px-2 py-1.5 text-ink">
                    {genotype}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-ink">{t({ en: 'Genotype ratio', vi: 'Tỉ lệ kiểu gen' })}</dt>
          <dd className="font-mono text-ink">{cross.genotypes.map((g) => g.count).join(' : ')}</dd>
          <dd className="text-ink-muted">{cross.genotypes.map((g) => `${g.count} ${g.genotype}`).join(' · ')}</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">{t({ en: 'Phenotype ratio', vi: 'Tỉ lệ kiểu hình' })}</dt>
          <dd className="font-mono text-ink">{cross.phenotypes.map((p) => p.count).join(' : ')}</dd>
          <dd className="text-ink-muted">{cross.phenotypes.map((p) => `${p.count} ${p.traits.map(t).join(', ')}`).join(' · ')}</dd>
        </div>
      </dl>
    </div>
  );
}

const genotypes = (symbol: string) => [symbol + symbol, symbol + symbol.toLowerCase(), symbol.toLowerCase() + symbol.toLowerCase()];

function GeneEditor({ gene, onChange, lang }: { gene: Gene; onChange: (gene: Gene) => void; lang: 'vi' | 'en' }) {
  const t = pick(lang);
  const setSymbol = (raw: string) => {
    const symbol = raw.trim().slice(-1).toUpperCase();
    if (!/^[A-Z]$/.test(symbol)) return;
    const swap = (g: string) => [...g].map((ch) => (ch === ch.toUpperCase() ? symbol : symbol.toLowerCase())).join('');
    onChange({ ...gene, symbol, mother: swap(gene.mother), father: swap(gene.father) });
  };
  const trait = (key: 'dominant' | 'recessive', lng: 'vi' | 'en', label: string) => (
    <Field label={label}>
      {(id) => <input id={id} value={gene[key][lng]} maxLength={200} onChange={(e) => onChange({ ...gene, [key]: { ...gene[key], [lng]: e.target.value } })} className={FIELD} />}
    </Field>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label={t({ en: 'Gene letter', vi: 'Chữ của gen' })}>
        {(id) => <input id={id} value={gene.symbol} maxLength={2} onChange={(e) => setSymbol(e.target.value)} className={`${FIELD} font-mono`} />}
      </Field>
      <SelectField
        label={t({ en: 'Mother', vi: 'Mẹ' })}
        value={gene.mother}
        options={genotypes(gene.symbol).map((g) => ({ value: g, label: g }))}
        onChange={(mother) => onChange({ ...gene, mother })}
      />
      <SelectField
        label={t({ en: 'Father', vi: 'Bố' })}
        value={gene.father}
        options={genotypes(gene.symbol).map((g) => ({ value: g, label: g }))}
        onChange={(father) => onChange({ ...gene, father })}
      />
      {trait('dominant', 'vi', t({ en: 'Dominant trait (VI)', vi: 'Tính trạng trội (VI)' }))}
      {trait('dominant', 'en', t({ en: 'Dominant trait (EN)', vi: 'Tính trạng trội (EN)' }))}
      <span className="hidden sm:block" />
      {trait('recessive', 'vi', t({ en: 'Recessive trait (VI)', vi: 'Tính trạng lặn (VI)' }))}
      {trait('recessive', 'en', t({ en: 'Recessive trait (EN)', vi: 'Tính trạng lặn (EN)' }))}
    </div>
  );
}

function PunnettEditor({ config, onChange, lang }: SimulationEditorProps<'punnett'>) {
  const t = pick(lang);
  const setGene = (i: number, gene: Gene) => onChange({ ...config, genes: config.genes.map((g, j) => (j === i ? gene : g)) });
  const nextSymbol = 'BCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find((s) => !config.genes.some((g) => g.symbol === s)) ?? 'B';
  return (
    <div className="flex flex-col gap-4">
      {config.genes.map((gene, i) => (
        <fieldset key={i} className="flex flex-col gap-3 rounded-lg border border-line p-3">
          <legend className="px-1 text-sm font-semibold text-ink">{t({ en: `Gene ${i + 1}`, vi: `Gen ${i + 1}` })}</legend>
          <GeneEditor gene={gene} onChange={(g) => setGene(i, g)} lang={lang} />
          {config.genes.length > 1 && (
            <button type="button" className={`${BUTTON} self-start`} onClick={() => onChange({ ...config, genes: config.genes.filter((_, j) => j !== i) })}>
              <X aria-hidden="true" className="h-4 w-4" />
              {t({ en: 'Remove this gene', vi: 'Bỏ gen này' })}
            </button>
          )}
        </fieldset>
      ))}
      {config.genes.length < 2 && (
        <button
          type="button"
          className={`${BUTTON} self-start`}
          onClick={() =>
            onChange({
              ...config,
              genes: [
                ...config.genes,
                {
                  symbol: nextSymbol,
                  mother: nextSymbol + nextSymbol.toLowerCase(),
                  father: nextSymbol + nextSymbol.toLowerCase(),
                  dominant: { vi: 'Vỏ trơn', en: 'Smooth' },
                  recessive: { vi: 'Vỏ nhăn', en: 'Wrinkled' },
                },
              ],
            })
          }
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          {t({ en: 'Add a second gene', vi: 'Thêm gen thứ hai' })}
        </button>
      )}
    </div>
  );
}

export const punnettModule: SimulationModule<'punnett'> = {
  kind: 'punnett',
  label: { en: 'Punnett square', vi: 'Lai di truyền (bảng Punnett)' },
  subject: { en: 'Biology', vi: 'Sinh học' },
  Editor: PunnettEditor,
  Renderer: PunnettView,
};
