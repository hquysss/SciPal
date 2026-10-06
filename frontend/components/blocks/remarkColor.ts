// `{red:chữ}` colours a piece of text. Only these names are accepted, and they map to theme
// tokens in TheoryRenderer, so a lesson can never carry arbitrary CSS or HTML.
export const TEXT_COLORS = ['red', 'green', 'blue', 'orange'] as const;
export type TextColor = (typeof TEXT_COLORS)[number];

// The words may hold one nested tag (`{blue:a {term:…:b} c}`), which remarkTerm then reads inside the colour.
const PATTERN = new RegExp(`\\{(${TEXT_COLORS.join('|')}):((?:[^{}\\n]|\\{[a-z]+:[^{}\\n]*\\})+)\\}`, 'g');

type MdNode = { type: string; value?: string; children?: MdNode[]; data?: Record<string, unknown> };

function split(value: string): MdNode[] | null {
  const out: MdNode[] = [];
  let last = 0;
  for (const match of value.matchAll(PATTERN)) {
    if (match.index > last) out.push({ type: 'text', value: value.slice(last, match.index) });
    out.push({
      type: 'textColor',
      data: { hName: 'span', hProperties: { 'data-color': match[1] } },
      children: [{ type: 'text', value: match[2] }],
    });
    last = match.index + match[0].length;
  }
  if (out.length === 0) return null;
  if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
  return out;
}

function walk(node: MdNode) {
  if (!node.children) return;
  const next: MdNode[] = [];
  for (const child of node.children) {
    const parts = child.type === 'text' && child.value ? split(child.value) : null;
    if (parts) next.push(...parts);
    else {
      walk(child);
      next.push(child);
    }
  }
  node.children = next;
}

/** Text nodes only, so `{red:…}` inside code or a formula stays as typed. */
export function remarkColor() {
  return (tree: MdNode) => walk(tree);
}
