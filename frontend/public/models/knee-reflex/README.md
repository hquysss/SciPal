# Knee-reflex anatomy asset

`anatomy.glb` contains real anatomical surface meshes, adapted to a seated pose for SciPal. The knee joint and skin weights are added for the slowed teaching animation; this is not a biomechanical measurement model.

Attribution: BodyParts3D, The Database Center for Life Science (DBCLS), Japan, CC BY-SA 2.1 Japan; Z-Anatomy, the libre 3D atlas of anatomy, CC BY-SA 4.0. GLB conversion: JMK712/human-anatomy-online. SciPal modifications: selected structures, coordinate conversion, seated pose, knee articulation, weights, normals and materials.

Sources:

- https://github.com/Z-Anatomy/Models-of-human-anatomy
- https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html
- https://github.com/JMK712/human-anatomy-online/tree/322ba39e96ea91ce08601caad2c0aaade1dc99f0/public/models

This derivative model is shared under Creative Commons Attribution-ShareAlike 4.0 International: https://creativecommons.org/licenses/by-sa/4.0/

The model license applies to this asset. It does not replace the license of SciPal's application code. The original mesh names, source revision and exported structure list are retained in `anatomy-manifest.json`.

Rebuild from the source `skeleton.glb` and `muscular.glb` downloads with `node scripts/assets/build-knee-anatomy.mjs <source-folder>` from the repository root. The source folder currently uses `skeleton-final.glb` for the complete skeletal input. The exporter verifies every selected Draco buffer before decoding it. Only the exported model and attribution files are served by the app.
