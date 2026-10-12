import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// Prepares the Sketchfab "Circulatory System" model (brianj.seely, CC BY 4.0) for the circulation-3d
// simulation: drops the baked English labels, marks every vertex as artery, vein or organ from the
// colour of its texture, records how far along the vessels it lies from the heart (so a pulse can
// travel outward through arteries and blood back through veins), shrinks the textures and
// Draco-compresses the mesh.
// Run from the repository root: node scripts/assets/build-circulation.mjs [source-folder]

const source = process.argv[2] ?? 'scratch/circulation-assets';
const output = 'frontend/public/models/circulation';
const require = createRequire(path.resolve('package.json'));
const pnpm = (name) => {
  const dir = fs.readdirSync('node_modules/.pnpm').find((entry) => entry.startsWith(`${name}@`));
  if (!dir) throw new Error(`Missing ${name} in node_modules/.pnpm`);
  return require(path.resolve('node_modules/.pnpm', dir, 'node_modules', name));
};
const sharp = pnpm('sharp');
const EncoderModule = await pnpm('draco3dgltf').createEncoderModule();

const bytes = fs.readFileSync(path.join(source, 'CirculatorySystem.glb'));
const jsonLength = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength));
const bin = bytes.subarray(28 + jsonLength);
const view = (index) => { const v = gltf.bufferViews[index]; return bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength); };
const read = (index, Type) => {
  const a = gltf.accessors[index];
  const v = view(a.bufferView);
  const copy = Buffer.from(v.subarray(a.byteOffset ?? 0, (a.byteOffset ?? 0) + a.count * { VEC3: 3, VEC2: 2, SCALAR: 1 }[a.type] * Type.BYTES_PER_ELEMENT));
  return new Type(copy.buffer, copy.byteOffset, copy.length / Type.BYTES_PER_ELEMENT);
};

const body = gltf.meshes.find((mesh) => mesh.name === 'circulatory_system');
if (!body || body.primitives.length !== 1) throw new Error('Expected one circulatory_system primitive');
const primitive = body.primitives[0];
const positions = read(primitive.attributes.POSITION, Float32Array);
const normals = read(primitive.attributes.NORMAL, Float32Array);
const uvs = read(primitive.attributes.TEXCOORD_0, Float32Array);
const indices = read(primitive.indices, Uint32Array);
const count = positions.length / 3;
const material = gltf.materials[primitive.material];
const imageOf = (texture) => view(gltf.images[gltf.textures[texture.index].source].bufferView);

// 1. Artery (1), vein (2) or organ (0), from the painted colour under each vertex.
const diffuse = await sharp(imageOf(material.pbrMetallicRoughness.baseColorTexture)).raw().toBuffer({ resolveWithObject: true });
const vessel = new Float32Array(count);
for (let i = 0; i < count; i++) {
  const x = Math.min(diffuse.info.width - 1, Math.max(0, Math.floor(uvs[i * 2] * diffuse.info.width)));
  const y = Math.min(diffuse.info.height - 1, Math.max(0, Math.floor(uvs[i * 2 + 1] * diffuse.info.height)));
  const o = (y * diffuse.info.width + x) * diffuse.info.channels;
  const [r, g, b] = [diffuse.data[o], diffuse.data[o + 1], diffuse.data[o + 2]];
  vessel[i] = r > 150 && g < 90 && b < 110 ? 1 : b > 150 && r < 160 && g < 160 ? 2 : 0;
}

