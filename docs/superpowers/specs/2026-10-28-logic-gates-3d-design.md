# Logic gates and binary 3D simulation — design

## Problem
Tin học 10 teaches binary numbers and the logic operations AND, OR, NOT, XOR (KNTT Chủ đề 2). The Lab has nothing for them: students meet truth tables and place values as static tables. Seeing a switch flip, a signal run down a wire and a lamp light makes the rules concrete, and so does flipping bits and watching the decimal value change.

## Scope
A new built-in kind `logic-gates`, in the Lab (Tin học, Lớp 10) and usable as a lesson block, following the `chemical-equilibrium` pattern: schema in `packages/types` with the byte-identical backend copy, a pure engine with tests, a renderer with a lazy three.js scene and an SVG/HTML fallback, a Lab entry. No backend route, no migration.

## Modes
1. **`gate`**: a circuit board with input switches A and B (only A for NOT), one gate drawn with its standard symbol (AND, OR, NOT, XOR, NAND, NOR), wires and an output lamp. The truth table sits beside it with the current row marked.
2. **`half-adder`**: A and B feed an XOR (sum S) and an AND (carry C), two lamps; the readout says A + B = CS in binary and in decimal.
3. **`binary`**: a row of 4–8 bits, each a switch with a lamp and its place value (2⁷ = 128 … 2⁰ = 1). The decimal value is the sum of the lit place values, written out ("8 + 4 + 1 = 13"). Buttons +1 and −1 show carries, and a decimal field converts by repeated division by 2, step by step.

## 3D (three.js)
- Gate bodies are extruded 2D outlines (`Shape` + `ExtrudeGeometry`): the D of AND, the curved shield of OR, the extra arc of XOR, the triangle of NOT, and a bubble for the inverted gates.
- Wires are tubes along curves (`TubeGeometry`). A wire at 1 glows, and small pulses travel along it. A wire at 0 is dull.
- Switches have a lever that tips over when pressed (an eased rotation). Lamps glow, and a point light shines around them when on.
- Clicking a switch in the 3D view toggles it: a raycast from the pointer, told apart from a drag, with a pointer cursor on hover. The same switches are also real buttons below the view (`aria-pressed`), so keyboards and screen readers get everything.
- Orbit camera, palette from CSS tokens, an SVG fallback without WebGL, and everything still under `prefers-reduced-motion` (no pulses or tilting animation).

## Config
```ts
{
  mode: 'gate' | 'half-adder' | 'binary', // default 'gate'
  gate: 'and' | 'or' | 'not' | 'xor' | 'nand' | 'nor', // default 'and'
  bits: 4–8,       // binary mode, default 8
  value: 0–255,    // binary mode starting value, taken modulo 2^bits; default 13
  adjustable: boolean, // learners may switch mode and gate; default true
  question, answer,    // optional self-check, as in other kinds
}
```

## Out of scope
Building your own circuits, full adders of several bits, signed numbers and two's complement, hexadecimal, the lesson "3D" tag.

## Tests
- Engine: every gate's truth table, the half adder for all four inputs, bits ↔ value round trips for 4–8 bits, division steps (13 → 1101), the place-value sentence.
- Schema: defaults, an unknown gate or mode rejected, bits outside 4–8 rejected; backend copy identical.
- Renderer: Vietnamese labels, a truth table with 4 rows (2 for NOT), the binary sentence for the default value, controls hidden when not adjustable.

## Done when
`pnpm turbo typecheck` and the tests pass, and `/dev/logic-gates` works in the browser at 1280 and 375 px: clicking a 3D switch and its button both toggle it.
