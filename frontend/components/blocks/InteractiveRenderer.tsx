'use client';

import type { ComponentType } from 'react';
import { isBuiltInSimulation, simulationConfig, type InteractiveBlock } from '@scipal/types';
import { useLanguage } from '@scipal/hooks';
import { EmbedRenderer } from '@/features/simulations/EmbedRenderer';
import { simulationModules } from '@/features/simulations/registry';
import type { SimulationViewProps } from '@/features/simulations/types';

/**
 * A simulation block, the same on the learner page and in the Studio preview. `lang` overrides the
 * reader's language (the editor previews either language).
 */
export function InteractiveRenderer({ block, lang: langOverride }: { block: InteractiveBlock; lang?: 'en' | 'vi' }) {
  const { lang: readerLang } = useLanguage();
  const lang = langOverride ?? readerLang;
  const t = (text: { en: string; vi: string }) => text[lang] || text.vi;

  let body;
  if (block.kind === 'embed') {
    body = <EmbedRenderer url={block.embed_url} title={t(block.heading)} lang={lang} />;
  } else if (isBuiltInSimulation(block.kind)) {
    const config = simulationConfig(block.kind, block.config);
    const Renderer = simulationModules[block.kind].Renderer as ComponentType<SimulationViewProps<typeof block.kind>>;
    body = config ? (
      // Keyed by config: a Studio edit restarts the simulation from the new settings.
      <Renderer key={JSON.stringify(config)} config={config as never} lang={lang} />
    ) : (
      <p role="note" className="rounded-md border border-dashed border-edge bg-surface-sunken p-6 text-center text-sm text-ink-muted">
        {t({ en: 'This simulation cannot be opened: its settings are out of range.', vi: 'Không mở được mô phỏng này: thông số không hợp lệ.' })}
      </p>
    );
  } else {
    body = (
      <p role="note" className="flex h-44 items-center justify-center rounded-lg bg-surface-sunken p-4 text-center text-sm text-ink-muted">
        {t({ en: 'This kind has no working simulation yet.', vi: 'Loại này chưa có mô phỏng chạy được.' })}
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-3" aria-label={t(block.heading)}>
      <div>
        <p className="font-semibold text-ink">{t(block.heading)}</p>
        {block.caption && t(block.caption) && <p className="text-sm text-ink-muted">{t(block.caption)}</p>}
      </div>
      {body}
    </section>
  );
}
