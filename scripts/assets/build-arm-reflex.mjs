import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import * as THREE from '../../frontend/node_modules/three/build/three.module.js';

// Prepares the arm for the withdrawal reflex in the skin-senses simulation from the human-anatomy files
// skeleton.glb, muscular.glb and nervous.glb (BodyParts3D / Z-Anatomy, CC BY-SA; GLB export by JMK712, see
// frontend/public/models/skin/README.md). It keeps the right arm's bones, the elbow flexors, the median and
// musculocutaneous nerves with the brachial plexus, and the cervical spinal cord with its horns, roots and
// ganglion (cut to C4–T1). Each vertex gets a weight `_BEND`: 1 for what turns with the forearm when the
// elbow bends, 0 for what stays. It also writes the paths an impulse takes through the reflex arc.
// Run from the repository root: node scripts/assets/build-arm-reflex.mjs [source-folder]

const source = process.argv[2] ?? 'scratch/reflex-assets';
const output = 'frontend/public/models/skin';
const SCALE = 8;
const ORIGIN = new THREE.Vector3(-0.12, 1.15, -0.03);
const ELBOW = new THREE.Vector3(-0.222, 1.1, -0.018);
const CORD = { low: 1.39, high: 1.53 };
const LEVEL = 1.455; // C7: the slice shown enlarged
const SLAB = 0.003;
const require = createRequire(path.resolve('package.json'));
const modules = process.env.ASSET_MODULES ?? 'node_modules/.pnpm';
const pnpmDir = (name) => {
  const dir = fs.readdirSync(modules).find((entry) => entry.startsWith(`${name}@`));
  if (!dir) throw new Error(`Missing ${name} in ${modules}`);
  return path.resolve(modules, dir, 'node_modules', name);
};

const wrapper = path.resolve('frontend/node_modules/three/examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js');
const decoderFile = path.join(source, 'draco-decoder.cjs');
fs.copyFileSync(wrapper, decoderFile);
const Draco = await require(path.resolve(decoderFile))({ wasmBinary: fs.readFileSync(wrapper.replace('draco_wasm_wrapper.js', 'draco_decoder.wasm')) });
const decoder = new Draco.Decoder();

function open(file) {
  const bytes = fs.readFileSync(path.join(source, file));
  const jsonLength = bytes.readUInt32LE(12);
  const doc = JSON.parse(bytes.subarray(20, 20 + jsonLength));
  const world = new Map();
  const walk = (index, parent) => {
    const node = doc.nodes[index];
    const local = new THREE.Matrix4();
    if (node.matrix) local.fromArray(node.matrix);
    else local.compose(new THREE.Vector3(...(node.translation ?? [0, 0, 0])), new THREE.Quaternion(...(node.rotation ?? [0, 0, 0, 1])), new THREE.Vector3(...(node.scale ?? [1, 1, 1])));
    const matrix = parent.clone().multiply(local);
    world.set(index, matrix);
    for (const child of node.children ?? []) walk(child, matrix);
  };
  for (const root of doc.scenes[0].nodes) walk(root, new THREE.Matrix4());
  return { bytes, doc, binaryStart: 28 + jsonLength, world };
}

function decode(file, primitive) {
  const extension = primitive.extensions.KHR_draco_mesh_compression;
  const view = file.doc.bufferViews[extension.bufferView];
  const start = file.binaryStart + (view.byteOffset ?? 0);
  const buffer = new Draco.DecoderBuffer();
  buffer.Init(file.bytes.subarray(start, start + view.byteLength), view.byteLength);
  const mesh = new Draco.Mesh();
  const status = decoder.DecodeBufferToMesh(buffer, mesh);
  if (!status.ok()) throw new Error(status.error_msg());
  const attribute = decoder.GetAttributeByUniqueId(mesh, extension.attributes.POSITION);
  const values = new Draco.DracoFloat32Array();
  decoder.GetAttributeFloatForAllPoints(mesh, attribute, values);
  const positions = Float32Array.from({ length: mesh.num_points() * 3 }, (_, i) => values.GetValue(i));
  const face = new Draco.DracoInt32Array();
  const indices = new Uint32Array(mesh.num_faces() * 3);
  for (let i = 0; i < mesh.num_faces(); i++) { decoder.GetFaceFromMesh(mesh, i, face); for (let j = 0; j < 3; j++) indices[i * 3 + j] = face.GetValue(j); }
  for (const resource of [values, face, mesh, buffer, status]) Draco.destroy(resource);
  return { positions, indices };
}

