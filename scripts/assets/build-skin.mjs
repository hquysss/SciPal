import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import * as THREE from '../../frontend/node_modules/three/build/three.module.js';

// Prepares the skin for the skin-senses simulation from "Skin Cross Section Model" by iqcenter
// (https://sketchfab.com/3d-models/skin-cross-section-model-2e28bcb97e0148eda7665c45b0131a39, CC BY 4.0).
// It drops the stray copies lying beside the block, merges the meshes of each material into one part,
// simplifies the heavy ones (the epidermis cells, the fat and the fibres), shrinks the textures, moves the
// block to the middle (6 units wide) and Draco-compresses it. It also writes the nerve paths and layer
// heights the simulation places its receptors and impulses on.
// Run from the repository root: node scripts/assets/build-skin.mjs [source.glb]

const source = process.argv[2] ?? 'scratch/skin-assets/skin_cross_section_model.glb';
const output = 'frontend/public/models/skin';
const require = createRequire(path.resolve('package.json'));
// sharp, meshoptimizer and draco3dgltf are build tools, not app dependencies: ASSET_MODULES can point at
// another checkout's node_modules/.pnpm that has them.
const modules = process.env.ASSET_MODULES ?? 'node_modules/.pnpm';
const pnpmDir = (name) => {
  const dir = fs.readdirSync(modules).find((entry) => entry.startsWith(`${name}@`));
  if (!dir) throw new Error(`Missing ${name} in ${modules}`);
  return path.resolve(modules, dir, 'node_modules', name);
};
const sharp = require(pnpmDir('sharp'));
const { MeshoptSimplifier } = await import(pathToFileURL(path.join(pnpmDir('meshoptimizer'), 'index.js')).href);
await MeshoptSimplifier.ready;

// Source units → scene units: the block is 1 800 units wide; it becomes 6 wide, centred.
const CENTRE = new THREE.Vector3(-1320, -11, 215);
const SCALE = 1 / 300;
const toScene = (v) => v.clone().sub(CENTRE).multiplyScalar(SCALE);

/** Part of the skin each material is, and how much of its surface to keep. */
const PARTS = {
  skin_color_1: ['surface', 1],
  epidermis_1: ['epidermis', 0.08],
  veins_1: ['veins', 0.25],
  'Mat.2_1': ['basement', 1],
  dermis_1: ['dermis', 1],
  boole_1: ['dermis', 1],
  Cylinder_1: ['dermis', 1],
  'Cylinder.1_1': ['dermis', 1],
  'Cylinder.2_1': ['dermis', 1],
  reticular_fibers_1: ['fibres', 0.25],
  'Mat.4_1': ['fat', 0.06],
  Mat_1: ['fat', 0.06],
  hair_1: ['hair', 0.4],
  'Mat.1_1': ['follicle', 1],
  'Mat.3_1': ['muscle', 1],
  sebaceous_gland_1: ['sebaceous', 1],
  sweat_gland_1: ['sweat', 1],
  'boole.1_1': ['sweat', 1],
  'boole.2_1': ['sweat', 1],
  'boole.3_1': ['sweat', 1],
  blood_1: ['artery', 1],
  nerve_1: ['nerve', 1],
};
// Mat.10_1 repeats the nerves a little further back, and "default" is an untextured leftover.

const bytes = fs.readFileSync(source);
const jsonLength = bytes.readUInt32LE(12);
const doc = JSON.parse(bytes.subarray(20, 20 + jsonLength));
const binaryStart = 28 + jsonLength;
const viewBytes = (index) => { const view = doc.bufferViews[index]; const start = binaryStart + (view.byteOffset ?? 0); return bytes.subarray(start, start + view.byteLength); };
const read = (index) => {
  const accessor = doc.accessors[index];
  const view = doc.bufferViews[accessor.bufferView];
  const Type = accessor.componentType === 5126 ? Float32Array : accessor.componentType === 5125 ? Uint32Array : Uint16Array;
  const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type];
  const start = binaryStart + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  return new Type(bytes.buffer.slice(bytes.byteOffset + start, bytes.byteOffset + start + accessor.count * size * Type.BYTES_PER_ELEMENT));
};

