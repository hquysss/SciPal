import type { ReactNode } from 'react';
import type { ThemeLevel } from './palettes';

interface LevelScopeProps {
  level: ThemeLevel;
  className?: string;
  children: ReactNode;
}

/**
 * Re-scopes theme tokens to a content level (e.g. a grade 5 lesson shown to a THPT student).
 * Place it outside SubjectProvider so --accent-ink mixes with this level's ink.
 */
export function LevelScope({ level, className, children }: LevelScopeProps) {
  return (
    <div data-level={level} className={className}>
      {children}
    </div>
  );
}
