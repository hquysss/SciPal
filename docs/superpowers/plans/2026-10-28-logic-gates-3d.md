# Plan: logic gates and binary 3D simulation

Spec: `docs/superpowers/specs/2026-10-28-logic-gates-3d-design.md`.

1. **Schema.** `LogicGatesConfig`, `LOGIC_GATES`, `LOGIC_MODES` in `packages/types/src/simulations.ts`; add the kind to the config map, kind list and hint table; copy to `backend/src/schemas/simulations.ts`; fixtures.
2. **Engine** `frontend/features/simulations/engines/logic.ts` with tests first: gate functions, truth tables, half adder, bits ↔ value, division by 2, place-value sentence.
3. **3D scene** `logicScene.tsx` + `logic.module.css`: board, extruded gate bodies, tube wires with pulses, switches with tipping levers, lamps; raycast picking for clicks and hover.
4. **Renderer** `logic.tsx`: mode and gate pickers, switch buttons, truth table, half-adder readout, binary row with +1/−1 and the division steps; editor; registry.
5. **Lab.** Catalogue entry (Tin học, Lớp 10), icon, `lab.test.tsx`, `views.test.tsx`, dev page `/dev/logic-gates`.
6. **Check.** Typecheck, web/types/backend tests, browser at 1280 and 375 px.
