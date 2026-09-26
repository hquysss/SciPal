import type { EducationLevel } from '../educationLevel';

/** Theme token each part is painted with (see readSceneColors). */
export type SceneColorRole = 'paper' | 'surface' | 'ink' | 'line' | 'nav' | 'navInk' | 'action';

export type SceneShape = 'box' | 'cylinder' | 'cone' | 'sphere' | 'torus';

export interface ScenePart {
  shape: SceneShape;
  /**
   * box: [width, height, depth]; cylinder: [radiusTop, height, radiusBottom];
   * cone: [radius, height, radius]; sphere: [radius, radius, radius]; torus: [radius, tube, radius].
   */
  size: [number, number, number];
  offset: [number, number, number];
  rotation?: [number, number, number];
  /** Radial segments; low counts keep the flat, hand-drawn low-poly look. */
  segments?: number;
  color: SceneColorRole;
}

export interface SceneObject {
  id: string;
  parts: ScenePart[];
  position: [number, number, number];
  rotationY: number;
  /** Bob amplitude in scene units; 0 keeps the object still. */
  float: number;
}

const HALF_PI = Math.PI / 2;

function pageLines(x: number): ScenePart[] {
  return [-0.6, -0.3, 0, 0.3, 0.6].map((z) => ({
    shape: 'box',
    size: [1.15, 0.004, 0.018],
    offset: [x, 0.065, z],
    color: 'line',
  }));
}

/** Desk top at y = 0 with an open notebook in the middle; the same for every level. */
export const SCENE_BASE: SceneObject[] = [
  {
    id: 'desk',
    parts: [{ shape: 'box', size: [12, 0.3, 7.5], offset: [0, -0.15, 0], color: 'line' }],
    position: [0, 0, 0],
    rotationY: 0,
    float: 0,
  },
  {
    id: 'notebook',
    parts: [
      { shape: 'box', size: [3.3, 0.04, 2.35], offset: [0, 0.02, 0], color: 'nav' },
      { shape: 'box', size: [1.55, 0.06, 2.2], offset: [-0.79, 0.06, 0], rotation: [0, 0, 0.05], color: 'surface' },
      { shape: 'box', size: [1.55, 0.06, 2.2], offset: [0.79, 0.06, 0], rotation: [0, 0, -0.05], color: 'surface' },
      ...pageLines(-0.8),
      ...pageLines(0.8),
      { shape: 'cylinder', size: [0.22, 0.01, 0.22], offset: [0.95, 0.075, -0.55], segments: 10, color: 'action' },
    ],
    position: [0, 0, 0],
    rotationY: -0.12,
    float: 0,
  },
];

function keyGrid(rows: number, cols: number, width: number, depth: number, y: number, z0: number): ScenePart[] {
  const parts: ScenePart[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      parts.push({
        shape: 'box',
        size: [width * 0.7, 0.04, depth * 0.7],
        offset: [(col - (cols - 1) / 2) * width, y, z0 + row * depth],
        color: 'nav',
      });
    }
  }
  return parts;
}

