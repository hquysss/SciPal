import type { CardiacPhase } from './engines/circulation';
import type { Bilingual } from './types';

// Wording follows Biology 11, lesson 10 (Tuần hoàn ở động vật).

export const BODY_PARTS = {
  heart: { vi: 'Tim', en: 'Heart' },
  aorta: { vi: 'Động mạch chủ', en: 'Aorta' },
  superiorVenaCava: { vi: 'Tĩnh mạch chủ trên', en: 'Superior vena cava' },
  inferiorVenaCava: { vi: 'Tĩnh mạch chủ dưới', en: 'Inferior vena cava' },
  rightLung: { vi: 'Mạch phổi phải', en: 'Right lung vessels' },
  leftLung: { vi: 'Mạch phổi trái', en: 'Left lung vessels' },
  kidney: { vi: 'Mạch thận', en: 'Kidney vessels' },
  head: { vi: 'Mạch não', en: 'Brain vessels' },
  hand: { vi: 'Mạch tay', en: 'Arm vessels' },
} as const satisfies Record<string, Bilingual>;
export type BodyPart = keyof typeof BODY_PARTS;

export const BODY_NOTES: Record<BodyPart, Bilingual> = {
  heart: { vi: 'Cái bơm hút và đẩy máu. Mỗi lần tâm thất co, máu được đẩy cùng lúc vào động mạch chủ và động mạch phổi.', en: 'The pump that draws blood in and pushes it out. Each time the ventricles contract, blood goes into the aorta and the pulmonary artery at once.' },
  aorta: { vi: 'Nhận máu giàu O₂ từ tâm thất trái, đưa đi khắp cơ thể (vòng tuần hoàn lớn). Huyết áp ở đây cao nhất.', en: 'Takes oxygen-rich blood from the left ventricle to the whole body (systemic circulation). Blood pressure is highest here.' },
  superiorVenaCava: { vi: 'Đưa máu giàu CO₂ từ đầu, cổ và tay về tâm nhĩ phải.', en: 'Returns carbon dioxide-rich blood from the head, neck and arms to the right atrium.' },
  inferiorVenaCava: { vi: 'Đưa máu giàu CO₂ từ thân và chân về tâm nhĩ phải. Huyết áp ở tĩnh mạch chủ thấp nhất.', en: 'Returns carbon dioxide-rich blood from the trunk and legs to the right atrium. Blood pressure is lowest in the venae cavae.' },
  rightLung: { vi: 'Động mạch phổi đưa máu giàu CO₂ tới mao mạch phổi; trao đổi khí xong, máu giàu O₂ theo tĩnh mạch phổi về tâm nhĩ trái (vòng tuần hoàn nhỏ).', en: 'The pulmonary artery brings carbon dioxide-rich blood to the lung capillaries; after gas exchange, oxygen-rich blood returns through the pulmonary veins to the left atrium (pulmonary circulation).' },
  leftLung: { vi: 'Giống phổi phải: ở mao mạch phổi máu nhả CO₂, nhận O₂ rồi trở về tim.', en: 'As in the right lung: in the lung capillaries blood gives up CO₂, takes up O₂ and returns to the heart.' },
  kidney: { vi: 'Một nhánh của vòng tuần hoàn lớn. Ở mao mạch, máu trao đổi chất với tế bào rồi theo tĩnh mạch về tim.', en: 'A branch of the systemic circulation. In the capillaries blood exchanges substances with the cells, then returns through the veins to the heart.' },
  head: { vi: 'Não nhận máu giàu O₂ qua động mạch cảnh; máu giàu CO₂ về tim qua tĩnh mạch cảnh.', en: 'The brain receives oxygen-rich blood through the carotid arteries; carbon dioxide-rich blood returns through the jugular veins.' },
  hand: { vi: 'Càng xa tim, mạch càng nhỏ và huyết áp càng giảm. Ở mao mạch máu chảy chậm nhất để kịp trao đổi chất.', en: 'Farther from the heart the vessels get smaller and blood pressure falls. Blood flows slowest in the capillaries, which leaves time for exchange.' },
};

