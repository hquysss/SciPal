import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import * as THREE from '../../frontend/node_modules/three/build/three.module.js';

// Prepares the heart for the circulation-3d simulation from the human-anatomy "cardiovascular.glb"
// (BodyParts3D / Z-Anatomy, CC BY-SA, GLB export by JMK712; see frontend/public/models/knee-reflex/README.md
// for the source and licence of the same family of files). It keeps the four chambers, the valve
// leaflets and the large vessels of the heart, each as its own named mesh, moves them to the middle of
// the heart (scaled so the heart is about 5 units tall), simplifies the surfaces and Draco-compresses
// them. It also writes where each part sits, so labels and blood routes can be placed on the model.
// Run from the repository root: node scripts/assets/build-heart.mjs [source-folder]

const source = process.argv[2] ?? 'scratch/circulation-assets/heart-src';
const output = 'frontend/public/models/circulation';
const SCALE = 40;
const INSPECT = process.env.INSPECT === '1';
const require = createRequire(path.resolve('package.json'));
const pnpm = (name) => {
  const dir = fs.readdirSync('node_modules/.pnpm').find((entry) => entry.startsWith(`${name}@`));
  if (!dir) throw new Error(`Missing ${name} in node_modules/.pnpm`);
  return require(path.resolve('node_modules/.pnpm', dir, 'node_modules', name));
};

const wrapper = path.resolve('frontend/node_modules/three/examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js');
const decoderFile = path.join(source, 'draco-decoder.cjs');
fs.copyFileSync(wrapper, decoderFile);
const Draco = await require(path.resolve(decoderFile))({ wasmBinary: fs.readFileSync(wrapper.replace('draco_wasm_wrapper.js', 'draco_decoder.wasm')) });
const decoder = new Draco.Decoder();

const bytes = fs.readFileSync(path.join(source, 'cardiovascular.glb'));
const jsonLength = bytes.readUInt32LE(12);
const doc = JSON.parse(bytes.subarray(20, 20 + jsonLength));
const binaryStart = 28 + jsonLength;

function decode(primitive) {
  const extension = primitive.extensions.KHR_draco_mesh_compression;
  const view = doc.bufferViews[extension.bufferView];
  const start = binaryStart + (view.byteOffset ?? 0);
  const buffer = new Draco.DecoderBuffer();
  buffer.Init(bytes.subarray(start, start + view.byteLength), view.byteLength);
  const mesh = new Draco.Mesh();
  const status = decoder.DecodeBufferToMesh(buffer, mesh);
  if (!status.ok()) throw new Error(status.error_msg());
  const floats = (name, size) => {
    const attribute = decoder.GetAttributeByUniqueId(mesh, extension.attributes[name]);
    const values = new Draco.DracoFloat32Array();
    decoder.GetAttributeFloatForAllPoints(mesh, attribute, values);
    const out = Float32Array.from({ length: mesh.num_points() * size }, (_, i) => values.GetValue(i));
    Draco.destroy(values);
    return out;
  };
  const positions = floats('POSITION', 3);
  const normals = 'NORMAL' in extension.attributes ? floats('NORMAL', 3) : null;
  const face = new Draco.DracoInt32Array();
  const indices = new Uint32Array(mesh.num_faces() * 3);
  for (let i = 0; i < mesh.num_faces(); i++) { decoder.GetFaceFromMesh(mesh, i, face); for (let j = 0; j < 3; j++) indices[i * 3 + j] = face.GetValue(j); }
  for (const resource of [face, mesh, buffer, status]) Draco.destroy(resource);
  return { positions, normals, indices };
}

/** Which part of the heart a mesh is, by its name. */
const PARTS = [
  ['rightAtrium', /^Right atrium\.001$/, 'wall'],
  ['rightVentricle', /^Right ventricle\.001$/, 'wall'],
  ['leftAtrium', /^Left atrium\.001$/, 'wall'],
  ['leftVentricle', /^Left ventricle\.001$/, 'wall'],
  ['tricuspid', /leaflet of right atrioventricular valve/, 'valve'],
  ['mitral', /leaflet of left atrioventricular valve/, 'valve'],
  ['aorticValve', /^(Left coronary|Non-coronary|Right coronary) leaflet/, 'valve'],
  ['pulmonaryValve', /semilunar leaflet of pulmonary valve/, 'valve'],
  ['pulmonaryTrunk', /^(Pulmonary trunk|Bifurcation of pulmonary trunk|Left pulmonary artery|Right pulmonary artery)\.001$/, 'vein'],
  ['pulmonaryVeins', /pulmonary vein\.001$/, 'artery'],
  ['aorta', /^(Ascending aorta|Aortic arch|Thoracic aorta)\.001$/, 'artery'],
  ['superiorVenaCava', /^Superior vena cava\.001$/, 'vein'],
  ['inferiorVenaCava', /^Inferior vena cava \(thoracic part\)\.001$/, 'vein'],
  ['coronary', /^(Right coronary artery|Circumflex artery of heart|Anterior interventricular artery|Left coronary artery)\.001$/, 'coronary'],
];

