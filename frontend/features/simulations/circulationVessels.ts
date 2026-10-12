import type { VesselKey } from './engines/vessels';
import type { Bilingual } from './types';

export const VESSEL_NAMES = {
  aorta: { vi: 'Động mạch chủ', en: 'Aorta' },
  artery: { vi: 'Động mạch', en: 'Arteries' },
  arteriole: { vi: 'Tiểu động mạch', en: 'Arterioles' },
  capillary: { vi: 'Mao mạch', en: 'Capillaries' },
  venule: { vi: 'Tiểu tĩnh mạch', en: 'Venules' },
  vein: { vi: 'Tĩnh mạch', en: 'Veins' },
  venaCava: { vi: 'Tĩnh mạch chủ', en: 'Venae cavae' },
} as const satisfies Record<VesselKey, Bilingual>;

export const VESSEL_NOTES: Record<VesselKey, Bilingual> = {
  aorta: { vi: 'Nhận máu trực tiếp từ tâm thất trái nên huyết áp cao nhất và dao động nhiều nhất giữa lúc tim co và giãn. Tổng tiết diện nhỏ nên máu chảy nhanh nhất.', en: 'Takes blood straight from the left ventricle, so its pressure is highest and swings most between contraction and relaxation. The total cross-section is small, so blood moves fastest here.' },
  artery: { vi: 'Thành dày, nhiều sợi đàn hồi nên giãn ra khi tim co và co lại khi tim giãn, giúp máu chảy liên tục. Càng xa tim, huyết áp càng giảm.', en: 'Thick walls with plenty of elastic fibres: they stretch when the heart contracts and recoil when it relaxes, so blood keeps flowing. The farther from the heart, the lower the pressure.' },
  arteriole: { vi: 'Có cơ trơn nên co hoặc giãn để chia máu tới từng cơ quan. Sức cản lớn nên huyết áp giảm mạnh nhất ở đây và sự dao động theo nhịp tim mờ dần.', en: 'Smooth muscle lets them narrow or widen to share blood among organs. Their resistance is high, so pressure drops most here and the beat-to-beat swing fades.' },
  capillary: { vi: 'Tổng tiết diện lớn nhất nên vận tốc máu nhỏ nhất, gần như bằng 0. Thành chỉ là một lớp tế bào biểu mô, máu chảy chậm để kịp trao đổi chất với tế bào.', en: 'The total cross-section is largest, so the blood is slowest, almost still. The wall is a single layer of flat cells, and slow flow leaves time to exchange substances with the cells.' },
  venule: { vi: 'Gom máu từ mao mạch. Huyết áp đã thấp; tổng tiết diện thu hẹp dần nên vận tốc máu bắt đầu tăng trở lại.', en: 'Collect blood from the capillaries. Pressure is already low; the total cross-section narrows again, so the blood speeds up.' },
  vein: { vi: 'Huyết áp thấp. Tĩnh mạch ở chân có van một chiều và được cơ bắp ép, giúp máu về tim mà không chảy ngược.', en: 'Pressure is low. Veins in the legs have one-way valves and are squeezed by muscles, so blood returns to the heart without flowing back.' },
  venaCava: { vi: 'Đưa máu về tâm nhĩ phải. Huyết áp thấp nhất, tổng tiết diện nhỏ nên vận tốc máu lại khá lớn.', en: 'Bring blood to the right atrium. Pressure is lowest, and the small cross-section makes the blood fairly fast again.' },
};