const worldOf = new Map();
const walk = (index, parent) => {
  const node = doc.nodes[index];
  const local = new THREE.Matrix4();
  if (node.matrix) local.fromArray(node.matrix);
  else local.compose(new THREE.Vector3(...(node.translation ?? [0, 0, 0])), new THREE.Quaternion(...(node.rotation ?? [0, 0, 0, 1])), new THREE.Vector3(...(node.scale ?? [1, 1, 1])));
  const world = parent.clone().multiply(local);
  worldOf.set(index, world);
  for (const child of node.children ?? []) walk(child, world);
};
for (const root of doc.scenes[0].nodes) walk(root, new THREE.Matrix4());

// Gather every primitive of the block, by material, in scene units.
const groups = new Map();
for (const [index, node] of doc.nodes.entries()) {
  if (node.mesh === undefined) continue;
  for (const primitive of doc.meshes[node.mesh].primitives) {
    const material = doc.materials[primitive.material];
    if (!(material.name in PARTS)) continue;
    const world = worldOf.get(index);
    const accessor = doc.accessors[primitive.attributes.POSITION];
    const middle = new THREE.Box3(new THREE.Vector3(...accessor.min), new THREE.Vector3(...accessor.max)).applyMatrix4(world).getCenter(new THREE.Vector3());
    if (middle.x < -2300 || middle.x > -380) continue; // stray copies beside the block
    const positions = read(primitive.attributes.POSITION);
    const uvs = primitive.attributes.TEXCOORD_0 !== undefined ? read(primitive.attributes.TEXCOORD_0) : null;
    const indices = primitive.indices !== undefined ? read(primitive.indices) : Uint32Array.from({ length: positions.length / 3 }, (_, i) => i);
    const v = new THREE.Vector3();
    const placed = new Float32Array(positions.length);
    for (let i = 0; i < positions.length; i += 3) toScene(v.fromArray(positions, i).applyMatrix4(world)).toArray(placed, i);
    if (!groups.has(material.name)) groups.set(material.name, []);
    groups.get(material.name).push({ positions: placed, uvs, indices: Uint32Array.from(indices) });
  }
}

