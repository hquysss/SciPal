import type { ComponentType } from 'react';
import type { BuiltInSimulationKind, SimulationConfigByKind } from '@scipal/types';

export type Bilingual = { en: string; vi: string };
export type Lang = 'vi' | 'en';

export interface SimulationViewProps<K extends BuiltInSimulationKind> {
  config: SimulationConfigByKind[K];
  lang: Lang;
}

export interface SimulationEditorProps<K extends BuiltInSimulationKind> {
  config: SimulationConfigByKind[K];
  onChange: (config: SimulationConfigByKind[K]) => void;
  lang: Lang;
}

/** One template: teacher controls and the learner view, both driven only by `config`. */
export interface SimulationModule<K extends BuiltInSimulationKind> {
  kind: K;
  label: Bilingual;
  subject: Bilingual;
  Editor: ComponentType<SimulationEditorProps<K>>;
  Renderer: ComponentType<SimulationViewProps<K>>;
}

export const pick = (lang: Lang) => (text: Bilingual) => text[lang] || text.vi;
