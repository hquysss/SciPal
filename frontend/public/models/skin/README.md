# Skin model

`skin.glb` is "Skin Cross Section Model" by iqcenter on Sketchfab
(https://sketchfab.com/3d-models/skin-cross-section-model-2e28bcb97e0148eda7665c45b0131a39),
licensed under Creative Commons Attribution 4.0 International (https://creativecommons.org/licenses/by/4.0/).

SciPal modifications: stray copies beside the block and a duplicate of the nerves removed; the meshes of
each material merged; the epidermis cells, fat, fibres, hair and nuclei simplified; textures shrunk to
512 px; re-centred and scaled; Draco-compressed. The pain, cold, warmth and pressure receptors shown in
the simulation are drawn by the app, not part of this model (the model's coiled corpuscle is used as the
touch receptor).

Rebuild from the repository root with `node scripts/assets/build-skin.mjs <source.glb>` (set
`ASSET_MODULES` to a `node_modules/.pnpm` folder that has `sharp`, `meshoptimizer` and `draco3dgltf`).
The script also writes `frontend/features/simulations/skinLandmarks.ts`.

# Arm model (withdrawal reflex)

`arm.glb` holds the right arm's bones, the biceps and brachialis, the median and musculocutaneous nerves
with the brachial plexus, the cervical vertebrae C3–T3 and the spinal cord from C4 to T1 (white matter,
posterior and anterior horns, spinal ganglion, posterior and anterior roots), plus a thin slice of the cord
at C7 that the app shows enlarged.

Attribution: BodyParts3D, The Database Center for Life Science (DBCLS), Japan, CC BY-SA 2.1 Japan;
Z-Anatomy, the libre 3D atlas of anatomy, CC BY-SA 4.0. GLB conversion: JMK712/human-anatomy-online
(https://github.com/JMK712/human-anatomy-online/tree/322ba39e96ea91ce08601caad2c0aaade1dc99f0/public/models,
files `skeleton.glb`, `muscular.glb`, `nervous.glb`). SciPal modifications: selected structures, the spinal
cord cut to C4–T1, re-centred and scaled, a per-vertex elbow bend weight added, Draco-compressed.

This derivative model is shared under Creative Commons Attribution-ShareAlike 4.0 International:
https://creativecommons.org/licenses/by-sa/4.0/. The licence applies to this asset, not to SciPal's
application code.

Rebuild with `node scripts/assets/build-arm-reflex.mjs <source-folder>` (the folder holds
`skeleton-final.glb`, `muscular.glb` and `nervous.glb`); it also writes
`frontend/features/simulations/skinArmLandmarks.ts`.
