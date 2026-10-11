# Circulation asset

`circulation.glb` is "Circulatory System" by brianj.seely, from Sketchfab:
https://sketchfab.com/3d-models/circulatory-system-3584d5b2b97545cf965007c195899b7b

Licensed under Creative Commons Attribution 4.0 International (CC BY 4.0):
https://creativecommons.org/licenses/by/4.0/

SciPal modifications: the baked English labels and the ambient-occlusion texture are removed, the
textures are resized, the mesh is Draco-compressed, and three vertex attributes are added for the
simulation: `_VESSEL` (artery, vein or organ, read from the texture colour), `_REACH` (distance along
the vessels from the heart) and `_LOOP` (heart, pulmonary or systemic circulation).

The Draco decoder it needs is served from `/models/draco/`.

Rebuild from the original download with `node scripts/assets/build-circulation.mjs <source-folder>`
from the repository root; the folder must hold `CirculatorySystem.glb`. The script also regenerates
`frontend/features/simulations/circulationLandmarks.ts`.