// 2. Distance along the surface from the heart (Dijkstra over the welded mesh).
const weld = new Map();
const node = new Int32Array(count);
for (let i = 0; i < count; i++) {
  const key = `${positions[i * 3].toFixed(5)},${positions[i * 3 + 1].toFixed(5)},${positions[i * 3 + 2].toFixed(5)}`;
  if (!weld.has(key)) weld.set(key, weld.size);
  node[i] = weld.get(key);
}
const nodes = weld.size;
const point = new Float32Array(nodes * 3);
for (let i = 0; i < count; i++) point.set(positions.subarray(i * 3, i * 3 + 3), node[i] * 3);
const edges = Array.from({ length: nodes }, () => new Set());
for (let f = 0; f < indices.length; f += 3) {
  const [a, b, c] = [node[indices[f]], node[indices[f + 1]], node[indices[f + 2]]];
  edges[a].add(b).add(c); edges[b].add(a).add(c); edges[c].add(a).add(b);
}
const length = (a, b) => Math.hypot(point[a * 3] - point[b * 3], point[a * 3 + 1] - point[b * 3 + 1], point[a * 3 + 2] - point[b * 3 + 2]);
// The heart: the middle of the organ surfaces in the chest (the lungs sit either side of it).
const chest = [0, 0, 0];
let chestCount = 0;
for (let i = 0; i < count; i++) {
  if (vessel[i] !== 0 || positions[i * 3 + 1] < 1.2 || positions[i * 3 + 1] > 1.45 || Math.abs(positions[i * 3]) > 0.12) continue;
  for (let k = 0; k < 3; k++) chest[k] += positions[i * 3 + k];
  chestCount++;
}
const heart = process.env.HEART ? process.env.HEART.split(',').map(Number) : chest.map((v) => v / chestCount);
let root = 0;
for (let n = 1; n < nodes; n++) if (Math.hypot(point[n * 3] - heart[0], point[n * 3 + 1] - heart[1], point[n * 3 + 2] - heart[2]) < Math.hypot(point[root * 3] - heart[0], point[root * 3 + 1] - heart[1], point[root * 3 + 2] - heart[2])) root = n;
const distance = new Float64Array(nodes).fill(Infinity);
distance[root] = 0;
const heap = [[0, root]];
const push = (item) => { heap.push(item); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
while (heap.length) {
  const [d, n] = pop();
  if (d > distance[n]) continue;
  for (const m of edges[n]) { const next = d + length(n, m); if (next < distance[m]) { distance[m] = next; push([next, m]); } }
}
let farthest = 0;
for (const d of distance) if (Number.isFinite(d)) farthest = Math.max(farthest, d);

// 3. Which loop each vertex belongs to: heart (0), pulmonary (1) or systemic (2). With the heart
// cut out, the lung vessel trees fall apart from the body's; they are the large pieces inside the
// chest.
const near = (n, radius) => Math.hypot(point[n * 3] - heart[0], point[n * 3 + 1] - heart[1], point[n * 3 + 2] - heart[2]) < radius;
const cut = new Uint8Array(nodes);
for (let i = 0; i < count; i++) if (vessel[i] === 0 && near(node[i], 0.09)) cut[node[i]] = 1;
const parent = Int32Array.from({ length: nodes }, (_, i) => i);
const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
for (let n = 0; n < nodes; n++) if (!cut[n]) for (const m of edges[n]) if (!cut[m]) { const a = find(n), b = find(m); if (a !== b) parent[b] = a; }
const pieces = new Map();
for (let n = 0; n < nodes; n++) {
  if (cut[n]) continue;
  const r = find(n);
  let piece = pieces.get(r);
  if (!piece) pieces.set(r, piece = { size: 0, min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] });
  piece.size++;
  for (let k = 0; k < 3; k++) { piece.min[k] = Math.min(piece.min[k], point[n * 3 + k]); piece.max[k] = Math.max(piece.max[k], point[n * 3 + k]); }
}
const pieceLoop = new Map();
for (const [r, piece] of pieces) {
  const chestPiece = Math.max(Math.abs(piece.min[0]), Math.abs(piece.max[0])) < 0.14 && piece.min[1] > 1.25 && piece.max[1] < 1.5;
  pieceLoop.set(r, chestPiece ? (piece.size > 1000 ? 1 : 0) : 2);
}
const loop = new Float32Array(count);
for (let i = 0; i < count; i++) loop[i] = cut[node[i]] ? 0 : pieceLoop.get(find(node[i]));
const lungPieces = [...pieces].filter(([r]) => pieceLoop.get(r) === 1).length;
if (lungPieces < 2) throw new Error(`Expected the lung vessel trees to separate from the body, found ${lungPieces}`);
const reach = new Float32Array(count);
let unreached = 0;
for (let i = 0; i < count; i++) {
  const d = distance[node[i]];
  if (!Number.isFinite(d)) unreached++;
  reach[i] = Number.isFinite(d) ? d / farthest : 1;
}