export const HEART_PARTS = {
  rightAtrium: { vi: 'Tâm nhĩ phải', en: 'Right atrium' },
  rightVentricle: { vi: 'Tâm thất phải', en: 'Right ventricle' },
  leftAtrium: { vi: 'Tâm nhĩ trái', en: 'Left atrium' },
  leftVentricle: { vi: 'Tâm thất trái', en: 'Left ventricle' },
  tricuspid: { vi: 'Van 3 lá', en: 'Tricuspid valve' },
  mitral: { vi: 'Van 2 lá', en: 'Mitral valve' },
  pulmonaryValve: { vi: 'Van động mạch phổi', en: 'Pulmonary valve' },
  aorticValve: { vi: 'Van động mạch chủ', en: 'Aortic valve' },
  aorta: { vi: 'Động mạch chủ', en: 'Aorta' },
  pulmonaryArtery: { vi: 'Động mạch phổi', en: 'Pulmonary artery' },
  venaCava: { vi: 'Tĩnh mạch chủ', en: 'Venae cavae' },
  pulmonaryVeins: { vi: 'Tĩnh mạch phổi', en: 'Pulmonary veins' },
  sinoatrial: { vi: 'Nút xoang nhĩ', en: 'Sinoatrial node' },
  atrioventricular: { vi: 'Nút nhĩ thất', en: 'Atrioventricular node' },
  his: { vi: 'Bó His', en: 'Bundle of His' },
  purkinje: { vi: 'Mạng Purkinje', en: 'Purkinje fibres' },
} as const satisfies Record<string, Bilingual>;
export type HeartPart = keyof typeof HEART_PARTS;

export const HEART_NOTES: Record<HeartPart, Bilingual> = {
  rightAtrium: { vi: 'Nhận máu giàu CO₂ từ tĩnh mạch chủ trên và dưới.', en: 'Receives carbon dioxide-rich blood from the superior and inferior venae cavae.' },
  rightVentricle: { vi: 'Đẩy máu lên động mạch phổi, bắt đầu vòng tuần hoàn nhỏ.', en: 'Pushes blood into the pulmonary artery, starting the pulmonary circulation.' },
  leftAtrium: { vi: 'Nhận máu giàu O₂ từ các tĩnh mạch phổi.', en: 'Receives oxygen-rich blood from the pulmonary veins.' },
  leftVentricle: { vi: 'Thành dày nhất vì phải đẩy máu vào động mạch chủ đi khắp cơ thể (vòng tuần hoàn lớn).', en: 'Has the thickest wall because it pushes blood into the aorta and round the whole body (systemic circulation).' },
  tricuspid: { vi: 'Giữa tâm nhĩ phải và tâm thất phải. Mở khi tâm thất giãn, đóng khi tâm thất co để máu không chảy ngược lên tâm nhĩ.', en: 'Between the right atrium and right ventricle. Opens while the ventricle relaxes and closes while it contracts, so blood cannot flow back into the atrium.' },
  mitral: { vi: 'Giữa tâm nhĩ trái và tâm thất trái, làm việc giống van 3 lá.', en: 'Between the left atrium and left ventricle; works like the tricuspid valve.' },
  pulmonaryValve: { vi: 'Van bán nguyệt ở lối ra tâm thất phải. Chỉ mở khi tâm thất co.', en: 'A semilunar valve at the exit of the right ventricle. Opens only while the ventricle contracts.' },
  aorticValve: { vi: 'Van bán nguyệt ở lối ra tâm thất trái. Đóng khi tâm thất giãn để máu không chảy ngược về tim.', en: 'A semilunar valve at the exit of the left ventricle. Closes while the ventricle relaxes so blood cannot flow back into the heart.' },
  aorta: { vi: 'Đưa máu giàu O₂ từ tâm thất trái đi nuôi cơ thể.', en: 'Carries oxygen-rich blood from the left ventricle to the body.' },
  pulmonaryArtery: { vi: 'Đưa máu giàu CO₂ từ tâm thất phải lên phổi.', en: 'Carries carbon dioxide-rich blood from the right ventricle to the lungs.' },
  venaCava: { vi: 'Đưa máu giàu CO₂ từ cơ thể về tâm nhĩ phải.', en: 'Bring carbon dioxide-rich blood from the body to the right atrium.' },
  pulmonaryVeins: { vi: 'Đưa máu giàu O₂ từ phổi về tâm nhĩ trái.', en: 'Bring oxygen-rich blood from the lungs to the left atrium.' },
  sinoatrial: { vi: 'Ở thành tâm nhĩ phải, tự phát xung điện theo chu kì: đây là nguồn gốc tính tự động của tim.', en: 'In the wall of the right atrium; fires electrical impulses by itself at regular intervals, which makes the heart automatic.' },
  atrioventricular: { vi: 'Nhận xung từ tâm nhĩ và giữ lại một chút, để tâm nhĩ co xong rồi tâm thất mới co.', en: 'Receives the impulse from the atria and holds it briefly, so the atria finish contracting before the ventricles start.' },
  his: { vi: 'Dẫn xung xuống vách ngăn giữa hai tâm thất.', en: 'Carries the impulse down the wall between the two ventricles.' },
  purkinje: { vi: 'Lan xung khắp cơ tâm thất, làm hai tâm thất co cùng lúc từ mỏm tim lên.', en: 'Spreads the impulse through the ventricle muscle, so both ventricles contract together from the apex upward.' },
};

