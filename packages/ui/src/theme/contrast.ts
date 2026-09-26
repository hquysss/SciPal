/** Pure color math for WCAG checks. Inputs are #rrggbb strings. */
export function hexToRgb(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) throw new Error(`Expected #rrggbb color, got ${hex}`);
  const value = match[1];
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16)) as [number, number, number];
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Same result as CSS `color-mix(in srgb, fg <fgWeight*100>%, bg)`. */
export function mixHex(fg: string, bg: string, fgWeight: number): string {
  const a = hexToRgb(fg);
  const b = hexToRgb(bg);
  return `#${a
    .map((v, i) => Math.round(v * fgWeight + b[i] * (1 - fgWeight)).toString(16).padStart(2, '0'))
    .join('')}`;
}
