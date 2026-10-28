import { defaultSimulationConfig, HISTORY_WORLD_MAPS, simulationConfig, type BuiltInSimulationKind, type HistoryWorldMap } from '@scipal/types';
import type { LabUsage } from './labQuery';

// The Lab: every built-in simulation of Mathematics, Physics, Chemistry, Biology, Informatics and the
// History maps, open to play with on its own. The Punnett square, labelled diagram and the other history
// blocks (timeline, then-and-now, organisation chart) are lesson-only.

export type Bilingual = { en: string; vi: string };
export type LabSubject = 'math' | 'physics' | 'chemistry' | 'biology' | 'informatics' | 'history';

export const LAB_SUBJECTS: ReadonlyArray<{ slug: LabSubject; name: Bilingual }> = [
  { slug: 'math', name: { en: 'Mathematics', vi: 'Toán' } },
  { slug: 'physics', name: { en: 'Physics', vi: 'Vật lí' } },
  { slug: 'chemistry', name: { en: 'Chemistry', vi: 'Hoá học' } },
  { slug: 'biology', name: { en: 'Biology', vi: 'Sinh học' } },
  { slug: 'informatics', name: { en: 'Informatics', vi: 'Tin học' } },
  { slug: 'history', name: { en: 'History', vi: 'Lịch sử' } },
];

export interface LabItem {
  kind: BuiltInSimulationKind;
  subject: LabSubject;
  /** Shown on the cards and as the page title. */
  name: Bilingual;
  /** What you can try, in one line. */
  blurb: Bilingual;
  /** Where it sits in the programme. */
  grades: Bilingual;
}