export const PHASES: Record<CardiacPhase, { readonly title: Bilingual; readonly short: Bilingual; readonly text: Bilingual }> = {
  atrial: {
    title: { vi: 'Pha co tâm nhĩ', en: 'Atrial contraction' },
    short: { vi: 'Co nhĩ', en: 'Atria' },
    text: { vi: 'Nút xoang nhĩ phát xung, hai tâm nhĩ co, đẩy nốt máu xuống tâm thất qua van 3 lá và van 2 lá đang mở. Van động mạch đóng.', en: 'The sinoatrial node fires and both atria contract, pushing the last blood into the ventricles through the open tricuspid and mitral valves. The arterial valves are closed.' },
  },
  ventricular: {
    title: { vi: 'Pha co tâm thất', en: 'Ventricular contraction' },
    short: { vi: 'Co thất', en: 'Ventricles' },
    text: { vi: 'Xung qua nút nhĩ thất, bó His, mạng Purkinje; hai tâm thất co. Van nhĩ thất đóng, van động mạch mở, máu được đẩy vào động mạch chủ và động mạch phổi.', en: 'The impulse passes the atrioventricular node, the bundle of His and the Purkinje fibres; both ventricles contract. The atrioventricular valves close, the arterial valves open and blood is pushed into the aorta and the pulmonary artery.' },
  },
  diastole: {
    title: { vi: 'Pha giãn chung', en: 'Shared relaxation' },
    short: { vi: 'Giãn chung', en: 'Relaxation' },
    text: { vi: 'Tâm nhĩ và tâm thất cùng giãn. Van động mạch đóng; máu từ tĩnh mạch về tâm nhĩ rồi chảy thẳng xuống tâm thất qua van nhĩ thất đang mở. Đây là lúc tim được nghỉ.', en: 'Atria and ventricles both relax. The arterial valves close; blood from the veins fills the atria and runs on into the ventricles through the open atrioventricular valves. This is when the heart rests.' },
  },
};

export const LOOPS = {
  both: {
    label: { vi: 'Cả hai vòng', en: 'Both loops' },
    route: { vi: 'Hệ tuần hoàn kép: máu đi qua tim hai lần trong một vòng đi khắp cơ thể.', en: 'A double circulation: blood passes through the heart twice on each trip round the body.' },
  },
  pulmonary: {
    label: { vi: 'Vòng tuần hoàn nhỏ', en: 'Pulmonary circulation' },
    route: { vi: 'Tâm thất phải → động mạch phổi (máu giàu CO₂) → mao mạch phổi, trao đổi khí → tĩnh mạch phổi (máu giàu O₂) → tâm nhĩ trái.', en: 'Right ventricle → pulmonary artery (CO₂-rich blood) → lung capillaries, gas exchange → pulmonary veins (O₂-rich blood) → left atrium.' },
  },
  systemic: {
    label: { vi: 'Vòng tuần hoàn lớn', en: 'Systemic circulation' },
    route: { vi: 'Tâm thất trái → động mạch chủ (máu giàu O₂) → mao mạch các cơ quan, trao đổi chất → tĩnh mạch chủ (máu giàu CO₂) → tâm nhĩ phải.', en: 'Left ventricle → aorta (O₂-rich blood) → capillaries of the organs, exchange of substances → venae cavae (CO₂-rich blood) → right atrium.' },
  },
} as const satisfies Record<string, { label: Bilingual; route: Bilingual }>;
export type LoopFocus = keyof typeof LOOPS;
