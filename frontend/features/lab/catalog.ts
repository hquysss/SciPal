import type { BuiltInSimulationKind } from '@scipal/types';

// The Lab: every built-in simulation of Mathematics, Physics, Chemistry, Biology and Informatics,
// open to play with on its own. The Punnett square and labelled diagram are lesson-only.

export type Bilingual = { en: string; vi: string };
export type LabSubject = 'math' | 'physics' | 'chemistry' | 'biology' | 'informatics';

export const LAB_SUBJECTS: ReadonlyArray<{ slug: LabSubject; name: Bilingual }> = [
  { slug: 'math', name: { en: 'Mathematics', vi: 'Toán' } },
  { slug: 'physics', name: { en: 'Physics', vi: 'Vật lí' } },
  { slug: 'chemistry', name: { en: 'Chemistry', vi: 'Hoá học' } },
  { slug: 'biology', name: { en: 'Biology', vi: 'Sinh học' } },
  { slug: 'informatics', name: { en: 'Informatics', vi: 'Tin học' } },
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
    kind: 'algorithm-sim',
    name: { en: 'Algorithm steps', vi: 'Thuật toán từng bước' },
    subject: 'informatics',
    blurb: { en: 'Sorting and searching step by step, every comparison shown.', vi: 'Sắp xếp và tìm kiếm từng bước, thấy rõ mọi phép so sánh.' },
    grades: { en: 'Grades 10–11', vi: 'Lớp 10–11' },
  },
];

export const labItem = (kind: string) => LAB_ITEMS.find((item) => item.kind === kind) ?? null;
