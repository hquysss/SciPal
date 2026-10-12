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

## Heart (`heart.glb`)

The four chambers, the valve leaflets and the great vessels of the heart come from the human-anatomy
`cardiovascular.glb` (the same family of files as the knee-reflex anatomy, see
`../knee-reflex/README.md`): BodyParts3D, The Database Center for Life Science (DBCLS), Japan,
CC BY-SA 2.1 Japan; Z-Anatomy, the libre 3D atlas of anatomy, CC BY-SA 4.0; GLB conversion by
JMK712/human-anatomy-online. Sources:

- https://github.com/Z-Anatomy/Models-of-human-anatomy
- https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html
- https://github.com/JMK712/human-anatomy-online/tree/322ba39e96ea91ce08601caad2c0aaade1dc99f0/public/models

SciPal modifications: selected structures only, moved to the middle of the heart and scaled, one mesh
per structure centred on its own middle so it can be moved or squeezed, Draco-compressed.

This derivative model is shared under Creative Commons Attribution-ShareAlike 4.0 International:
https://creativecommons.org/licenses/by-sa/4.0/. The licence applies to this asset, not to SciPal's
application code.

The source has no anterior leaflet for the tricuspid and mitral valves; the build adds each as a copy of an existing leaflet turned about the valve's axis (so those two leaflets are synthetic, not anatomy from the source).

Rebuild with `node scripts/assets/build-heart.mjs <source-folder>` from the repository root; the folder
must hold `cardiovascular.glb`. The script also writes `frontend/features/simulations/circulationHeartParts.ts`.
