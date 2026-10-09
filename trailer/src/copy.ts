export type Lang = 'vi' | 'en';
export type Orientation = 'wide' | 'tall';

type T = { vi: string; en: string };

export const COPY = {
  hookWords: [
    { vi: 'Vì sao?', en: 'Why?' },
    { vi: 'Như thế nào?', en: 'How?' },
    { vi: 'Nếu… thì sao?', en: 'What if…?' },
  ] as T[],
  hookLine: { vi: 'Mọi điều hay đều bắt đầu từ một câu hỏi.', en: 'Every great idea starts with a question.' },
  tagline: { vi: 'Học bằng sự tò mò', en: 'Learn through curiosity' },
  levels: { vi: 'Từ lớp 1 đến lớp 12', en: 'From grade 1 to grade 12' },
  levelsSub: { vi: 'Bám sát Chương trình GDPT 2018', en: "Built on Vietnam's 2018 national curriculum" },
  bilingual: { vi: 'Một bài học.\nHai ngôn ngữ.', en: 'One lesson.\nTwo languages.' },
  bilingualSub: { vi: 'Đổi Việt ↔ Anh chỉ một chạm', en: 'Switch Vietnamese ↔ English in one tap' },
  steps: { vi: 'Hiểu từng bước', en: 'Understand step by step' },
  stepsSub: { vi: 'Ví dụ, mô phỏng và code trong từng bài', en: 'Examples, simulations and code in every lesson' },
  tutor: { vi: 'Bí bài?\nHỏi Giáo sư SciPal.', en: 'Stuck?\nAsk Professor SciPal.' },
  tutorSub: { vi: 'Gợi ý để em tự tìm ra lời giải', en: 'Hints that help you find the answer yourself' },
  lab: { vi: 'Thí nghiệm ngay trên màn hình', en: 'Experiment right on screen' },
  labSub: { vi: 'Toán · Vật lí · Hoá học · Tin học', en: 'Math · Physics · Chemistry · Computer Science' },
  sim3d: { vi: 'Xoay 360°.\nTự tay khám phá.', en: 'Spin it 360°.\nExplore in 3D.' },
  sim3dSub: { vi: 'Mô phỏng 3D dao động điều hoà · Vật lí 11', en: '3D harmonic motion · Physics, grade 11' },
  pricing: { vi: 'Học miễn phí.\nCần thêm thì nâng cấp.', en: 'Learn for free.\nUpgrade when you need more.' },
  pricingSub: { vi: 'Mọi bài học đều miễn phí', en: 'Every lesson is free' },
  stats: [
    { n: 3, suffix: '', vi: 'cấp học', en: 'school levels' },
    { n: 2, suffix: '', vi: 'ngôn ngữ', en: 'languages' },
    { n: 100, suffix: '%', vi: 'bài học miễn phí', en: 'free lessons' },
  ],
  cta: { vi: 'Bắt đầu miễn phí', en: 'Start for free' },
} as const;

export const pick = (t: T, lang: Lang) => t[lang];