const chosen = [];
for (const node of doc.nodes) {
  if (node.mesh === undefined || !node.name) continue;
  const part = PARTS.find(([, pattern]) => pattern.test(node.name));
  if (!part) continue;
  const geometry = decode(doc.meshes[node.mesh].primitives[0]);
  const pose = new THREE.Matrix4().compose(new THREE.Vector3(...(node.translation ?? [0, 0, 0])), new THREE.Quaternion(...(node.rotation ?? [0, 0, 0, 1])), new THREE.Vector3(...(node.scale ?? [1, 1, 1])));
  const box = new THREE.Box3();
  const point = new THREE.Vector3();
  for (let i = 0; i < geometry.positions.length; i += 3) { point.fromArray(geometry.positions, i).applyMatrix4(pose); box.expandByPoint(point); }
  chosen.push({ name: node.name, group: part[0], role: part[2], geometry, pose, box });
}

// The source has no anterior leaflet for the tricuspid valve and none for the mitral valve (the leaflet that
// faces the aortic valve). Each is added as a copy of a real leaflet turned about the axis of its valve:
// the axis runs from the atrium to the ventricle, and the centre of the orifice is the circle through the
// atrial edge of the leaflets that exist.
const worldPoints = (part) => { const out = new Float32Array(part.geometry.positions.length); const v = new THREE.Vector3(); for (let i = 0; i < out.length; i += 3) v.fromArray(part.geometry.positions, i).applyMatrix4(part.pose).toArray(out, i); return out; };
function addLeaflet({ group, atrium, ventricle, copy, turn, name, size = 1 }) {
  const leaflets = chosen.filter((p) => p.group === group);
  const axis = chosen.find((p) => p.group === ventricle).box.getCenter(new THREE.Vector3()).sub(chosen.find((p) => p.group === atrium).box.getCenter(new THREE.Vector3())).normalize();
  const reference = Math.abs(axis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = reference.clone().cross(axis).normalize();
  const v = axis.clone().cross(u);
  const all = leaflets.map((leaflet) => ({ leaflet, points: worldPoints(leaflet) }));
  // Atrial edge: the vertices least far along the axis.
  const heights = all.flatMap(({ points }) => Array.from({ length: points.length / 3 }, (_, i) => new THREE.Vector3().fromArray(points, i * 3).dot(axis)));
  const low = Math.min(...heights);
  const high = Math.max(...heights);
  const edge = [];
  for (const { points } of all) for (let i = 0; i < points.length; i += 3) { const q = new THREE.Vector3().fromArray(points, i); if (q.dot(axis) < low + 0.25 * (high - low)) edge.push(q); }
  const origin = edge.reduce((a, q) => a.add(q), new THREE.Vector3()).divideScalar(edge.length);
  // Least-squares circle (Kåsa): x² + y² = 2ax + 2by + c.
  const rows = edge.map((q) => { const d = q.clone().sub(origin); return [d.dot(u), d.dot(v)]; });
  let sxx = 0, sxy = 0, syy = 0, sx = 0, sy = 0, sz = 0, sxz = 0, syz = 0;
  for (const [x, y] of rows) { const z = x * x + y * y; sxx += x * x; sxy += x * y; syy += y * y; sx += x; sy += y; sz += z; sxz += x * z; syz += y * z; }
  const n = rows.length;
  const m = new THREE.Matrix3().set(sxx, sxy, sx, sxy, syy, sy, sx, sy, n);
  const solved = new THREE.Vector3(sxz, syz, sz).applyMatrix3(m.clone().invert());
  const centre = origin.clone().addScaledVector(u, solved.x / 2).addScaledVector(v, solved.y / 2);
  const radius = Math.sqrt(solved.z + (solved.x / 2) ** 2 + (solved.y / 2) ** 2);
  const angleOf = (points) => { const mean = new THREE.Vector3(); for (let i = 0; i < points.length; i += 3) mean.add(new THREE.Vector3().fromArray(points, i)); mean.divideScalar(points.length / 3).sub(centre); return Math.atan2(mean.dot(v), mean.dot(u)); };
  const source = all.find(({ leaflet }) => leaflet.name === copy);
  const angles = all.map(({ points }) => angleOf(points));
  // Where the new leaflet goes: opposite the middle of the ones that exist (a mitral valve has two, 180° apart).
  const sin = angles.reduce((a, t) => a + Math.sin(t), 0);
  const cos = angles.reduce((a, t) => a + Math.cos(t), 0);
  const target = turn ?? Math.atan2(sin, cos) + Math.PI;
  const rotate = new THREE.Matrix4().makeRotationAxis(axis, target - angleOf(source.points));
  const around = new THREE.Matrix4().makeTranslation(centre.x, centre.y, centre.z).multiply(rotate).multiply(new THREE.Matrix4().makeScale(size, size, size)).multiply(new THREE.Matrix4().makeTranslation(-centre.x, -centre.y, -centre.z));
  const points = new Float32Array(source.points.length);
  const q = new THREE.Vector3();
  for (let i = 0; i < points.length; i += 3) q.fromArray(source.points, i).applyMatrix4(around).toArray(points, i);
  const box = new THREE.Box3();
  for (let i = 0; i < points.length; i += 3) box.expandByPoint(q.fromArray(points, i));
  chosen.push({ name, group, role: 'valve', geometry: { positions: points, normals: null, indices: source.leaflet.geometry.indices }, pose: new THREE.Matrix4(), box });
  if (process.env.DEBUG_VALVE) console.log(group, 'radius', radius.toFixed(4), 'angles', angles.map((t) => (t * 180 / Math.PI).toFixed(0)), '→', (target * 180 / Math.PI).toFixed(0));
}
addLeaflet({ group: 'tricuspid', atrium: 'rightAtrium', ventricle: 'rightVentricle', copy: 'Septal leaflet of right atrioventricular valve.001', name: 'Anterior leaflet of right atrioventricular valve.001' });
addLeaflet({ group: 'mitral', atrium: 'leftAtrium', ventricle: 'leftVentricle', copy: 'Posterior leaflet of left atrioventricular valve.001', name: 'Anterior leaflet of left atrioventricular valve.001', size: 1.05 });

if (INSPECT) {
  for (const part of chosen) console.log(part.group.padEnd(16), part.name.padEnd(60), part.geometry.positions.length / 3, part.box.min.toArray().map((v) => v.toFixed(3)).join(','), '..', part.box.max.toArray().map((v) => v.toFixed(3)).join(','));
  process.exit(0);
}

// Centre on the middle of the four chambers and scale up.
const chambers = new THREE.Box3();
for (const part of chosen.filter((p) => /Atrium|Ventricle/i.test(p.group) || /^(right|left)(Atrium|Ventricle)$/.test(p.group))) chambers.union(part.box);
const centre = chambers.getCenter(new THREE.Vector3());
const place = new THREE.Matrix4().makeScale(SCALE, SCALE, SCALE).multiply(new THREE.Matrix4().makeTranslation(-centre.x, -centre.y, -centre.z));
const normalMatrix = new THREE.Matrix3();

const EncoderModule = await pnpm('draco3dgltf').createEncoderModule();
const builder = new EncoderModule.MeshBuilder();
const encoder = new EncoderModule.Encoder();
encoder.SetSpeedOptions(5, 5);
encoder.SetAttributeQuantization(EncoderModule.POSITION, 14);
encoder.SetAttributeQuantization(EncoderModule.NORMAL, 10);
encoder.SetTrackEncodedProperties(true);

const out = {
  asset: { version: '2.0', generator: 'SciPal heart preparation', copyright: 'BodyParts3D / DBCLS, Z-Anatomy; derivative CC BY-SA 4.0 (selected heart structures, centred and scaled)' },
  scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], accessors: [], bufferViews: [], buffers: [],
  materials: ['wall', 'valve', 'artery', 'vein', 'coronary'].map((name) => ({ name, pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.6 } })),
  extensionsUsed: ['KHR_draco_mesh_compression'], extensionsRequired: ['KHR_draco_mesh_compression'],
};
const materialOf = { wall: 0, valve: 1, artery: 2, vein: 3, coronary: 4 };
const chunks = [];
let byteLength = 0;
const append = (data) => {
  out.bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: data.length });
  chunks.push(data); byteLength += data.length;
  const padding = (4 - byteLength % 4) % 4;
  if (padding) { chunks.push(Buffer.alloc(padding)); byteLength += padding; }
  return out.bufferViews.length - 1;
};

