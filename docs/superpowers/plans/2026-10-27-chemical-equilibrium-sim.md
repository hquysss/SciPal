# Plan: chemical equilibrium (Le Chatelier) 3D simulation

Spec: `docs/superpowers/specs/2026-10-27-chemical-equilibrium-sim-design.md`.

1. **Schema.** `ChemicalEquilibriumConfig` and `EQUILIBRIUM_REACTIONS` in `packages/types/src/simulations.ts`; add the kind to `SIMULATION_CONFIGS`, `SIMULATION_KINDS` and the hint table; copy the file byte for byte to `backend/src/schemas/simulations.ts`; fixtures in `__fixtures__/simulations.json` (default, every control off, unknown reaction).
2. **Engine** `frontend/features/simulations/engines/equilibrium.ts` (pure): the four reactions with K at 25 °C and ΔH from standard formation data (ΔfH°, ΔfG° at 298 K, as in the CRC Handbook / NIST tables), Kc(T) by van 't Hoff and Kp → Kc, exact equilibrium extent by bisection on ln Q − ln K, relaxation over time, the shift of a change and its reason. Tests first: Q = K, every Le Chatelier rule, catalyst keeps the end state, `hi` ignores pressure.
3. **Renderer** `equilibrium.tsx`: controls, predict-first panel, readout (T, V, Kc, Qc, concentrations), concentration–time graph (SVG, tokens), SVG fallback; editor; register in `registry.ts`.
4. **3D scene** `equilibriumScene.tsx` + `equilibrium.module.css`: cylinder and piston or beaker, instanced CPK atoms per element, drift, conversions towards the counts the engine gives, flashes at equilibrium; still under reduced motion.
5. **Lab.** Catalogue entry (Hoá học, Lớp 11), icon in `LabIndex.tsx`, tests in `lab.test.tsx` and `views.test.tsx`.
6. **Check.** `pnpm turbo typecheck`, web, types and backend tests; `/lab/chemical-equilibrium` in the browser at 1280 and 375 px, light and dark.

Not in this plan: the lesson "3D" tag migration, putting the block into a lesson.