export const SCENE_OBJECTS: Record<EducationLevel, SceneObject[]> = {
  primary: [
    {
      id: 'pencil',
      parts: [
        { shape: 'cylinder', size: [0.11, 2.2, 0.11], offset: [0, 0, 0], rotation: [0, 0, HALF_PI], segments: 6, color: 'nav' },
        { shape: 'cone', size: [0.11, 0.35, 0.11], offset: [-1.27, 0, 0], rotation: [0, 0, HALF_PI], segments: 6, color: 'surface' },
        { shape: 'cone', size: [0.04, 0.12, 0.04], offset: [-1.44, 0, 0], rotation: [0, 0, HALF_PI], segments: 6, color: 'ink' },
      ],
      position: [-3.1, 0.12, 0.9],
      rotationY: 0.45,
      float: 0.05,
    },
    {
      id: 'ruler',
      parts: [
        { shape: 'box', size: [3, 0.05, 0.5], offset: [0, 0, 0], color: 'surface' },
        { shape: 'box', size: [3, 0.055, 0.08], offset: [0, 0, 0.2], color: 'action' },
      ],
      position: [3, 0.04, -1.7],
      rotationY: -0.3,
      float: 0.03,
    },
    {
      id: 'chalk-box',
      parts: [
        { shape: 'box', size: [1.2, 0.6, 0.8], offset: [0, 0, 0], color: 'action' },
        { shape: 'cylinder', size: [0.07, 0.5, 0.07], offset: [-0.3, 0.4, 0], segments: 6, color: 'surface' },
        { shape: 'cylinder', size: [0.07, 0.5, 0.07], offset: [0, 0.45, 0.1], segments: 6, color: 'navInk' },
        { shape: 'cylinder', size: [0.07, 0.5, 0.07], offset: [0.3, 0.38, -0.1], segments: 6, color: 'paper' },
      ],
      position: [3, 0.3, 1.3],
      rotationY: 0.4,
      float: 0.06,
    },
  ],
  lower_secondary: [
    {
      id: 'compass',
      parts: [
        { shape: 'cylinder', size: [0.04, 1.8, 0.02], offset: [-0.26, 0, 0], rotation: [0, 0, -0.3], segments: 6, color: 'ink' },
        { shape: 'cylinder', size: [0.04, 1.8, 0.02], offset: [0.26, 0, 0], rotation: [0, 0, 0.3], segments: 6, color: 'ink' },
        { shape: 'sphere', size: [0.15, 0.15, 0.15], offset: [0, 0.88, 0], segments: 8, color: 'action' },
      ],
      position: [-3, 0.86, -0.9],
      rotationY: 0.3,
      float: 0.06,
    },
    {
      id: 'set-square',
      parts: [
        { shape: 'cylinder', size: [1.1, 0.05, 1.1], offset: [0, 0, 0], segments: 3, color: 'action' },
        { shape: 'cylinder', size: [0.42, 0.056, 0.42], offset: [0, 0, 0], segments: 3, color: 'line' },
      ],
      position: [3, 0.04, -1.3],
      rotationY: 0.2,
      float: 0.04,
    },
    {
      id: 'calculator',
      parts: [
        { shape: 'box', size: [1.1, 0.2, 1.6], offset: [0, 0, 0], color: 'ink' },
        { shape: 'box', size: [0.85, 0.21, 0.35], offset: [0, 0.005, -0.5], color: 'surface' },
        ...keyGrid(3, 3, 0.3, 0.3, 0.11, -0.05),
      ],
      position: [2.8, 0.12, 1.4],
      rotationY: -0.25,
      float: 0.05,
    },
  ],
  upper_secondary: [
    {
      id: 'flask',
      parts: [
        { shape: 'cone', size: [0.62, 1.1, 0.62], offset: [0, -0.15, 0], segments: 8, color: 'nav' },
        { shape: 'cylinder', size: [0.15, 0.6, 0.15], offset: [0, 0.65, 0], segments: 8, color: 'surface' },
      ],
      position: [-3, 0.7, -0.8],
      rotationY: 0,
      float: 0.06,
    },
    {
      id: 'magnifier',
      parts: [
        { shape: 'torus', size: [0.55, 0.08, 0.55], offset: [0, 0, 0], rotation: [HALF_PI, 0, 0], segments: 12, color: 'ink' },
        { shape: 'cylinder', size: [0.5, 0.03, 0.5], offset: [0, 0, 0], segments: 12, color: 'surface' },
        { shape: 'box', size: [1, 0.12, 0.18], offset: [1.05, 0, 0], color: 'action' },
      ],
      position: [3, 0.1, -1.3],
      rotationY: 0.6,
      float: 0.05,
    },
    {
      id: 'keyboard',
      parts: [
        { shape: 'box', size: [3.2, 0.18, 1], offset: [0, 0, 0], color: 'ink' },
        ...[-0.3, 0, 0.3].map<ScenePart>((z) => ({
          shape: 'box',
          size: [2.9, 0.05, 0.2],
          offset: [0, 0.1, z],
          color: 'surface',
        })),
      ],
      position: [2.9, 0.1, 1.5],
      rotationY: -0.35,
      float: 0.03,
    },
  ],
};