const parts = [];
for (const part of chosen) {
  const { positions, normals, indices } = part.geometry;
  const world = part.pose.clone().premultiply(place);
  normalMatrix.getNormalMatrix(world);
  const p = new Float32Array(positions.length);
  const n = new Float32Array(positions.length);
  const point = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const box = new THREE.Box3();
  const sum = new THREE.Vector3();
  for (let i = 0; i < positions.length; i += 3) {
    point.fromArray(positions, i).applyMatrix4(world);
    point.toArray(p, i);
    box.expandByPoint(point);
    sum.add(point);
    if (normals) normal.fromArray(normals, i).applyMatrix3(normalMatrix).normalize().toArray(n, i);
  }
  const middle = sum.divideScalar(positions.length / 3);
  // Mesh coordinates are relative to the middle of the part, so a scale or move acts around it.
  for (let i = 0; i < p.length; i += 3) { p[i] -= middle.x; p[i + 1] -= middle.y; p[i + 2] -= middle.z; }
  if (!normals) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(p, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
    n.set(geometry.getAttribute('normal').array);
  }
  const mesh = new EncoderModule.Mesh();
  const count = p.length / 3;
  builder.AddFacesToMesh(mesh, indices.length / 3, indices);
  const ids = { POSITION: builder.AddFloatAttributeToMesh(mesh, EncoderModule.POSITION, count, 3, p), NORMAL: builder.AddFloatAttributeToMesh(mesh, EncoderModule.NORMAL, count, 3, n) };
  const encoded = new EncoderModule.DracoInt8Array();
  const size = encoder.EncodeMeshToDracoBuffer(mesh, encoded);
  if (size <= 0) throw new Error('Draco encoding failed for ' + part.name);
  const view = append(Buffer.from(Int8Array.from({ length: size }, (_, i) => encoded.GetValue(i)).buffer));
  const local = box.clone().translate(middle.clone().negate());
  const first = out.accessors.length;
  out.accessors.push({ componentType: 5126, type: 'VEC3', count: encoder.GetNumberOfEncodedPoints(), min: local.min.toArray(), max: local.max.toArray() });
  out.accessors.push({ componentType: 5126, type: 'VEC3', count: encoder.GetNumberOfEncodedPoints() });
  out.accessors.push({ componentType: 5125, type: 'SCALAR', count: encoder.GetNumberOfEncodedFaces() * 3 });
  out.meshes.push({ name: part.name, primitives: [{ attributes: { POSITION: first, NORMAL: first + 1 }, indices: first + 2, material: materialOf[part.role], extensions: { KHR_draco_mesh_compression: { bufferView: view, attributes: ids } } }] });
  out.nodes.push({ name: part.name, mesh: out.meshes.length - 1, translation: middle.toArray(), extras: { group: part.group } });
  out.scenes[0].nodes.push(out.nodes.length - 1);
  EncoderModule.destroy(encoded); EncoderModule.destroy(mesh);
  // The farthest vertex from the middle of the heart: the open end of a vessel.
  let tip = new THREE.Vector3();
  let far = -1;
  for (let i = 0; i < p.length; i += 3) {
    point.set(p[i] + middle.x, p[i + 1] + middle.y, p[i + 2] + middle.z);
    const d = point.length();
    if (d > far) { far = d; tip = point.clone(); }
  }
  parts.push({ name: part.name, group: part.group, at: middle.toArray(), min: box.min.toArray(), max: box.max.toArray(), tip: tip.toArray() });
}
out.buffers.push({ byteLength });
EncoderModule.destroy(encoder); EncoderModule.destroy(builder);

