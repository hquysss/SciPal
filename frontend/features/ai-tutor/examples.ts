import type { EducationLevel } from '@/features/landing/educationLevel';

type Bilingual = { vi: string; en: string };

/** Questions a student of each level might start with; one click sends one. */
export const EXAMPLE_QUESTIONS: Record<EducationLevel, Bilingual[]> = {
  primary: [
    { vi: 'Máy tính gồm những bộ phận nào ạ?', en: 'What parts does a computer have?' },
    { vi: 'Vì sao phải đặt mật khẩu cho tài khoản?', en: 'Why should an account have a password?' },
    { vi: 'Làm sao để gõ nhanh hơn bằng mười ngón?', en: 'How can I type faster with ten fingers?' },
    { vi: 'Thư mục và tệp khác nhau thế nào ạ?', en: 'What is the difference between a folder and a file?' },
  ],
  lower_secondary: [
    { vi: 'Thuật toán là gì? Cho em một ví dụ đời thường.', en: 'What is an algorithm? Give me an everyday example.' },
    { vi: 'Em chưa hiểu cấu trúc rẽ nhánh if…else.', en: 'I do not understand if…else yet.' },
    { vi: 'Làm sao biết một thông tin trên mạng là đáng tin?', en: 'How do I know information online is reliable?' },
    { vi: 'Bảng tính tính trung bình cộng thế nào ạ?', en: 'How does a spreadsheet work out an average?' },
  ],
  upper_secondary: [
    { vi: 'Vì sao vòng lặp while của em chạy mãi không dừng?', en: 'Why does my while loop never stop?' },
    { vi: 'Giải thích độ phức tạp O(n log n) bằng ví dụ.', en: 'Explain O(n log n) with an example.' },
    { vi: 'Em nên bắt đầu bài tìm kiếm nhị phân thế nào?', en: 'How should I start a binary search exercise?' },
    { vi: 'Kiểm tra giúp em ý tưởng sắp xếp nổi bọt.', en: 'Check my idea for bubble sort.' },
  ],
};

/** Questions about the lesson on screen, so the Professor's suggestions follow what the student is reading. */
export function lessonQuestions(title: Bilingual): Bilingual[] {
  const vi = `«${title.vi}»`;
  const en = `“${title.en || title.vi}”`;
  return [
    { vi: `Giải thích ${vi} bằng một ví dụ đơn giản.`, en: `Explain ${en} with a simple example.` },
    { vi: `Em hay nhầm điều gì khi học ${vi}?`, en: `What do students often get wrong in ${en}?` },
    { vi: `Cho em một bài tập nhỏ về ${vi} để luyện.`, en: `Give me a small exercise on ${en}.` },
    { vi: `Tóm tắt các ý chính của ${vi} giúp em.`, en: `Summarise the key ideas of ${en}.` },
  ];
}

/** On the landing page the Professor is asked about getting started, not about one lesson. */
export const LANDING_QUESTIONS: Record<EducationLevel, Bilingual[]> = {
  primary: [
    { vi: 'Em mới học, nên bắt đầu từ bài nào ạ?', en: 'I am new here. Which lesson should I start with?' },
    { vi: 'SciPal có gì để em học và chơi?', en: 'What can I learn and play on SciPal?' },
  ],
  lower_secondary: [
    { vi: 'Em nên bắt đầu học trên SciPal từ đâu?', en: 'Where should I start learning on SciPal?' },
    { vi: 'SciPal giúp em ôn bài trên lớp thế nào?', en: 'How does SciPal help me revise class lessons?' },
  ],
  upper_secondary: [
    { vi: 'SciPal giúp em ôn thi tốt nghiệp THPT thế nào?', en: 'How does SciPal help me prepare for the national exam?' },
    { vi: 'Em muốn học Tin học 10, nên bắt đầu từ bài nào?', en: 'I want to study Informatics 10. Where do I start?' },
  ],
};