export const LAB_ITEMS: readonly LabItem[] = [
  {
    kind: 'function-graph',
    name: { en: 'Function graph', vi: 'Đồ thị hàm số' },
    subject: 'math',
    blurb: { en: 'Type a function, move its parameters and watch the graph change.', vi: 'Nhập hàm số, kéo tham số và xem đồ thị thay đổi.' },
    grades: { en: 'Grades 10–12', vi: 'Lớp 10–12' },
  },
  {
    kind: 'unit-circle',
    name: { en: 'Unit circle', vi: 'Đường tròn lượng giác' },
    subject: 'math',
    blurb: { en: 'Drag a point round the unit circle and read sin, cos, tan exactly.', vi: 'Kéo điểm trên đường tròn lượng giác, đọc sin, cos, tan chính xác.' },
    grades: { en: 'Grade 11', vi: 'Lớp 11' },
  },
  {
    kind: 'graph-3d',
    name: { en: '3D graph', vi: 'Đồ thị 3D' },
    subject: 'math',
    blurb: { en: 'Surfaces, curves, planes and spheres in Oxyz from the equations you type.', vi: 'Mặt, đường cong, mặt phẳng, mặt cầu trong Oxyz từ phương trình bạn gõ.' },
    grades: { en: 'Grade 12', vi: 'Lớp 12' },
  },
  {
    kind: 'solid-3d',
    name: { en: '3D solids', vi: 'Hình không gian 3D' },
    subject: 'math',
    blurb: { en: 'Turn pyramids, prisms, cylinders and cones; hidden edges are dashed.', vi: 'Xoay hình chóp, lăng trụ, trụ, nón; cạnh khuất vẽ nét đứt.' },
    grades: { en: 'Grades 11–12', vi: 'Lớp 11–12' },
  },
  {
    kind: 'probability',
    name: { en: 'Probability experiment', vi: 'Xác suất thực nghiệm' },
    subject: 'math',
    blurb: { en: 'Throw a coin or a die thousands of times and compare with theory.', vi: 'Tung đồng xu, xúc xắc hàng nghìn lần và so với lí thuyết.' },
    grades: { en: 'Grades 10–12', vi: 'Lớp 10–12' },
  },
  {
    kind: 'motion',
    name: { en: 'Motion', vi: 'Chuyển động' },
    subject: 'physics',
    blurb: { en: 'Launch a body and follow its path, speed and time of flight.', vi: 'Ném một vật, theo dõi quỹ đạo, vận tốc và thời gian bay.' },
    grades: { en: 'Grade 10', vi: 'Lớp 10' },
  },
  {
    kind: 'pendulum',
    name: { en: 'Pendulum / spring', vi: 'Con lắc / lò xo' },
    subject: 'physics',
    blurb: { en: 'A pendulum and a spring oscillating, with their period.', vi: 'Con lắc đơn và con lắc lò xo dao động, kèm chu kì.' },
    grades: { en: 'Grade 11', vi: 'Lớp 11' },
  },
  {
    kind: 'harmonic-3d',
    name: { en: 'Harmonic motion 3D', vi: 'Dao động điều hòa 3D' },
    subject: 'physics',
    blurb: { en: 'Rotate the 3D board and follow displacement, velocity and acceleration.', vi: 'Xoay bảng 3D, quan sát li độ, hướng vận tốc và gia tốc.' },
    grades: { en: 'Grade 11', vi: 'Lớp 11' },
  },
  {
    kind: 'damped-pendulum',
    name: { en: 'Damped pendulum 3D', vi: 'Dao động tắt dần của con lắc đơn 3D' },
    subject: 'physics',
    blurb: { en: 'A pen on the bob draws the damped oscillation on a moving plate.', vi: 'Bút gắn ở vật nặng vẽ đồ thị dao động tắt dần trên tấm nhựa chuyển động đều.' },
    grades: { en: 'Grade 11', vi: 'Lớp 11' },
  },
  {
    kind: 'wave-3d',
    name: { en: 'Water waves 3D', vi: 'Sóng trên mặt nước 3D' },
    subject: 'physics',
    blurb: { en: 'A ripple tank: run the motor or turn the crank yourself and watch λ = v/f.', vi: 'Máng tạo sóng: bật motor hoặc tự quay tay, quan sát λ = v/f và miếng xốp dao động tại chỗ.' },
    grades: { en: 'Grade 11', vi: 'Lớp 11' },
  },
  {
    kind: 'ohm-circuit',
    name: { en: "Ohm's law circuit", vi: 'Mạch điện định luật Ohm' },
    subject: 'physics',
    blurb: { en: 'Resistors in series or parallel: current, voltage and Ohm’s law.', vi: 'Điện trở nối tiếp, song song: cường độ, hiệu điện thế, định luật Ohm.' },
    grades: { en: 'Grade 11', vi: 'Lớp 11' },
  },
  {
    kind: 'titration',
    name: { en: 'Acid–base titration', vi: 'Chuẩn độ axit – bazơ' },
    subject: 'chemistry',
    blurb: { en: 'Add NaOH drop by drop, watch the indicator turn and the pH jump.', vi: 'Nhỏ NaOH từng giọt, xem chất chỉ thị đổi màu và bước nhảy pH.' },
    grades: { en: 'Grade 11', vi: 'Lớp 11' },
  },
  {
    kind: 'chemical-equilibrium',
    name: { en: 'Chemical equilibrium 3D', vi: 'Cân bằng hoá học 3D' },
    subject: 'chemistry',
    blurb: { en: 'Change concentration, pressure or temperature in a 3D vessel, predict the shift, then watch the molecules follow Le Chatelier.', vi: 'Đổi nồng độ, áp suất, nhiệt độ trong bình 3D, dự đoán chiều chuyển dịch rồi xem các phân tử tuân theo nguyên lí Le Chatelier.' },
    grades: { en: 'Grade 11', vi: 'Lớp 11' },
  },
  {
    kind: 'knee-reflex',
    name: { en: 'Knee-jerk reflex', vi: 'Phản xạ đầu gối' },
    subject: 'biology',
    blurb: { en: 'Tap the tendon and follow the signal round the reflex arc in a 3D leg.', vi: 'Gõ vào gân và theo dõi xung thần kinh đi qua cung phản xạ trên chân 3D.' },
    grades: { en: 'Grade 11', vi: 'Lớp 11' },
  },
  {
    kind: 'circulation-3d',
    name: { en: 'Blood circulation 3D', vi: 'Tuần hoàn máu 3D' },
    subject: 'biology',
    blurb: { en: 'Follow blood round both loops and watch the heart’s valves and impulses through one cycle.', vi: 'Theo dòng máu qua hai vòng tuần hoàn, xem van tim và xung điện trong một chu kì tim.' },
    grades: { en: 'Grade 11', vi: 'Lớp 11' },
  },
  {
    kind: 'skin-senses',
    name: { en: 'Skin and senses', vi: 'Da và cảm giác' },
    subject: 'biology',
    blurb: { en: 'Prick, press, cool or warm a 3D slice of skin, watch its receptors fire, then follow the withdrawal reflex.', vi: 'Chạm, ấn, áp đá hay vật nóng lên lát cắt da 3D, xem thụ thể phát xung và theo dõi phản xạ rụt tay.' },
    grades: { en: 'Grade 11', vi: 'Lớp 11' },
  },
  {
    kind: 'logic-gates',
    name: { en: 'Logic gates and binary 3D', vi: 'Cổng logic và hệ nhị phân 3D' },
    subject: 'informatics',
    blurb: { en: 'Flip switches on a 3D circuit board: AND, OR, NOT, XOR, a half adder, and bits with their place values.', vi: 'Bật tắt công tắc trên bảng mạch 3D: AND, OR, NOT, XOR, bộ cộng bán phần và các bit với trọng số của chúng.' },
    grades: { en: 'Grade 10', vi: 'Lớp 10' },
  },
  {
    kind: 'algorithm-sim',
    name: { en: 'Algorithm steps', vi: 'Thuật toán từng bước' },
    subject: 'informatics',
    blurb: { en: 'Sorting and searching step by step, every comparison shown.', vi: 'Sắp xếp và tìm kiếm từng bước, thấy rõ mọi phép so sánh.' },
    grades: { en: 'Grades 10–11', vi: 'Lớp 10–11' },
  },
  {
    kind: 'complexity-sim',
    name: { en: 'Algorithm complexity', vi: 'Độ phức tạp thuật toán' },
    subject: 'informatics',
    blurb: { en: 'Seven loop patterns from O(1) to O(n!): count every operation and watch the slow ones explode.', vi: 'Bảy mẫu vòng lặp từ O(1) đến O(n!): đếm từng phép toán và xem các mẫu chậm bùng nổ.' },
    grades: { en: 'Grade 11', vi: 'Lớp 11' },
  },
  {
    kind: 'history-map',
    name: { en: 'Campaign maps', vi: 'Bản đồ chiến dịch' },
    subject: 'history',
    blurb: { en: 'Lam Son, the decisive battles and Tay Son: marches drawn stage by stage, with narration.', vi: 'Lam Sơn, các trận quyết chiến và Tây Sơn: đường hành quân vẽ dần từng giai đoạn, có thuyết minh.' },
    grades: { en: 'Grade 11', vi: 'Lớp 11' },
  },
  {
    kind: 'history-world',
    name: { en: 'World maps', vi: 'Bản đồ thế giới' },
    subject: 'history',
    blurb: { en: 'Colonial empires in 1914 and Latin America winning independence, year by year.', vi: 'Các đế quốc thực dân năm 1914 và Mỹ Latinh giành độc lập, theo từng năm.' },
    grades: { en: 'Grade 11', vi: 'Lớp 11' },
  },
];

