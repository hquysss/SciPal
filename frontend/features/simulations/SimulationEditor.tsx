'use client';

import { useId, type ComponentType } from 'react';
import {
  defaultSimulationConfig,
  embedUrl,
  isBuiltInSimulation,
  simulationDraft,
  validateSimulationBlock,
  type BuiltInSimulationKind,
  type InteractiveBlock,
} from '@scipal/types';
import { LangTabs } from '@/features/authoring/editor/editors/LangTabs';
import { FIELD } from './controls';
import { simulationModules } from './registry';
import { pick, type Lang, type SimulationEditorProps } from './types';

export type NewSimulationKind = BuiltInSimulationKind | 'embed';

export const EMBED_LABEL = { en: 'Embed a PhET / GeoGebra / Desmos link', vi: 'Nhúng link PhET / GeoGebra / Desmos' };

/** A fresh simulation block: built-in templates start offline with their defaults. */
export function newSimulationBlock(kind: NewSimulationKind): InteractiveBlock {
  if (kind === 'embed') return { type: 'interactive', kind: 'embed', heading: { vi: '', en: '' }, offline: false, config: {} };
  return { type: 'interactive', kind, heading: { ...simulationModules[kind].label }, offline: true, config: defaultSimulationConfig(kind) };
}

interface SimulationBlockEditorProps {
  block: InteractiveBlock;
  onChange: (block: InteractiveBlock) => void;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
}

/** Heading and caption in both languages, then the template's own settings or the embed link. */
export function SimulationEditor({ block, onChange, lang, onLangChange }: SimulationBlockEditorProps) {
  const t = pick(lang);
  const id = useId();
  const caption = block.caption ?? { vi: '', en: '' };
  const missingEnglish = Boolean((block.heading.vi.trim() && !block.heading.en.trim()) || (caption.vi.trim() && !caption.en.trim()));

  let settings;
  if (block.kind === 'embed') {
    const valid = Boolean(block.embed_url && embedUrl(block.embed_url));
    settings = (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-url`} className="text-sm font-semibold text-ink">
          {t({ en: 'Link to embed', vi: 'Link cần nhúng' })}
        </label>
        <input
          id={`${id}-url`}
          type="url"
          inputMode="url"
          value={block.embed_url ?? ''}
          placeholder="https://phet.colorado.edu/sims/html/…"
          aria-invalid={block.embed_url ? !valid || undefined : undefined}
          onChange={(e) => {
            const value = e.target.value.trim();
            const { embed_url: _old, ...rest } = block;
            onChange(value ? { ...rest, embed_url: value } : rest);
          }}
          className={FIELD}
        />
        <p className={`text-xs ${block.embed_url && !valid ? 'font-medium text-danger' : 'text-ink-muted'}`}>
          {t({
            en: 'PhET, GeoGebra or Desmos over https: phet.colorado.edu/sims/html/…, www.geogebra.org/m/…, www.desmos.com/calculator/….',
            vi: 'PhET, GeoGebra hoặc Desmos (https): phet.colorado.edu/sims/html/…, www.geogebra.org/m/…, www.desmos.com/calculator/….',
          })}
        </p>
      </div>
    );
  } else if (isBuiltInSimulation(block.kind)) {
    const kind = block.kind;
    const Editor = simulationModules[kind].Editor as ComponentType<SimulationEditorProps<typeof kind>>;
    // The teacher's settings as stored, even mid-edit; problems are shown, never replaced by defaults.
    const config = simulationDraft(kind, block.config);
    const check = validateSimulationBlock(block, { mediaBase: process.env.NEXT_PUBLIC_MEDIA_PUBLIC_URL });
    settings = (
      <fieldset className="flex flex-col gap-3 rounded-lg border border-line p-3">
        <legend className="px-1 text-sm font-semibold text-ink">{t(simulationModules[kind].label)}</legend>
        <Editor
          config={config as never}
          // Built-in templates always run offline, whatever an older import stored.
          onChange={(next: unknown) => onChange({ ...block, offline: true, config: next as Record<string, unknown> })}
          lang={lang}
        />
        {!check.ok && (
          <p role="alert" className="text-sm font-medium text-danger">
            {t(check.message)}
          </p>
        )}
      </fieldset>
    );
  } else {
    settings = (
      <p className="rounded-lg border border-dashed border-edge bg-surface-sunken p-3 text-sm text-ink-muted">
        {t({
          en: 'This is an older kind with no working simulation. Add a new template and delete this block.',
          vi: 'Đây là loại mẫu cũ chưa chạy được. Hãy thêm một mẫu mới rồi xóa khối này.',
        })}
      </p>
    );
  }

  const text = (key: 'heading' | 'caption', label: string, value: { vi: string; en: string }) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${id}-${key}`} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={`${id}-${key}`}
        value={value[lang]}
        maxLength={200}
        aria-invalid={key === 'heading' && lang === 'vi' && !value.vi.trim() ? true : undefined}
        onChange={(e) => onChange({ ...block, [key]: { ...value, [lang]: e.target.value } })}
        className={FIELD}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <LangTabs lang={lang} onLangChange={onLangChange} missingEnglish={missingEnglish} />
      {text('heading', t({ en: 'Heading', vi: 'Tiêu đề' }), block.heading)}
      {text('caption', t({ en: 'Instructions for learners (optional)', vi: 'Hướng dẫn cho học sinh (không bắt buộc)' }), caption)}
      {settings}
    </div>
  );
}