/** Joins the pieces, simplifies to `keep` of the triangles and drops the vertices no triangle uses. */
function build(pieces, keep, textured) {
  const count = pieces.reduce((sum, p) => sum + p.positions.length / 3, 0);
  const positions = new Float32Array(count * 3);
  const uvs = textured ? new Float32Array(count * 2) : null;
  const indexList = [];
  let offset = 0;
  for (const piece of pieces) {
    positions.set(piece.positions, offset * 3);
    if (uvs && piece.uvs) uvs.set(piece.uvs, offset * 2);
    for (const i of piece.indices) indexList.push(i + offset);
    offset += piece.positions.length / 3;
  }
  let indices = Uint32Array.from(indexList);
  if (keep < 1) {
    const target = Math.floor((indices.length / 3) * keep) * 3;
    [indices] = MeshoptSimplifier.simplify(indices, positions, 3, target, 0.02, []);
  }
  const remap = new Int32Array(count).fill(-1);
  let used = 0;
  for (const i of indices) if (remap[i] < 0) remap[i] = used++;
  const p = new Float32Array(used * 3);
  const t = uvs ? new Float32Array(used * 2) : null;
  for (let i = 0; i < count; i++) {
    const to = remap[i];
    if (to < 0) continue;
    p.set(positions.subarray(i * 3, i * 3 + 3), to * 3);
    if (t) t.set(uvs.subarray(i * 2, i * 2 + 2), to * 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(p, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices.map((i) => remap[i]), 1));
  geometry.computeVertexNormals();
  return { positions: p, normals: geometry.getAttribute('normal').array, uvs: t, indices: Uint32Array.from(geometry.getIndex().array) };
}

const EncoderModule = await require(pnpmDir('draco3dgltf')).createEncoderModule();
const builder = new EncoderModule.MeshBuilder();
const encoder = new EncoderModule.Encoder();
encoder.SetSpeedOptions(5, 5);
encoder.SetAttributeQuantization(EncoderModule.POSITION, 14);
encoder.SetAttributeQuantization(EncoderModule.NORMAL, 10);
encoder.SetAttributeQuantization(EncoderModule.TEX_COORD, 12);
encoder.SetTrackEncodedProperties(true);

const out = {
  asset: { version: '2.0', generator: 'SciPal skin preparation', copyright: '"Skin Cross Section Model" by iqcenter (Sketchfab), CC BY 4.0; modified: merged, simplified, re-centred' },
  scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], accessors: [], bufferViews: [], buffers: [], materials: [], textures: [], images: [], samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
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

const report = [];
for (const [name, pieces] of groups) {
  const [part, keep] = PARTS[name];
  const material = doc.materials.find((m) => m.name === name);
  const pbr = material.pbrMetallicRoughness ?? {};
  const textured = pbr.baseColorTexture !== undefined && pieces.every((p) => p.uvs);
  const mesh = build(pieces, keep, textured);
  const outMaterial = { name, pbrMetallicRoughness: { baseColorFactor: pbr.baseColorFactor ?? [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.7 }, doubleSided: true };
  if (material.alphaMode) outMaterial.alphaMode = material.alphaMode;
  if (textured) {
    const image = doc.images[doc.textures[pbr.baseColorTexture.index].source];
    const small = await sharp(viewBytes(image.bufferView)).resize(512, 512, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
    out.images.push({ bufferView: append(small), mimeType: 'image/jpeg' });
    out.textures.push({ source: out.images.length - 1, sampler: 0 });
    outMaterial.pbrMetallicRoughness.baseColorTexture = { index: out.textures.length - 1 };
  }
  out.materials.push(outMaterial);

  const draco = new EncoderModule.Mesh();
  const vertices = mesh.positions.length / 3;
  builder.AddFacesToMesh(draco, mesh.indices.length / 3, mesh.indices);
  const ids = {
    POSITION: builder.AddFloatAttributeToMesh(draco, EncoderModule.POSITION, vertices, 3, mesh.positions),
    NORMAL: builder.AddFloatAttributeToMesh(draco, EncoderModule.NORMAL, vertices, 3, mesh.normals),
  };
  if (mesh.uvs) ids.TEXCOORD_0 = builder.AddFloatAttributeToMesh(draco, EncoderModule.TEX_COORD, vertices, 2, mesh.uvs);
  const encoded = new EncoderModule.DracoInt8Array();
  const size = encoder.EncodeMeshToDracoBuffer(draco, encoded);
  if (size <= 0) throw new Error(`Draco encoding failed for ${name}`);
  const view = append(Buffer.from(Int8Array.from({ length: size }, (_, i) => encoded.GetValue(i)).buffer));
  const box = new THREE.Box3().setFromBufferAttribute(new THREE.BufferAttribute(mesh.positions, 3));
  const first = out.accessors.length;
  const points = encoder.GetNumberOfEncodedPoints();
  out.accessors.push({ componentType: 5126, type: 'VEC3', count: points, min: box.min.toArray(), max: box.max.toArray() });
  out.accessors.push({ componentType: 5126, type: 'VEC3', count: points });
  const attributes = { POSITION: first, NORMAL: first + 1 };
  if (mesh.uvs) { out.accessors.push({ componentType: 5126, type: 'VEC2', count: points }); attributes.TEXCOORD_0 = first + 2; }
  out.accessors.push({ componentType: 5125, type: 'SCALAR', count: encoder.GetNumberOfEncodedFaces() * 3 });
  out.meshes.push({ name, primitives: [{ attributes, indices: out.accessors.length - 1, material: out.materials.length - 1, extensions: { KHR_draco_mesh_compression: { bufferView: view, attributes: ids } } }] });
  out.nodes.push({ name, mesh: out.meshes.length - 1, extras: { part } });
  out.scenes[0].nodes.push(out.nodes.length - 1);
  EncoderModule.destroy(encoded); EncoderModule.destroy(draco);
  report.push(`${part.padEnd(10)} ${name.padEnd(20)} ${pieces.reduce((s, p) => s + p.indices.length / 3, 0)} → ${mesh.indices.length / 3} triangles, ${size >> 10} KB`);
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
fs.writeFileSync(path.join(output, 'skin.glb'), glb);

// Landmarks, measured on the source in its own units (see the nerve centre lines in the PR notes).
const point = (x, y, z) => toScene(new THREE.Vector3(x, y, z)).toArray().map((v) => +v.toFixed(3));
const landmarks = {
  surface: point(-1320, 1008, 215)[1],
  epidermisBase: point(-1320, 540, 215)[1],
  dermisBase: point(-1320, -482, 215)[1],
  fatBase: point(-1320, -1030, 215)[1],
  front: point(-1320, 0, 550)[2],
  /** The nerve to the tactile corpuscle (the coil near the top), from the corpuscle down. */
  touchNerve: [point(-1332, 434, 180), point(-1326, 363, 156), point(-1328, 280, 123), point(-1193, 234, 104), point(-996, 161, 77), point(-962, 79, 46), point(-890, -1, 15), point(-840, -36, 3)],
  /** The nerve that reaches the base of the epidermis on the right, from the top down. */
  painNerve: [point(-735, 521, 0), point(-722, 398, 0), point(-697, 240, 0), point(-784, 83, 0), point(-827, -1, 0), point(-817, -160, 0), point(-856, -236, 0), point(-837, -323, 0), point(-745, -395, 0), point(-729, -482, 0), point(-768, -561, 0), point(-786, -639, 0)],
  /** A short nerve ending in a tuft on the left. */
  tuftNerve: [point(-1850, 45, 233), point(-1875, -2, 223), point(-1899, -29, 216), point(-1923, -60, 207), point(-1921, -83, 202)],
  /** The trunk at the back of the fat, from right to left (toward the spinal cord). */
  trunk: [point(-390, -683, -171), point(-601, -753, -171), point(-804, -736, -171), point(-999, -716, -171), point(-1197, -763, -171), point(-1401, -766, -171), point(-1602, -724, -171), point(-1802, -735, -171), point(-1997, -694, -171), point(-2197, -700, -171), point(-2318, -738, -171)],
};
fs.writeFileSync('frontend/features/simulations/skinLandmarks.ts', `import type { Point3 } from './kneeReflexParts';

// Generated by scripts/assets/build-skin.mjs: heights of the skin layers and nerve paths in
// public/models/skin/skin.glb (scene units; y up, the front face toward +z).
export const SKIN_LANDMARKS = {
${Object.entries(landmarks).map(([key, value]) => `  ${key}: ${Array.isArray(value) ? `[${value.map((p) => `[${p.join(', ')}]`).join(', ')}]` : value},`).join(String.fromCharCode(10))}
} as const satisfies {
  readonly surface: number; readonly epidermisBase: number; readonly dermisBase: number; readonly fatBase: number; readonly front: number;
  readonly touchNerve: readonly Point3[]; readonly painNerve: readonly Point3[]; readonly tuftNerve: readonly Point3[]; readonly trunk: readonly Point3[];
};
`);
console.log(report.join('\n'));
console.log(JSON.stringify({ bytes: glb.length, parts: out.nodes.length }));
