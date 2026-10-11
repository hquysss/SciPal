import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import * as THREE from '../../frontend/node_modules/three/build/three.module.js';

const source = process.argv[2] ?? 'scratch/knee-reflex-assets';
const output = 'frontend/public/models/knee-reflex';
const wrapper = path.resolve('frontend/node_modules/three/examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js');
const decoderFile = path.join(source, 'draco-decoder.cjs');
fs.copyFileSync(wrapper, decoderFile);
const Draco = await createRequire(import.meta.url)(path.resolve(decoderFile))({ wasmBinary: fs.readFileSync(wrapper.replace('draco_wasm_wrapper.js', 'draco_decoder.wasm')) });
const decoder = new Draco.Decoder();
const EncoderModule = await createRequire(import.meta.url)(path.resolve('scratch/knee-reflex-tools/node_modules/draco3dgltf')).createEncoderModule();
const builder = new EncoderModule.MeshBuilder();
const encoder = new EncoderModule.Encoder();
encoder.SetSpeedOptions(5, 5);
encoder.SetAttributeQuantization(EncoderModule.POSITION, 14);
encoder.SetAttributeQuantization(EncoderModule.NORMAL, 10);
encoder.SetAttributeQuantization(EncoderModule.GENERIC, 16);
encoder.SetTrackEncodedProperties(true);
const documents = ['skeleton-final.glb', 'muscular.glb'].map((name) => {
  const bytes = fs.readFileSync(path.join(source, name));
  const length = bytes.readUInt32LE(12);
  return { bytes, data: JSON.parse(bytes.subarray(20, 20 + length)), offset: 28 + length, name };
});
const hip = new THREE.Vector3(-0.085, 0.87, -0.02);
const knee = new THREE.Vector3(-0.085, 0.433, -0.02);
const origin = new THREE.Vector3(-1.15, -0.5, 0.16);
const rotation = new THREE.Matrix4().makeRotationY(Math.PI / 2);
const upright = (p) => p.clone().sub(hip).multiplyScalar(5.2).applyMatrix4(rotation).add(origin);
const rightKnee = upright(knee).sub(origin).applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2).add(origin);
const root = { asset: { version: '2.0', generator: 'SciPal knee anatomy preparation', copyright: 'BodyParts3D / DBCLS, Z-Anatomy, GLB export JMK712; derivative CC BY-SA 4.0' }, scene: 0, scenes: [{ nodes: [0, 1, 2, 3] }], nodes: [{ name: 'anatomy_upper', children: [] }, { name: 'reflex_knee', translation: rightKnee.toArray(), children: [] }, { name: 'body_outline', children: [] }, { name: 'reflex_fixed_joint' }], meshes: [], materials: [
  { name: 'anatomical_bone', pbrMetallicRoughness: { baseColorFactor: [0.93, 0.9, 0.83, 1], metallicFactor: 0, roughnessFactor: 0.65 } },
  { name: 'anatomical_muscle', pbrMetallicRoughness: { baseColorFactor: [0.69, 0.29, 0.26, 1], metallicFactor: 0, roughnessFactor: 0.7 } },
  { name: 'body_outline', alphaMode: 'BLEND', pbrMetallicRoughness: { baseColorFactor: [0.55, 0.72, 0.66, 0.12], metallicFactor: 0, roughnessFactor: 1 } },
], accessors: [], bufferViews: [], buffers: [], skins: [] };
const chunks = [];
let byteLength = 0;
function appendBytes(bytes) {
  root.bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: bytes.length });
  chunks.push(bytes); byteLength += bytes.length;
  const padding = (4 - byteLength % 4) % 4;
  if (padding) { chunks.push(Buffer.alloc(padding)); byteLength += padding; }
  return root.bufferViews.length - 1;
}
function accessor(array, type, options = {}) {
  const view = appendBytes(Buffer.from(array.buffer, array.byteOffset, array.byteLength));
  root.accessors.push({ bufferView: view, componentType: array instanceof Uint16Array ? 5123 : array instanceof Uint32Array ? 5125 : 5126, count: array.length / ({ SCALAR: 1, VEC3: 3, VEC4: 4, MAT4: 16 }[type]), type, ...options });
  return root.accessors.length - 1;
}
function encodeGeometry({ positions, normals, indices, joints, weights, box }) {
  const mesh = new EncoderModule.Mesh();
  const count = positions.length / 3;
  builder.AddFacesToMesh(mesh, indices.length / 3, indices);
  const ids = { POSITION: builder.AddFloatAttributeToMesh(mesh, EncoderModule.POSITION, count, 3, positions), NORMAL: builder.AddFloatAttributeToMesh(mesh, EncoderModule.NORMAL, count, 3, normals) };
  if (joints) {
    ids.JOINTS_0 = builder.AddUInt16Attribute(mesh, EncoderModule.GENERIC, count, 4, joints);
    ids.WEIGHTS_0 = builder.AddFloatAttributeToMesh(mesh, EncoderModule.GENERIC, count, 4, weights);
  }
  const encoded = new EncoderModule.DracoInt8Array();
  const size = encoder.EncodeMeshToDracoBuffer(mesh, encoded);
  if (size <= 0) throw new Error('Draco encoding failed');
  const bytes = Buffer.from(Int8Array.from({ length: size }, (_, i) => encoded.GetValue(i)).buffer);
  const view = appendBytes(bytes);
  const attributes = {};
  for (const name of Object.keys(ids)) {
    root.accessors.push({ componentType: name === 'JOINTS_0' ? 5123 : 5126, type: name === 'POSITION' || name === 'NORMAL' ? 'VEC3' : 'VEC4', count: encoder.GetNumberOfEncodedPoints(), ...(name === 'POSITION' ? { min: box.min.toArray(), max: box.max.toArray() } : {}) });
    attributes[name] = root.accessors.length - 1;
  }
  root.accessors.push({ componentType: 5125, type: 'SCALAR', count: encoder.GetNumberOfEncodedFaces() * 3 });
  const result = { attributes, indices: root.accessors.length - 1, extensions: { KHR_draco_mesh_compression: { bufferView: view, attributes: ids } } };
  EncoderModule.destroy(encoded); EncoderModule.destroy(mesh);
  return result;
}
function decodeGeometry(doc, primitive) {
  const extension = primitive.extensions.KHR_draco_mesh_compression;
  const view = doc.data.bufferViews[extension.bufferView];
  const start = doc.offset + (view.byteOffset ?? 0);
  if (start + view.byteLength > doc.bytes.length) throw new Error('Missing selected mesh buffer: ' + doc.name + ' @ ' + start);
  const buffer = new Draco.DecoderBuffer();
  buffer.Init(doc.bytes.subarray(start, start + view.byteLength), view.byteLength);
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
  for (const resource of [face, values, mesh, buffer, status]) Draco.destroy(resource);
  return { positions, indices };
}
const selection = /^(Rectus femoris muscle|Vastus (lateralis|medialis|intermedius) muscle|Long head of biceps femoris|Short head of biceps femoris|Semimembranosus muscle|Semitendinosus muscle)/;
const silhouette = /Pectoralis major|External oblique|Rectus abdominis|Deltoid|Trapezius|Latissimus dorsi|Triceps brachii|biceps brachii|Gluteus maximus/;
const legBones = /Femur|Tibia|Fibula|Patella|Calcaneus|Talus|Navicular|Cuboid|Cuneiform|Metatars|phalanx.*foot|Sesamoid bones of foot/i;
const skullBounds = new THREE.Box3();
const vertebrae = [];
let totalVertices = 0;
for (const doc of documents) {
  const bones = doc.name.startsWith('skeleton');
  for (const node of doc.data.nodes) {
    if (node.mesh === undefined) continue;
    if (/labyrinth|cochlea|ear|otic/i.test(node.name)) continue;
    const primitive = doc.data.meshes[node.mesh].primitives[0];
    const bound = doc.data.accessors[primitive.attributes.POSITION];
    const middleY = ((bound.min?.[1] ?? 0) + (bound.max?.[1] ?? 0)) / 2 + (node.translation?.[1] ?? 0);
    const middleX = ((bound.min?.[0] ?? 0) + (bound.max?.[0] ?? 0)) / 2 + (node.translation?.[0] ?? 0);
    const rightLeg = bones && legBones.test(node.name) && middleX < -0.015;
    const thigh = !bones && selection.test(node.name) && node.name.includes('.r.');
    const body = bones || (!bones && silhouette.test(node.name));
    if (!rightLeg && !thigh && !body) continue;
    const active = rightLeg || (thigh && node.name.includes('.r.'));
    const lower = rightLeg && !/Femur|Patella/.test(node.name);
    const geometry = decodeGeometry(doc, primitive);
    const pose = new THREE.Matrix4().compose(new THREE.Vector3(...(node.translation ?? [0, 0, 0])), new THREE.Quaternion(...(node.rotation ?? [0, 0, 0, 1])), new THREE.Vector3(...(node.scale ?? [1, 1, 1])));
    const joints = new Uint16Array(geometry.positions.length / 3 * 4);
    const weights = new Float32Array(joints.length);
    for (let i = 0; i < geometry.positions.length; i += 3) {
      const original = new THREE.Vector3().fromArray(geometry.positions, i).applyMatrix4(pose);
      let p = upright(original);
      const leg = (bones && legBones.test(node.name)) || thigh;
      if (leg) {
        const pivot = upright(new THREE.Vector3(original.x < 0 ? -0.085 : 0.085, 0.87, -0.02));
        const joint = upright(new THREE.Vector3(original.x < 0 ? -0.085 : 0.085, 0.433, -0.02));
        const posedJoint = joint.clone().sub(pivot).applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2).add(pivot);
        const upperPoint = p.clone().sub(pivot).applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2).add(pivot);
        const lowerPoint = p.clone().add(posedJoint).sub(joint);
        const blend = bones ? (lower || (!active && middleY < 0.44) ? 1 : 0) : Math.max(0, Math.min(1, (0.47 - original.y) / 0.075));
        p = upperPoint.lerp(lowerPoint, blend);
        const slot = i / 3 * 4;
        joints[slot + 1] = 1; weights[slot] = 1 - blend; weights[slot + 1] = blend;
      } else weights[i / 3 * 4] = 1;
      if (lower) p.sub(rightKnee);
      p.toArray(geometry.positions, i);
    }
    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setAttribute('position', new THREE.BufferAttribute(geometry.positions, 3));
    bufferGeometry.setIndex(new THREE.BufferAttribute(geometry.indices, 1));
    bufferGeometry.computeVertexNormals(); bufferGeometry.computeBoundingBox();
    const box = bufferGeometry.boundingBox;
    if (/^(Frontal|Parietal|Occipital) bone/.test(node.name)) skullBounds.union(box);
    if (/^Vertebra (C[3-7]|T\d+|L[12])\.|^(Atlas \(C1\)|Axis \(C2\))/.test(node.name)) {
      const centre = box.getCenter(new THREE.Vector3());
      // The dens raises C2's bounding centre above the vertebral canal.
      const y = node.name.startsWith('Axis') ? THREE.MathUtils.lerp(box.min.y, box.max.y, 0.35) : centre.y;
      const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(bufferGeometry, material);
      const intersections = new THREE.Raycaster(new THREE.Vector3(box.min.x - 1, y, centre.z), new THREE.Vector3(1, 0, 0)).intersectObject(mesh).map((hit) => hit.point.x);
      const hits = intersections.filter((x, i) => i === 0 || x - intersections[i - 1] > 0.00001);
      if (hits.length < 4 || hits[2] - hits[1] <= 0.06) throw new Error('Missing vertebral canal gap: ' + node.name);
      vertebrae.push({ name: node.name, bounds: { min: box.min.toArray(), max: box.max.toArray() }, canal: [(hits[1] + hits[2]) / 2, y, centre.z], canalInterval: [hits[1], hits[2]] });
      material.dispose();
    }
    const skinned = thigh && active;
    const encoded = encodeGeometry({ ...geometry, normals: bufferGeometry.attributes.normal.array, box, ...(skinned ? { joints, weights } : {}) });
    root.meshes.push({ name: node.name, primitives: [{ ...encoded, material: active ? (bones ? 0 : 1) : 2 }] });
    const meshNode = { name: node.name, mesh: root.meshes.length - 1, extras: { quadriceps: /Rectus femoris|Vastus /.test(node.name) && active } };
    if (skinned) meshNode.skin = 0;
    root.nodes.push(meshNode);
    if (skinned) root.scenes[0].nodes.push(root.nodes.length - 1);
    else root.nodes[active ? (lower ? 1 : 0) : 2].children.push(root.nodes.length - 1);
    totalVertices += geometry.positions.length / 3;
    bufferGeometry.dispose();
  }
}
const inverse = new Float32Array(32);
new THREE.Matrix4().toArray(inverse, 0);
new THREE.Matrix4().makeTranslation(-rightKnee.x, -rightKnee.y, -rightKnee.z).toArray(inverse, 16);
root.skins.push({ name: 'reflex_articulation', joints: [3, 1], inverseBindMatrices: accessor(inverse, 'MAT4') });
root.buffers.push({ byteLength });
root.extensionsUsed = ['KHR_draco_mesh_compression'];
root.extensionsRequired = ['KHR_draco_mesh_compression'];
const json = Buffer.from(JSON.stringify(root));
const padded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
const binary = Buffer.concat(chunks);
const header = Buffer.alloc(20);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + padded.length + binary.length, 8);
header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
const binaryHeader = Buffer.alloc(8);
binaryHeader.writeUInt32LE(binary.length); binaryHeader.writeUInt32LE(0x004e4942, 4);
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'anatomy.glb'), Buffer.concat([header, padded, binaryHeader, binary]));
vertebrae.sort((a, b) => b.canal[1] - a.canal[1]);
const l1 = vertebrae.find((bone) => bone.name.startsWith('Vertebra L1.'));
const l2 = vertebrae.find((bone) => bone.name.startsWith('Vertebra L2.'));
if (skullBounds.isEmpty() || !l1 || !l2 || vertebrae.length !== 21) throw new Error('Incomplete cranial/spinal landmarks');
const brainCenter = skullBounds.getCenter(new THREE.Vector3()).toArray();
const brainScale = skullBounds.getSize(new THREE.Vector3()).multiply(new THREE.Vector3(0.38, 0.365, 0.385)).toArray();
const canalPoints = vertebrae.filter((bone) => bone !== l2).map((bone) => bone.canal);
const brainStem = [canalPoints[0][0], brainCenter[1] - brainScale[1] * 0.78, canalPoints[0][2]];
const cordPoints = [brainStem, ...canalPoints, new THREE.Vector3(...l1.canal).lerp(new THREE.Vector3(...l2.canal), 0.5).toArray()];
const landmarks = { brainCenter, brainScale, cordPoints, reflexCordPoint: l1.canal, cordLabelPoint: vertebrae.find((bone) => bone.name.startsWith('Vertebra T5.')).canal };
fs.writeFileSync(path.join(output, 'anatomy-landmarks.json'), JSON.stringify({ coordinateSpace: 'body-local', ...landmarks, skullBounds: { min: skullBounds.min.toArray(), max: skullBounds.max.toArray() }, vertebrae }, null, 2));
fs.writeFileSync('frontend/features/simulations/kneeReflexLandmarks.ts', `import type { Point3 } from './kneeReflexParts';\n\n// Generated from the imported bones; positions precede ReflexBody's y=-0.2 offset.\nexport const KNEE_REFLEX_LANDMARKS = ${JSON.stringify(landmarks, null, 2)} as const satisfies {\n  readonly brainCenter: Point3;\n  readonly brainScale: Point3;\n  readonly cordPoints: readonly Point3[];\n  readonly reflexCordPoint: Point3;\n  readonly cordLabelPoint: Point3;\n};\n`);
fs.writeFileSync(path.join(output, 'anatomy-manifest.json'), JSON.stringify({ source: 'https://github.com/JMK712/human-anatomy-online/tree/322ba39e96ea91ce08601caad2c0aaade1dc99f0/public/models', license: 'CC BY-SA 4.0', knee: rightKnee.toArray(), landmarks: 'anatomy-landmarks.json', meshes: root.meshes.map((m) => m.name), vertices: totalVertices, bytes: 28 + padded.length + binary.length }, null, 2));
Draco.destroy(decoder);
EncoderModule.destroy(encoder); EncoderModule.destroy(builder);
console.log(JSON.stringify({ meshes: root.meshes.length, vertices: totalVertices, bytes: 28 + padded.length + binary.length, knee: rightKnee.toArray() }));
