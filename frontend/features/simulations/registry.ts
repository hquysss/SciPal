import type { BuiltInSimulationKind } from '@scipal/types';
import { kneeReflexModule } from './kneeReflex';
import { circulationModule } from './circulation';
import { skinModule } from './skin';
import { algorithmModule } from './algorithm';
import { codeTraceModule } from './codeTrace';
import { complexityModule } from './complexity';
import { functionGraphModule } from './functionGraph';
import { graph3dModule } from './graph3d';
import { harmonic3dModule } from './harmonic3d';
import { dampedPendulumModule } from './dampedPendulum';
import { equilibriumModule } from './equilibrium';
import { logicModule } from './logic';
import { historyMapModule } from './historyMap';
import { historyWorldModule } from './historyWorld';
import { historyTimelineModule } from './historyTimeline';
import { beforeAfterModule } from './beforeAfter';
import { orgChartModule } from './orgChart';
import { labeledDiagramModule } from './labeledDiagram';
import { motionModule } from './motion';
import { ohmCircuitModule } from './ohmCircuit';
import { pendulumModule } from './pendulum';
import { probabilityModule } from './probability';
import { punnettModule } from './punnett';
import { solid3dModule } from './solid3d';
import { titrationModule } from './titration';
import { unitCircleModule } from './unitCircle';
import { wave3dModule } from './wave3d';
import { webPreviewModule } from './webPreview';
import type { SimulationModule } from './types';

/** Every built-in template, used by the Studio editor, its preview and the learner page alike. */
export const simulationModules: { [K in BuiltInSimulationKind]: SimulationModule<K> } = {
  'knee-reflex': kneeReflexModule,
  'circulation-3d': circulationModule,
  'skin-senses': skinModule,
  'algorithm-sim': algorithmModule,
  'complexity-sim': complexityModule,
  'code-trace': codeTraceModule,
  'web-preview': webPreviewModule,
  'function-graph': functionGraphModule,
  probability: probabilityModule,
  'unit-circle': unitCircleModule,
  'solid-3d': solid3dModule,
  'graph-3d': graph3dModule,
  titration: titrationModule,
  'chemical-equilibrium': equilibriumModule,
  'logic-gates': logicModule,
  motion: motionModule,
  pendulum: pendulumModule,
  'harmonic-3d': harmonic3dModule,
  'damped-pendulum': dampedPendulumModule,
  'wave-3d': wave3dModule,
  'ohm-circuit': ohmCircuitModule,
  punnett: punnettModule,
  'labeled-diagram': labeledDiagramModule,
  'history-map': historyMapModule,
  'history-world': historyWorldModule,
  'history-timeline': historyTimelineModule,
  'before-after': beforeAfterModule,
  'org-chart': orgChartModule,
};
