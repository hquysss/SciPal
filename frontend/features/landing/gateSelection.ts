import type { EducationLevel } from './educationLevel';

/** Length of the notebook cover flip before a guest choice is applied. */
export const GATE_FLIP_MS = 400;

interface GateSelectionOptions {
  reducedMotion: boolean;
  schedule: (fn: () => void, ms: number) => void;
  onSelect: (level: EducationLevel) => void;
}

/** First choice wins; repeated clicks during the flip are ignored. */
export function createGateSelection({ reducedMotion, schedule, onSelect }: GateSelectionOptions) {
  let chosen: EducationLevel | null = null;

  return {
    select(level: EducationLevel) {
      if (chosen !== null) return;
      chosen = level;
      if (reducedMotion) onSelect(level);
      else schedule(() => onSelect(level), GATE_FLIP_MS);
    },
    pending(): EducationLevel | null {
      return chosen;
    },
  };
}
