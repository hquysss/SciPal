import type { Bilingual } from './types';
import type { ReflexPhase } from './engines/kneeReflex';

export const REFLEX_COPY: Record<ReflexPhase, { readonly title: Bilingual; readonly text: Bilingual }> = {
  0: { title: { vi: 'Sẵn sàng', en: 'Ready' }, text: { vi: 'Gõ nhẹ gân bánh chè để quan sát phản xạ. Chọn từng bước để xem chậm hơn.', en: 'Tap the patellar tendon to observe the reflex. Select a step to examine the sequence.' } },
  1: { title: { vi: 'Kích thích', en: 'Stimulus' }, text: { vi: 'Búa gõ gân bánh chè làm cơ tứ đầu đùi giãn nhanh, kích thích thụ thể thoi cơ.', en: 'The tendon tap briefly stretches the quadriceps, activating its muscle spindles.' } },
  2: { title: { vi: 'Đường cảm giác', en: 'Sensory input' }, text: { vi: 'Xung thần kinh từ thoi cơ theo sợi cảm giác đi về tủy sống.', en: 'An impulse travels from the muscle spindle along a sensory fibre to the spinal cord.' } },
  3: { title: { vi: 'Xử lí tại tủy', en: 'Spinal integration' }, text: { vi: 'Nơron cảm giác kích thích trực tiếp nơron vận động cơ tứ đầu đùi. Nhánh qua nơron trung gian ức chế nơron vận động cơ đối kháng.', en: 'The sensory neuron directly excites the quadriceps motor neuron. A branch through an inhibitory interneuron inhibits the antagonist motor neuron.' } },
  4: { title: { vi: 'Đường vận động', en: 'Motor output' }, text: { vi: 'Xung vận động đi đến cơ tứ đầu đùi. Cơ đối kháng được ức chế để không cản trở động tác duỗi.', en: 'Motor impulses reach the quadriceps. The opposing hamstrings are inhibited so they do not resist extension.' } },
  5: { title: { vi: 'Đáp ứng', en: 'Response' }, text: { vi: 'Cơ tứ đầu đùi co, cẳng chân duỗi ra rồi trở về. Tủy sống tổ chức phản xạ; thông tin cũng được truyền lên não.', en: 'The quadriceps contracts and the lower leg extends, then returns. The reflex is organised in the spinal cord; information also travels to the brain.' } },
};

export const REFLEX_LABELS = {
  brain: { vi: 'Não', en: 'Brain' },
  cord: { vi: 'Tủy sống', en: 'Spinal cord' },
  spindle: { vi: 'Thoi cơ', en: 'Muscle spindle' },
  quadriceps: { vi: 'Cơ tứ đầu đùi', en: 'Quadriceps' },
  hamstrings: { vi: 'Cơ đối kháng', en: 'Hamstrings' },
  tendon: { vi: 'Gân bánh chè', en: 'Patellar tendon' },
  sensory: { vi: 'Sợi cảm giác', en: 'Sensory fibre' },
  motor: { vi: 'Sợi vận động', en: 'Motor fibre' },
  inhibitory: { vi: 'Nơron ức chế', en: 'Inhibitory interneuron' },
} as const;
export type ReflexLabel = keyof typeof REFLEX_LABELS;

export const REFLEX_NOTES: Record<ReflexLabel, Bilingual> = {
  brain: { vi: 'Não nhận thông tin về kích thích và vận động. Cung phản xạ này được tổ chức tại tủy sống.', en: 'The brain receives information about the stimulus and movement. This reflex circuit is organised in the spinal cord.' },
  cord: { vi: 'Tủy sống nhận tín hiệu cảm giác và phát tín hiệu vận động. Hình cắt ngang thể hiện chất xám ở giữa và chất trắng bao quanh.', en: 'The spinal cord receives sensory input and generates motor output. The cross-section shows central gray matter surrounded by white matter.' },
  spindle: { vi: 'Thoi cơ là thụ thể nằm trong cơ, cảm nhận sự thay đổi chiều dài cơ khi gân bị gõ.', en: 'The muscle spindle is a receptor within the muscle that detects the change in muscle length after a tendon tap.' },
  quadriceps: { vi: 'Cơ tứ đầu đùi ở phía trước đùi. Khi co, cơ kéo qua gân bánh chè và làm duỗi khớp gối.', en: 'The quadriceps lies at the front of the thigh. Its contraction pulls through the patellar tendon and extends the knee.' },
  hamstrings: { vi: 'Nhóm cơ sau đùi có tác dụng gấp gối. Trong phản xạ này, đường vận động của nhóm cơ đối kháng được ức chế.', en: 'The hamstrings flex the knee. Their motor pathway is inhibited during this reflex.' },
  tendon: { vi: 'Gõ gân ngay dưới xương bánh chè làm cơ tứ đầu đùi giãn nhanh, kích thích thoi cơ.', en: 'A tap just below the kneecap briefly stretches the quadriceps and activates its muscle spindles.' },
  sensory: { vi: 'Sợi cảm giác dẫn xung từ thoi cơ về tủy sống. Chấm sáng biểu diễn hướng dẫn truyền.', en: 'The sensory fibre carries impulses from the muscle spindle to the spinal cord. The bright dot shows the direction of transmission.' },
  motor: { vi: 'Sợi vận động dẫn xung từ tủy sống đến cơ tứ đầu đùi, làm cơ co.', en: 'The motor fibre carries impulses from the spinal cord to the quadriceps, causing contraction.' },
  inhibitory: { vi: 'Nơron trung gian ức chế làm giảm hoạt động nơron vận động của cơ đối kháng. Nhánh này có thêm một nơron trung gian.', en: 'The inhibitory interneuron reduces activity in the antagonist motor neuron. This branch includes an additional interneuron.' },
};