// 4. Smaller textures (no ambient occlusion: the lighting is soft enough without it).
const texture = async (texture, width, quality) => sharp(imageOf(texture)).resize({ width }).jpeg({ quality, mozjpeg: true }).toBuffer();
const colourImage = await texture(material.pbrMetallicRoughness.baseColorTexture, 2048, 82);
const normalImage = await texture(material.normalTexture, 1024, 85);

// 5. One Draco-compressed mesh.
const root2 = {
  asset: { version: '2.0', generator: 'SciPal circulation preparation', copyright: '"Circulatory System" by brianj.seely (https://sketchfab.com/3d-models/circulatory-system-3584d5b2b97545cf965007c195899b7b), CC BY 4.0; modified by SciPal' },
  scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: 'circulation', mesh: 0 }],
  meshes: [], accessors: [], bufferViews: [], buffers: [],
  images: [{ bufferView: 0, mimeType: 'image/jpeg', name: 'colour' }, { bufferView: 1, mimeType: 'image/jpeg', name: 'normal' }],
  samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
  textures: [{ sampler: 0, source: 0 }, { sampler: 0, source: 1 }],
  materials: [{ name: 'circulation', normalTexture: { index: 1 }, pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.45 } }],
  extensionsUsed: ['KHR_draco_mesh_compression'], extensionsRequired: ['KHR_draco_mesh_compression'],
};
const chunks = [];
let byteLength = 0;
const append = (data) => {
  root2.bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: data.length });
  chunks.push(data); byteLength += data.length;
  const padding = (4 - byteLength % 4) % 4;
  if (padding) { chunks.push(Buffer.alloc(padding)); byteLength += padding; }
  return root2.bufferViews.length - 1;
};
append(colourImage);
append(normalImage);

const builder = new EncoderModule.MeshBuilder();
const encoder = new EncoderModule.Encoder();
encoder.SetSpeedOptions(5, 5);
encoder.SetAttributeQuantization(EncoderModule.POSITION, 14);
encoder.SetAttributeQuantization(EncoderModule.NORMAL, 10);
encoder.SetAttributeQuantization(EncoderModule.TEX_COORD, 12);
encoder.SetAttributeQuantization(EncoderModule.GENERIC, 10);
encoder.SetTrackEncodedProperties(true);
const mesh = new EncoderModule.Mesh();
builder.AddFacesToMesh(mesh, indices.length / 3, indices);
const ids = {
  POSITION: builder.AddFloatAttributeToMesh(mesh, EncoderModule.POSITION, count, 3, positions),
  NORMAL: builder.AddFloatAttributeToMesh(mesh, EncoderModule.NORMAL, count, 3, normals),
  TEXCOORD_0: builder.AddFloatAttributeToMesh(mesh, EncoderModule.TEX_COORD, count, 2, uvs),
  _VESSEL: builder.AddFloatAttributeToMesh(mesh, EncoderModule.GENERIC, count, 1, vessel),
  _REACH: builder.AddFloatAttributeToMesh(mesh, EncoderModule.GENERIC, count, 1, reach),
  _LOOP: builder.AddFloatAttributeToMesh(mesh, EncoderModule.GENERIC, count, 1, loop),
};
const encoded = new EncoderModule.DracoInt8Array();
const size = encoder.EncodeMeshToDracoBuffer(mesh, encoded);
if (size <= 0) throw new Error('Draco encoding failed');
const dracoView = append(Buffer.from(Int8Array.from({ length: size }, (_, i) => encoded.GetValue(i)).buffer));
const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < count; i++) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], positions[i * 3 + k]); max[k] = Math.max(max[k], positions[i * 3 + k]); }
const attributes = {};
for (const [name, type] of [['POSITION', 'VEC3'], ['NORMAL', 'VEC3'], ['TEXCOORD_0', 'VEC2'], ['_VESSEL', 'SCALAR'], ['_REACH', 'SCALAR'], ['_LOOP', 'SCALAR']]) {
  root2.accessors.push({ componentType: 5126, type, count: encoder.GetNumberOfEncodedPoints(), ...(name === 'POSITION' ? { min, max } : {}) });
  attributes[name] = root2.accessors.length - 1;
}
root2.accessors.push({ componentType: 5125, type: 'SCALAR', count: encoder.GetNumberOfEncodedFaces() * 3 });
root2.meshes.push({ name: 'circulation', primitives: [{ attributes, indices: root2.accessors.length - 1, material: 0, extensions: { KHR_draco_mesh_compression: { bufferView: dracoView, attributes: ids } } }] });
root2.buffers.push({ byteLength });
EncoderModule.destroy(encoded); EncoderModule.destroy(mesh); EncoderModule.destroy(encoder); EncoderModule.destroy(builder);