/** [file, name pattern, part, how it bends: 'arm' stays, 'forearm' turns, 'smooth' blends at the elbow, cut to the cord segment] */
const PARTS = [
  ['skeleton-final.glb', /^(Humerus|Clavicle|Scapula)\.r\.001$/, 'bone', 'arm'],
  ['skeleton-final.glb', /^(Radius|Ulna|(Scaphoid|Lunate|Triquetrum|Pisiform|Trapezium|Trapezoid|Capitate|Hamate) bone|.*metacarpal bone|.*phalanx of .* finger of hand)\.r\.001$/, 'bone', 'forearm'],
  ['skeleton-final.glb', /^Vertebra (C[3-7]|T[1-3])\.001$/, 'spine', 'arm'],
  ['muscular.glb', /^(Long|Short) head of biceps brachii\.r\.001$/, 'biceps', 'smooth'],
  ['muscular.glb', /^Brachialis muscle\.r\.001$/, 'flexor', 'smooth'],
  ['nervous.glb', /^(Median nerve|Proper palmar digital branches of median nerve|Common palmar digital branches of median nerve)\.r\.001$/, 'sensory', 'smooth'],
  ['nervous.glb', /^Musculocutaneous nerve\.r\.001$/, 'motor', 'smooth'],
  ['nervous.glb', /brachial plexus\.r\.001$/, 'plexus', 'arm'],
  ['nervous.glb', /^(Spinal ganglion|Posterior root of spinal nerve)\.r\.001$/, 'dorsalRoot', 'cord'],
  ['nervous.glb', /^Anterior root of spinal nerve\.r\.001$/, 'ventralRoot', 'cord'],
  ['nervous.glb', /^White matter of spinal cord\.001$/, 'cord', 'cord'],
  ['nervous.glb', /^Posterior horn of spinal cord\.001$/, 'posteriorHorn', 'cord'],
  ['nervous.glb', /^Anterior horn of spinal cord\.001$/, 'anteriorHorn', 'cord'],
];
// Carpal bones are named "<Name> bone.r"; the pattern above also matches the metacarpals.

const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** 1 below the elbow, 0 above, blended over 3 cm. */
const bendOf = (y) => 1 - smoothstep(ELBOW.y - 0.015, ELBOW.y + 0.015, y);

const files = new Map();
const chosen = [];
for (const [file, pattern, part, bend] of PARTS) {
  if (!files.has(file)) files.set(file, open(file));
  const opened = files.get(file);
  for (const [index, node] of opened.doc.nodes.entries()) {
    if (node.mesh === undefined || !pattern.test(node.name)) continue;
    const { positions, indices } = decode(opened, opened.doc.meshes[node.mesh].primitives[0]);
    const matrix = opened.world.get(index);
    const v = new THREE.Vector3();
    for (let i = 0; i < positions.length; i += 3) v.fromArray(positions, i).applyMatrix4(matrix).toArray(positions, i);
    const cut = (low, high) => {
      const list = [];
      for (let t = 0; t < indices.length; t += 3) {
        const y = (positions[indices[t] * 3 + 1] + positions[indices[t + 1] * 3 + 1] + positions[indices[t + 2] * 3 + 1]) / 3;
        if (y >= low && y <= high) list.push(indices[t], indices[t + 1], indices[t + 2]);
      }
      return Uint32Array.from(list);
    };
    if (bend === 'cord') {
      chosen.push({ name: node.name, part, bend, positions, indices: cut(CORD.low, CORD.high) });
      // A thin slice at C7 for the enlarged cross-section (the right half and the middle only).
      chosen.push({ name: `${node.name} (C7 slice)`, part: `slice-${part}`, bend, positions, indices: cut(LEVEL - SLAB, LEVEL + SLAB) });
    } else chosen.push({ name: node.name, part, bend, positions, indices });
  }
}