const json = Buffer.from(JSON.stringify(out));
const padded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
const binary = Buffer.concat(chunks);
const header = Buffer.alloc(20);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + padded.length + binary.length, 8);
header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
const binaryHeader = Buffer.alloc(8);
binaryHeader.writeUInt32LE(binary.length); binaryHeader.writeUInt32LE(0x004e4942, 4);
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'heart.glb'), Buffer.concat([header, padded, binaryHeader, binary]));

const round = (v) => +v.toFixed(3);
const entries = parts.map((part) => `  ${JSON.stringify(part.name)}: { group: ${JSON.stringify(part.group)}, at: [${part.at.map(round)}], min: [${part.min.map(round)}], max: [${part.max.map(round)}], tip: [${part.tip.map(round)}] },`).join('\n');
fs.writeFileSync('frontend/features/simulations/circulationHeartParts.ts', `import type { Point3 } from './kneeReflexParts';

// Generated by scripts/assets/build-heart.mjs: where each part of public/models/circulation/heart.glb sits
// (centre, bounding box and the vertex farthest from the middle of the heart, which is where a vessel opens).
export type HeartGroup = ${[...new Set(parts.map((p) => p.group))].map((g) => JSON.stringify(g)).join(' | ')};
export interface HeartPartPlace { readonly group: HeartGroup; readonly at: Point3; readonly min: Point3; readonly max: Point3; readonly tip: Point3 }
export const HEART_PART_PLACES: Readonly<Record<string, HeartPartPlace>> = {
${entries}
};
`);
Draco.destroy(decoder);
console.log(JSON.stringify({ parts: parts.length, bytes: 28 + padded.length + binary.length, centre: centre.toArray().map(round) }));
