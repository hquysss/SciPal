const COLOR_NAMES =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const UTILITIES =
  'bg|text|border(?:-[trblxyse])?|from|via|to|ring|ring-offset|outline|fill|stroke|divide|placeholder|decoration|shadow|caret|accent';

const PALETTE_CLASS = new RegExp(
  `(?<![\\w-])(?:${UTILITIES})-(?:(?:${COLOR_NAMES})-(?:50|[1-9]00|950)|white|black)(?![\\w-])`,
  'g',
);
const HEX_COLOR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![\w-])/g;
const DARK_VARIANT = /(?<![\w-])dark:/g;

export function countRawColors(source: string) {
  const palette = source.match(PALETTE_CLASS)?.length ?? 0;
  const hex = source.match(HEX_COLOR)?.length ?? 0;
  const dark = source.match(DARK_VARIANT)?.length ?? 0;
  return { palette, hex, dark, total: palette + hex + dark };
}
