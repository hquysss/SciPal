'use client';

import type { SimulationModule } from './types';

export const complexityModule: SimulationModule<'complexity-sim'> = {
  kind: 'complexity-sim',
  label: { en: 'Algorithm complexity', vi: 'Độ phức tạp thuật toán' },
  subject: { en: 'Informatics', vi: 'Tin học' },
  Editor: () => null,
  Renderer: () => null,
};
