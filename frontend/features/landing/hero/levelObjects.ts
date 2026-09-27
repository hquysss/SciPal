import type { EducationLevel } from '../educationLevel';

export const LEVEL_OBJECT_IDS: Record<EducationLevel, string[]> = {
  primary: ['pencil', 'ruler', 'chalk-box'],
  lower_secondary: ['compass', 'set-square', 'calculator'],
  upper_secondary: ['flask', 'magnifier', 'keyboard'],
};