const json = Buffer.from(JSON.stringify(root2));
const padded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
const binary = Buffer.concat(chunks);
const header = Buffer.alloc(20);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + padded.length + binary.length, 8);
header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
const binaryHeader = Buffer.alloc(8);
binaryHeader.writeUInt32LE(binary.length); binaryHeader.writeUInt32LE(0x004e4942, 4);
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'circulation.glb'), Buffer.concat([header, padded, binaryHeader, binary]));
// 6. Where the labels point, in model coordinates (metres; the front of the body faces -z and the
// person's right is +x).
const centroid = (test) => {
  const sum = [0, 0, 0];
  let n = 0;
  for (let i = 0; i < count; i++) {
    const [x, y, z] = [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]];
    if (!test(x, y, z, vessel[i], loop[i])) continue;
    sum[0] += x; sum[1] += y; sum[2] += z; n++;
  }
  if (n < 20) throw new Error('A landmark found too few vertices');
  return sum.map((v) => +(v / n).toFixed(4));
};
const landmarks = {
  heart: Array.from(point.slice(root * 3, root * 3 + 3), (v) => +v.toFixed(4)),
  aorta: centroid((x, y, z, v, l) => l === 2 && v === 1 && y > 1.1 && y < 1.2 && Math.abs(x) < 0.05),
  inferiorVenaCava: centroid((x, y, z, v, l) => l === 2 && v === 2 && y > 1.1 && y < 1.2 && Math.abs(x) < 0.06),
  superiorVenaCava: centroid((x, y, z, v, l) => l === 2 && v === 2 && y > 1.42 && y < 1.48 && x > -0.02 && x < 0.06),
  rightLung: centroid((x, y, z, v, l) => l === 1 && x > 0.05),
  leftLung: centroid((x, y, z, v, l) => l === 1 && x < -0.05),
  kidney: centroid((x, y, z, v, l) => l === 2 && y > 1.12 && y < 1.24 && x > 0.05 && x < 0.14),
  head: centroid((x, y, z, v, l) => l === 2 && y > 1.62),
  hand: centroid((x, y, z, v, l) => l === 2 && y > 0.68 && y < 0.78 && x > 0.28),
};
const landmarkLines = Object.entries(landmarks).map(([name, p]) => `  ${name}: [${p.join(', ')}],`).join('\n');
fs.writeFileSync('frontend/features/simulations/circulationLandmarks.ts', `import type { Point3 } from './kneeReflexParts';

// Generated by scripts/assets/build-circulation.mjs, in model coordinates (metres; the body faces -z,
// the person's right is +x). VESSEL_LENGTH is the longest path along the vessels from the heart.
export const CIRCULATION_LANDMARKS = {
${landmarkLines}
} as const satisfies Record<string, Point3>;

export const VESSEL_LENGTH = ${+farthest.toFixed(4)};
`);
const classes = [0, 1, 2].map((c) => vessel.filter((v) => v === c).length);
const loops = [0, 1, 2].map((c) => loop.filter((v) => v === c).length);
const summary = { vertices: count, heartLoop: loops[0], pulmonary: loops[1], systemic: loops[2], lungPieces, organ: classes[0], artery: classes[1], vein: classes[2], heart: Array.from(point.slice(root * 3, root * 3 + 3), (v) => +v.toFixed(4)), farthest: +farthest.toFixed(3), unreached, bytes: 28 + padded.length + binary.length, colour: colourImage.length, normal: normalImage.length, geometry: size };
console.log(JSON.stringify(summary));
