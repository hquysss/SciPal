import type { BuiltInSimulationKind } from '@scipal/types';
import { algorithmModule } from './algorithm';
import { functionGraphModule } from './functionGraph';
import { labeledDiagramModule } from './labeledDiagram';
import { motionModule } from './motion';
import { ohmCircuitModule } from './ohmCircuit';
import { pendulumModule } from './pendulum';
import { probabilityModule } from './probability';
import { punnettModule } from './punnett';
import type { SimulationModule } from './types';

/** Every built-in template, used by the Studio editor, its preview and the learner page alike. */
export const simulationModules: { [K in BuiltInSimulationKind]: SimulationModule<K> } = {
  'algorithm-sim': algorithmModule,
  'function-graph': functionGraphModule,
  probability: probabilityModule,
  motion: motionModule,
  pendulum: pendulumModule,
  'ohm-circuit': ohmCircuitModule,
  punnett: punnettModule,
  'labeled-diagram': labeledDiagramModule,
};
