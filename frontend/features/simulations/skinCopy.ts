import type { ReflexPart, Stimulus } from './engines/skin';
import type { Bilingual } from './types';

// Wording follows Biology 11, lesson 17 (Cảm ứng ở động vật): Bảng 17.1 and Hình 17.11.

export const STIMULUS_COPY: Record<Stimulus, { readonly label: Bilingual; readonly tool: Bilingual; readonly receptor: Bilingual; readonly kind: Bilingual; readonly note: Bilingual }> = {
  touch: {
    label: { vi: 'Chạm nhẹ', en: 'Light touch' },
    tool: { vi: 'Đầu ngón tay chạm nhẹ', en: 'A fingertip touches lightly' },
    receptor: { vi: 'Thụ thể xúc giác (tiểu thể Meissner)', en: 'Touch receptor (Meissner corpuscle)' },
    kind: { vi: 'Thụ thể cơ học', en: 'Mechanoreceptor' },
    note: { vi: 'Nằm sát ngay dưới biểu bì, nhạy với va chạm nhẹ. Xúc giác cho biết vật trơn hay ráp, to hay nhỏ, giúp cầm vật chắc tay và tránh trượt ngã.', en: 'Lies just under the epidermis and responds to light contact. Touch tells smooth from rough and large from small, so we grip things firmly and avoid slipping.' },
  },
  pressure: {
    label: { vi: 'Ấn mạnh', en: 'Firm pressure' },
    tool: { vi: 'Ấn mạnh vào da', en: 'Pressing hard on the skin' },
    receptor: { vi: 'Thụ thể áp lực (tiểu thể Pacini)', en: 'Pressure receptor (Pacinian corpuscle)' },
    kind: { vi: 'Thụ thể cơ học', en: 'Mechanoreceptor' },
    note: { vi: 'Nằm sâu ở lớp bì, gồm nhiều lớp bao quanh đầu mút dây thần kinh như củ hành. Chạm nhẹ không tới được; phải ấn mạnh hoặc rung thì nó mới phát xung.', en: 'Lies deep in the dermis, with many layers wrapped round a nerve ending like an onion. A light touch does not reach it; it fires only with firm pressure or vibration.' },
  },
  pain: {
    label: { vi: 'Gai nhọn', en: 'Sharp thorn' },
    tool: { vi: 'Lỡ tay chạm vào gai nhọn', en: 'A thorn pricks the skin' },
    receptor: { vi: 'Thụ thể đau (đầu mút dây thần kinh tự do)', en: 'Pain receptor (free nerve endings)' },
    kind: { vi: 'Thụ thể đau', en: 'Pain receptor' },
    note: { vi: 'Là các đầu mút trần của dây thần kinh, len vào tận biểu bì. Ngưỡng cao: chỉ kích thích mạnh, có thể làm tổn thương mô, mới gây đau. Cảm giác đau báo cho cơ thể tránh xa tác nhân gây hại.', en: 'Bare nerve endings that reach into the epidermis. Their threshold is high: only a strong stimulus, one that may damage tissue, causes pain. Pain warns the body away from harm.' },
  },
  cold: {
    label: { vi: 'Đá lạnh', en: 'Ice' },
    tool: { vi: 'Áp viên đá lạnh lên da', en: 'Ice on the skin' },
    receptor: { vi: 'Thụ thể lạnh', en: 'Cold receptor' },
    kind: { vi: 'Thụ thể nhiệt', en: 'Thermoreceptor' },
    note: { vi: 'Phát xung khi da bị lạnh đi. Thụ thể nhiệt gửi thông tin về trung khu điều hoà thân nhiệt ở vùng dưới đồi, cơ thể đáp ứng như co mạch da, nổi da gà, run.', en: 'Fires when the skin cools. Thermoreceptors report to the temperature centre in the hypothalamus, and the body answers by narrowing skin vessels, raising goose bumps or shivering.' },
  },
  heat: {
    label: { vi: 'Vật nóng', en: 'Something hot' },
    tool: { vi: 'Chạm vào vật nóng', en: 'Touching something hot' },
    receptor: { vi: 'Thụ thể nóng', en: 'Warmth receptor' },
    kind: { vi: 'Thụ thể nhiệt', en: 'Thermoreceptor' },
    note: { vi: 'Phát xung khi da ấm lên. Nóng quá mức thì thụ thể đau cũng phát xung, nên ta thấy bỏng rát và rụt tay lại.', en: 'Fires when the skin warms. Above a certain heat the pain receptors fire too, so it burns and we pull the hand away.' },
  },
};

