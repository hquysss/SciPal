// The blood vessels in order from the heart and back, with the typical values of a healthy resting
// adult as in the Biology 11 figures (10.8, 10.9): blood pressure falls along the way, the total
// cross-section is widest in the capillaries, and the speed of the blood follows from it.

export type VesselKey = 'aorta' | 'artery' | 'arteriole' | 'capillary' | 'venule' | 'vein' | 'venaCava';

export interface Vessel {
  readonly key: VesselKey;
  /** Total cross-section of all vessels of this kind, cm². */
  readonly area: number;
  /** Blood pressure in mmHg at the peak and the trough of the heartbeat. */
  readonly systolic: number;
  readonly diastolic: number;
}

export const VESSELS: readonly Vessel[] = [
  { key: 'aorta', area: 4.5, systolic: 120, diastolic: 80 },
  { key: 'artery', area: 20, systolic: 115, diastolic: 75 },
  { key: 'arteriole', area: 100, systolic: 70, diastolic: 40 },
  { key: 'capillary', area: 5000, systolic: 25, diastolic: 25 },
  { key: 'venule', area: 250, systolic: 15, diastolic: 15 },
  { key: 'vein', area: 80, systolic: 8, diastolic: 8 },
  { key: 'venaCava', area: 8, systolic: 3, diastolic: 3 },
];

const STROKE_VOLUME = 70; // mL of blood pushed out by one beat

/** Blood flowing through the heart, cm³ per second (the same through every kind of vessel). */
export const cardiacOutput = (bpm: number) => (bpm * STROKE_VOLUME) / 60;

/** Speed of the blood in cm/s: the flow divided by the total cross-section. */
export const bloodSpeed = (vessel: Vessel, bpm: number) => cardiacOutput(bpm) / vessel.area;

/** Pressure at a moment of the beat; `pulse` is 0 at the trough and 1 at the peak. */
export const pressureAt = (vessel: Vessel, pulse: number) => vessel.diastolic + (vessel.systolic - vessel.diastolic) * pulse;
