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
