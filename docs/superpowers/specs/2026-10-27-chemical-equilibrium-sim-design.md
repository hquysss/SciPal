# Chemical equilibrium (Le Chatelier) simulation — design

## Problem
Chemistry has one simulation (`titration`). Hoá 11 opens with chemical equilibrium (KNTT Bài 1), and students find two ideas hard to picture: the equilibrium is dynamic (both reactions keep running at the same rate), and a change in concentration, pressure or temperature moves it in a direction you can predict. A drawing in the book cannot show either.

## Scope
A new built-in kind `chemical-equilibrium`, in the Lab (Hoá học, Lớp 11) and usable as a lesson block. Same pattern as `titration`:
- Schema `ChemicalEquilibriumConfig` in `packages/types/src/simulations.ts`, the byte-identical copy in `backend/src/schemas/simulations.ts`, limits text in the config hint table.
- Engine `frontend/features/simulations/engines/equilibrium.ts` (pure functions, unit tested).
- Renderer `frontend/features/simulations/equilibrium.tsx` with a lazy three.js scene `equilibriumScene.tsx` (same pattern as `harmonic-3d`: orbit camera from `scene3d.tsx`, an SVG fallback without WebGL), registered in `registry.ts`; Lab entry in `features/lab/catalog.ts`.
No backend route, no migration. Content stays data: a lesson picks the reaction and the controls in the block config.

## Reactions (enum, first is the default)
| id | Reaction | What it teaches |
|---|---|---|
| `no2` | 2NO₂ (nâu đỏ) ⇌ N₂O₄ (không màu), ΔH < 0 | temperature and pressure, with a colour you can see |
| `haber` | N₂ + 3H₂ ⇌ 2NH₃, ΔH < 0 | pressure, temperature, catalyst (industrial trade-off) |
| `hi` | H₂ + I₂ ⇌ 2HI | pressure changes nothing (equal moles of gas) |
| `fescn` | Fe³⁺ + SCN⁻ ⇌ FeSCN²⁺ (đỏ máu) | concentration, in solution |

K at 25 °C and ΔH for each come from a cited table in the engine; the values must be checked against the KNTT book and a standard data source before merge (to do in the plan, not guessed).

## Behaviour
- **Vessel (3D):** a glass cylinder with a piston for the gases, a beaker for `fescn`. Molecules are ball models in CPK colours (N blue, O red, H white, I violet, Fe orange, S yellow, C grey), at most ~160, drifting and turning. At equilibrium one forward and one reverse reaction keep happening with a short flash, so the "dynamic" idea is visible. The gas is tinted brown by [NO₂], the solution red by [FeSCN²⁺]. The piston moves with the volume. Drag to turn, pinch or Ctrl + wheel to zoom.
- **Controls** (each can be turned off in the config), as step buttons so each change is one event to predict: add or remove one species; compress or expand (volume 0.25–4 L); heat or cool (range per reaction, 0–150 °C for `no2`, 200–600 °C for `haber` and `hi`); catalyst on/off for `haber` and `hi`. `fescn` has concentration only (no ΔH value is used for it).
- **Engine:** the equilibrium is solved exactly from K (bisection on the extent, as in titration), and K(T) follows van 't Hoff from ΔH. The approach over time is an exponential relaxation of the extent towards that exact equilibrium, so the graph is right at the start and at the end; its speed is illustrative. A catalyst shortens the time constant: the system gets there faster and lands at the same place. ΔH is taken as constant over the temperature range (an approximation the page states).
- **Readout:** a concentration–time graph per species, Q and K side by side, and one line in words: "Cân bằng chuyển dịch theo chiều thuận / nghịch / không chuyển dịch", with the reason ("giảm nồng độ NO₂", "tăng áp suất về phía ít mol khí hơn").
- **Predict first** (optional, on by default): before a change takes effect, the learner picks Thuận / Nghịch / Không chuyển dịch, then sees the result and the explanation. No XP or score: it is display only, so nothing goes to the server.
- **Bilingual:** every label and line is `{ en, vi }`. Formulas use subscripts in both languages.
- **Accessibility:** colour is never the only cue (labels, numbers, the words line). The graph has a text summary. Controls are native inputs with labels, 44px targets. Under `prefers-reduced-motion` the particles stand still and the graph jumps to the new state.
- **Styling:** theme tokens and `--accent` only; species colours come from a fixed token list (the raw-color ratchet must stay at 0).

## Config
```ts
{
  reaction: 'no2' | 'haber' | 'hi' | 'fescn',   // default 'no2'
  controls: { concentration: boolean; pressure: boolean; temperature: boolean; catalyst: boolean }, // all true
  predict: boolean,        // default true
  adjustable: boolean,     // learner may switch the reaction; default true
}
```

## Out of scope
Solving Kc exercises step by step, more than four reactions, sound, saving a learner's runs, the lesson "3D" tag (needs a migration of `subject_lesson_tags`, done separately).

## Tests
- Engine: the equilibrium satisfies Q = K within 1e-6 for each reaction. Le Chatelier holds for each change: more reactant shifts forward; less volume shifts toward fewer moles of gas and does nothing for `hi`; heating an exothermic reaction shifts it back. A catalyst changes the time to equilibrium, not the end state.
- Schema: defaults, limits, unknown reaction rejected; the backend copy is byte-identical (existing test).
- Renderer: the words line and the predict feedback appear in Vietnamese; controls turned off in the config are absent.

## Done when
`pnpm turbo typecheck` and the tests pass, the Lab page shows the simulation at 1280 and 375 px in light and dark without horizontal scroll, and the K and ΔH values are checked against their sources.