// Paths through the reflex arc, from the real meshes (world metres, before scaling).
const pointsOf = (pattern) => chosen.filter((c) => pattern.test(c.name) && !c.part.startsWith('slice-')).flatMap((c) => { const out = []; const used = new Set(c.indices); for (const i of used) out.push(new THREE.Vector3().fromArray(c.positions, i * 3)); return out; });
const centre = (list) => list.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(Math.max(1, list.length));
const slice = (list, y, half = 0.004, filter = () => true) => centre(list.filter((p) => Math.abs(p.y - y) < half && filter(p)));
const byHeight = (list, step) => {
  const bins = new Map();
  for (const p of list) { const k = Math.round(p.y / step); if (!bins.has(k)) bins.set(k, []); bins.get(k).push(p); }
  return [...bins.entries()].sort((a, b) => a[0] - b[0]).map(([, l]) => centre(l));
};
const median = pointsOf(/^Median nerve\.r/);
const digital = pointsOf(/Proper palmar digital branches of median nerve\.r/);
const fingertip = centre(digital.filter((p) => p.distanceTo(new THREE.Vector3(-0.316, 0.715, 0.079)) < 0.015));
const palm = centre(digital.filter((p) => p.y > 0.8));
const musculocutaneous = pointsOf(/^Musculocutaneous nerve\.r/);
const right = (p) => p.x < 0;
const ganglion = slice(pointsOf(/^Spinal ganglion\.r/), LEVEL, 0.006);
const dorsalRoot = slice(pointsOf(/^Posterior root of spinal nerve\.r/), LEVEL, 0.006);
const ventralRoot = slice(pointsOf(/^Anterior root of spinal nerve\.r/), LEVEL, 0.006);
const posteriorHorn = slice(pointsOf(/^Posterior horn/), LEVEL, 0.004, right);
const anteriorHorn = slice(pointsOf(/^Anterior horn/), LEVEL, 0.004, right);
const roots = centre(pointsOf(/^Roots of brachial plexus\.r/));
const inferiorTrunk = centre(pointsOf(/^Inferior trunk of brachial plexus\.r/));
const superiorTrunk = centre(pointsOf(/^Superior trunk of brachial plexus\.r/));
const biceps = centre(pointsOf(/biceps brachii\.r/));
const cordTop = slice(pointsOf(/^White matter/), CORD.high - 0.004, 0.004);
const BRAIN = new THREE.Vector3(0, 1.68, -0.03);
const medianUp = byHeight(median, 0.03).filter((p) => p.y < 1.385);
const motorDown = byHeight(musculocutaneous, 0.03).reverse();

const paths = {
  sensory: [fingertip, palm, ...medianUp, inferiorTrunk, roots, ganglion, dorsalRoot, posteriorHorn],
  centre: [posteriorHorn, posteriorHorn.clone().lerp(anteriorHorn, 0.5).add(new THREE.Vector3(-0.001, 0, 0)), anteriorHorn],
  motor: [anteriorHorn, ventralRoot, roots, superiorTrunk, ...motorDown.filter((p) => p.y > 1.16), biceps],
  ascending: [posteriorHorn, cordTop, new THREE.Vector3(0, 1.6, -0.04), BRAIN],
};

const toScene = (p) => p.clone().sub(ORIGIN).multiplyScalar(SCALE);
const round = (v) => +v.toFixed(3);
const landmark = (p) => `[${toScene(p).toArray().map(round).join(', ')}]`;
const pathOut = (list) => `[${list.map((p) => `{ at: ${landmark(p)}, bend: ${round(bendOf(p.y))} }`).join(', ')}]`;

