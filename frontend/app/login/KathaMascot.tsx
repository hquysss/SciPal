'use client';

import { SciPalMascot, type SciPalMascotProps } from './SciPalMascot';

export { SciPalMascot };

/**
 * Backward compatibility alias for KathaMascot
 */
export function KathaMascot(props: SciPalMascotProps) {
  return <SciPalMascot {...props} />;
}