export const SKIN_PARTS = {
  epidermis: { title: { vi: 'Biểu bì', en: 'Epidermis' }, note: { vi: 'Lớp ngoài cùng gồm nhiều lớp tế bào; lớp trên cùng là tế bào chết hoá sừng, bong dần ra. Không có mạch máu.', en: 'The outer layer of many cell layers; the top cells are dead and horny and flake off. It has no blood vessels.' } },
  dermis: { title: { vi: 'Lớp bì', en: 'Dermis' }, note: { vi: 'Mô liên kết chứa sợi đàn hồi, mạch máu, dây thần kinh, phần lớn các thụ thể, tuyến mồ hôi, tuyến nhờn và chân lông.', en: 'Connective tissue with elastic fibres, blood vessels, nerves, most of the receptors, sweat and oil glands and hair roots.' } },
  fat: { title: { vi: 'Lớp mỡ dưới da', en: 'Fat under the skin' }, note: { vi: 'Tế bào mỡ dự trữ năng lượng, giữ nhiệt và đệm chống va đập.', en: 'Fat cells store energy, keep heat in and cushion knocks.' } },
  hair: { title: { vi: 'Lông và nang lông', en: 'Hair and follicle' }, note: { vi: 'Lông mọc từ nang lông nằm sâu trong lớp bì. Cơ dựng lông co làm lông dựng lên (nổi da gà) khi lạnh.', en: 'Hair grows from a follicle deep in the dermis. The small muscle beside it pulls the hair upright (goose bumps) in the cold.' } },
  sweat: { title: { vi: 'Tuyến mồ hôi', en: 'Sweat gland' }, note: { vi: 'Ống cuộn ở sâu trong lớp bì, đổ mồ hôi ra lỗ chân lông; mồ hôi bay hơi làm mát cơ thể.', en: 'A coiled tube deep in the dermis that empties at a pore; sweat evaporating cools the body.' } },
  oil: { title: { vi: 'Tuyến nhờn', en: 'Oil gland' }, note: { vi: 'Tiết chất nhờn vào nang lông, làm mềm da và lông.', en: 'Releases oil into the hair follicle, keeping skin and hair supple.' } },
  vessels: { title: { vi: 'Mạch máu', en: 'Blood vessels' }, note: { vi: 'Nuôi da và giúp điều hoà thân nhiệt: giãn ra khi nóng, co lại khi lạnh.', en: 'Feed the skin and help control body temperature: they widen in the heat and narrow in the cold.' } },
  nerve: { title: { vi: 'Dây thần kinh cảm giác', en: 'Sensory nerve' }, note: { vi: 'Bó sợi trục của các neuron cảm giác, dẫn xung từ thụ thể về tuỷ sống (đường dẫn truyền hướng tâm).', en: 'Bundles of axons of sensory neurons, carrying impulses from the receptors to the spinal cord (the afferent pathway).' } },
} as const satisfies Record<string, { title: Bilingual; note: Bilingual }>;
export type SkinPart = keyof typeof SKIN_PARTS;

export const REFLEX_COPY: Record<ReflexPart, { readonly title: Bilingual; readonly role: Bilingual; readonly here: Bilingual }> = {
  receptor: { title: { vi: 'Thụ thể cảm giác', en: 'Sensory receptor' }, role: { vi: 'Bộ phận tiếp nhận kích thích', en: 'Receives the stimulus' }, here: { vi: 'Thụ thể ở da ngón tay', en: 'Receptors in the fingertip' } },
  afferent: { title: { vi: 'Đường dẫn truyền hướng tâm', en: 'Afferent pathway' }, role: { vi: 'Dây thần kinh cảm giác (neuron cảm giác)', en: 'Sensory nerve (sensory neurons)' }, here: { vi: 'Dẫn xung từ da về tuỷ sống', en: 'Carries the impulse from the skin to the spinal cord' } },
  centre: { title: { vi: 'Bộ phận trung ương', en: 'Centre' }, role: { vi: 'Tuỷ sống và não bộ (neuron trung gian)', en: 'Spinal cord and brain (interneurons)' }, here: { vi: 'Neuron trung gian trong tuỷ sống', en: 'An interneuron in the spinal cord' } },
  efferent: { title: { vi: 'Đường dẫn truyền li tâm', en: 'Efferent pathway' }, role: { vi: 'Dây thần kinh vận động (neuron vận động)', en: 'Motor nerve (motor neurons)' }, here: { vi: 'Dẫn xung từ tuỷ sống ra cơ tay', en: 'Carries the impulse from the cord to the arm muscle' } },
  effector: { title: { vi: 'Bộ phận đáp ứng', en: 'Effector' }, role: { vi: 'Cơ hay tuyến', en: 'A muscle or gland' }, here: { vi: 'Cơ tay co, tay rụt lại', en: 'The arm muscle contracts and the hand pulls back' } },
};

export const REFLEX_STIMULI = ['pain', 'heat'] as const;
export type ReflexStimulus = (typeof REFLEX_STIMULI)[number];
export const REFLEX_FEELING: Record<ReflexStimulus, Bilingual> = { pain: { vi: 'đau', en: 'pain' }, heat: { vi: 'nóng rát', en: 'burning heat' } };