// Encode: one node per source mesh, coordinates in scene units, with the bend weight.
const EncoderModule = await require(pnpmDir('draco3dgltf')).createEncoderModule();
const builder = new EncoderModule.MeshBuilder();
const encoder = new EncoderModule.Encoder();
encoder.SetSpeedOptions(5, 5);
encoder.SetAttributeQuantization(EncoderModule.POSITION, 14);
encoder.SetAttributeQuantization(EncoderModule.NORMAL, 10);
encoder.SetAttributeQuantization(EncoderModule.GENERIC, 8);
encoder.SetTrackEncodedProperties(true);
const out = {
  asset: { version: '2.0', generator: 'SciPal arm reflex preparation', copyright: 'BodyParts3D / DBCLS, Z-Anatomy; derivative CC BY-SA 4.0 (right arm, elbow flexors, arm nerves and cervical spinal cord; re-centred, scaled, bend weights)' },
  scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], accessors: [], bufferViews: [], buffers: [],
  materials: [{ name: 'tissue', pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.6 } }],
  extensionsUsed: ['KHR_draco_mesh_compression'], extensionsRequired: ['KHR_draco_mesh_compression'],
};
const chunks = [];
let byteLength = 0;
const append = (data) => {
  out.bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: data.length });
  chunks.push(data); byteLength += data.length;
  const padding = (4 - (byteLength % 4)) % 4;
  if (padding) { chunks.push(Buffer.alloc(padding)); byteLength += padding; }
  return out.bufferViews.length - 1;
};
const counts = {};
for (const item of chosen) {
  if (item.indices.length === 0) continue;
  const used = [...new Set(item.indices)].sort((a, b) => a - b);
  const remap = new Map(used.map((old, i) => [old, i]));
  const p = new Float32Array(used.length * 3);
  const w = new Float32Array(used.length);
  const v = new THREE.Vector3();
  used.forEach((old, i) => {
    v.fromArray(item.positions, old * 3);
    w[i] = item.bend === 'forearm' ? 1 : item.bend === 'smooth' ? bendOf(v.y) : 0;
    toScene(v).toArray(p, i * 3);
  });
  const indices = Uint32Array.from(item.indices, (i) => remap.get(i));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(p, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  const n = geometry.getAttribute('normal').array;
  const mesh = new EncoderModule.Mesh();
  builder.AddFacesToMesh(mesh, indices.length / 3, indices);
  const ids = {
    POSITION: builder.AddFloatAttributeToMesh(mesh, EncoderModule.POSITION, used.length, 3, p),
    NORMAL: builder.AddFloatAttributeToMesh(mesh, EncoderModule.NORMAL, used.length, 3, n),
    _BEND: builder.AddFloatAttributeToMesh(mesh, EncoderModule.GENERIC, used.length, 1, w),
  };
  const encoded = new EncoderModule.DracoInt8Array();
  const size = encoder.EncodeMeshToDracoBuffer(mesh, encoded);
  if (size <= 0) throw new Error(`Draco encoding failed for ${item.name}`);
  const view = append(Buffer.from(Int8Array.from({ length: size }, (_, i) => encoded.GetValue(i)).buffer));
  const box = new THREE.Box3().setFromBufferAttribute(new THREE.BufferAttribute(p, 3));
  const first = out.accessors.length;
  const points = encoder.GetNumberOfEncodedPoints();
  out.accessors.push({ componentType: 5126, type: 'VEC3', count: points, min: box.min.toArray(), max: box.max.toArray() });
  out.accessors.push({ componentType: 5126, type: 'VEC3', count: points });
  out.accessors.push({ componentType: 5126, type: 'SCALAR', count: points });
  out.accessors.push({ componentType: 5125, type: 'SCALAR', count: encoder.GetNumberOfEncodedFaces() * 3 });
  out.meshes.push({ name: item.name, primitives: [{ attributes: { POSITION: first, NORMAL: first + 1, _BEND: first + 2 }, indices: first + 3, material: 0, extensions: { KHR_draco_mesh_compression: { bufferView: view, attributes: ids } } }] });
  out.nodes.push({ name: item.name, mesh: out.meshes.length - 1, extras: { part: item.part } });
  out.scenes[0].nodes.push(out.nodes.length - 1);
  EncoderModule.destroy(encoded); EncoderModule.destroy(mesh);
  counts[item.part] = (counts[item.part] ?? 0) + indices.length / 3;
}
out.buffers.push({ byteLength });
EncoderModule.destroy(encoder); EncoderModule.destroy(builder);

const json = Buffer.from(JSON.stringify(out));
const padded = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 32)]);
const binary = Buffer.concat(chunks);
const header = Buffer.alloc(20);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + padded.length + binary.length, 8);
header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
const binaryHeader = Buffer.alloc(8);
binaryHeader.writeUInt32LE(binary.length); binaryHeader.writeUInt32LE(0x004e4942, 4);
fs.mkdirSync(output, { recursive: true });
const glb = Buffer.concat([header, padded, binaryHeader, binary]);
fs.writeFileSync(path.join(output, 'arm.glb'), glb);

const NL = String.fromCharCode(10);
fs.writeFileSync('frontend/features/simulations/skinArmLandmarks.ts', [
  "import type { Point3 } from './kneeReflexParts';",
  '',
  '// Generated by scripts/assets/build-arm-reflex.mjs: points of public/models/skin/arm.glb in scene units',
  '// (y up, the body facing +z, the right arm toward −x). `bend` is how much a point turns with the forearm.',
  'type PathPoint = { readonly at: Point3; readonly bend: number };',
  'export const ARM_LANDMARKS = {',
  `  elbow: ${landmark(ELBOW)},`,
  `  fingertip: ${landmark(fingertip)},`,
  `  brain: ${landmark(BRAIN)},`,
  `  cord: ${landmark(posteriorHorn.clone().lerp(anteriorHorn, 0.5))},`,
  `  biceps: ${landmark(biceps)},`,
  `  slice: ${landmark(new THREE.Vector3(0, LEVEL, (posteriorHorn.z + anteriorHorn.z) / 2))},`,
  `  sensory: ${pathOut(paths.sensory)},`,
  `  centre: ${pathOut(paths.centre)},`,
  `  motor: ${pathOut(paths.motor)},`,
  `  ascending: ${pathOut(paths.ascending)},`,
  '} as const satisfies {',
  '  readonly elbow: Point3; readonly fingertip: Point3; readonly brain: Point3; readonly cord: Point3; readonly biceps: Point3; readonly slice: Point3;',
  '  readonly sensory: readonly PathPoint[]; readonly centre: readonly PathPoint[]; readonly motor: readonly PathPoint[]; readonly ascending: readonly PathPoint[];',
  '};',
  '',
].join(NL));
console.log(counts);
console.log(JSON.stringify({ bytes: glb.length, parts: out.nodes.length, fingertip: fingertip.toArray(), ganglion: ganglion.toArray(), posteriorHorn: posteriorHorn.toArray(), anteriorHorn: anteriorHorn.toArray() }));