const WORLD_MAP_NAMES: Record<HistoryWorldMap, Bilingual> = {
  'empires-1914': { en: 'Colonial empires, 1914', vi: 'Các đế quốc thực dân năm 1914' },
  'latin-america': { en: 'Latin American independence', vi: 'Mỹ Latinh giành độc lập' },
};

/** One version of a simulation the Lab can open. */
export interface LabVariant {
  id: string;
  name: Bilingual;
  config: unknown;
}

/**
 * The versions of a simulation to choose from: the built-in world maps, every campaign map a
 * published lesson carries (their content lives in the lessons), or just the default settings.
 */
export function labVariants(item: LabItem, usages: readonly LabUsage[] | null): LabVariant[] {
  if (item.kind === 'history-world') return HISTORY_WORLD_MAPS.map((map) => ({ id: map, name: WORLD_MAP_NAMES[map], config: { map } }));
  if (item.kind === 'history-map') {
    return (usages ?? []).flatMap((u, i) => {
      const config = u.kind === 'history-map' ? simulationConfig('history-map', u.config) : null;
      // A heading typed in Vietnamese only still needs an English name: fall back field by field.
      const name = { en: u.heading.en || u.lesson.en || u.heading.vi, vi: u.heading.vi || u.lesson.vi };
      return config ? [{ id: `${u.href}#${i}`, name, config }] : [];
    });
  }
  return [{ id: 'default', name: item.name, config: defaultSimulationConfig(item.kind) }];
}

export const labItem = (kind: string) => LAB_ITEMS.find((item) => item.kind === kind) ?? null;
