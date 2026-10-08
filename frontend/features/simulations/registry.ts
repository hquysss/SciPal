import type { BuiltInSimulationKind } from '@scipal/types';
import { algorithmModule } from './algorithm';
import { functionGraphModule } from './functionGraph';
import { graph3dModule } from './graph3d';
import { harmonic3dModule } from './harmonic3d';
import { labeledDiagramModule } from './labeledDiagram';
import { motionModule } from './motion';
import { ohmCircuitModule } from './ohmCircuit';
import { pendulumModule } from './pendulum';
import { probabilityModule } from './probability';
import { punnettModule } from './punnett';
import { solid3dModule } from './solid3d';
import { titrationModule } from './titration';
import { unitCircleModule } from './unitCircle';
import type { SimulationModule } from './types';

/** Every built-in template, used by the Studio editor, its preview and the learner page alike. */
export const simulationModules: { [K in BuiltInSimulationKind]: SimulationModule<K> } = {
  'algorithm-sim': algorithmModule,
  'function-graph': functionGraphModule,
  probability: probabilityModule,
  'unit-circle': unitCircleModule,
  'solid-3d': solid3dModule,
  'graph-3d': graph3dModule,
  titration: titrationModule,
  motion: motionModule,
  pendulum: pendulumModule,
  'harmonic-3d': harmonic3dModule,
  'ohm-circuit': ohmCircuitModule,
  punnett: punnettModule,
  'labeled-diagram': labeledDiagramModule,
};
