import { normalize } from '@/features/glossary/termFilter';

type Copy = { readonly en: string; readonly vi: string };
export const HELP_CATEGORIES = [
  { id: 'all', label: { en: 'All topics', vi: 'Tất cả chủ đề' } },
  { id: 'start', label: { en: 'Getting started', vi: 'Bắt đầu sử dụng' } },
  { id: 'learn', label: { en: 'Learning tools', vi: 'Công cụ học tập' } },
  { id: 'account', label: { en: 'Your account', vi: 'Tài khoản của bạn' } },
  { id: 'teach', label: { en: 'For teachers', vi: 'Dành cho giáo viên' } },
] as const;
export type HelpCategory = (typeof HELP_CATEGORIES)[number]['id'];
export type HelpGuide = {
  readonly id: string;
  readonly category: Exclude<HelpCategory, 'all'>;
  readonly title: Copy;
  readonly description: Copy;
  readonly steps: readonly Copy[];
  readonly note?: Copy;
  readonly href: string;
  readonly action: Copy;
};
export const HELP_GUIDES = [
  {
    id: 'start', category: 'start',
    title: { en: 'Find your first lesson', vi: 'Tìm bài học đầu tiên' },
    description: { en: 'Choose your level, grade and subject.', vi: 'Chọn đúng cấp học, khối lớp và môn bạn muốn học.' },
    steps: [
      { en: 'On Home, choose Primary, Lower secondary or Upper secondary.', vi: 'Ở Trang chủ, chọn Tiểu học, THCS hoặc THPT.' },
      { en: 'Open Subjects, choose your grade, then a subject with published lessons.', vi: 'Mở Môn học, chọn khối lớp rồi chọn môn đã có bài học.' },
      { en: 'Choose a topic and open a lesson. Start with its learning objectives.', vi: 'Chọn chủ đề rồi mở bài học. Bắt đầu từ mục tiêu của bài.' },
    ],
    note: { en: '“In preparation” means learning materials are not published yet.', vi: '“Đang biên soạn” nghĩa là học liệu chưa được xuất bản.' },
    href: '/subjects', action: { en: 'Explore subjects', vi: 'Xem môn học' },
  },
  {
    id: 'account', category: 'start',
    title: { en: 'Create an account or sign in', vi: 'Tạo tài khoản và đăng nhập' },
    description: { en: 'Keep your learning progress with your account.', vi: 'Dùng tài khoản để lưu tiến trình học của bạn.' },
    steps: [
      { en: 'Choose Sign In on the navigation bar. Switch to Create account if you are new.', vi: 'Chọn Đăng nhập trên thanh điều hướng. Nếu chưa có tài khoản, chuyển sang Tạo tài khoản.' },
      { en: 'Enter your name, email and password. Confirm your email if SciPal asks you to.', vi: 'Nhập họ tên, email và mật khẩu. Xác nhận email nếu SciPal yêu cầu.' },
      { en: 'You can also continue with Google or Facebook when those buttons are available.', vi: 'Bạn cũng có thể tiếp tục với Google hoặc Facebook khi các nút này xuất hiện.' },
    ],
    note: { en: 'Browsing as a guest does not save progress to an account.', vi: 'Xem bài bằng lượt dùng thử của khách không lưu tiến trình vào tài khoản.' },
    href: '/login', action: { en: 'Open sign in', vi: 'Mở trang đăng nhập' },
  },
  {
    id: 'lesson', category: 'learn',
    title: { en: 'Learn, simulate and practise', vi: 'Học bài, xem mô phỏng, tự luyện' },
    description: { en: 'Move through the parts available in each lesson.', vi: 'Học lần lượt các phần có trong mỗi bài.' },
    steps: [
      { en: 'Read the Lesson part: explanations, examples, formulas or code.', vi: 'Đọc phần Bài học: kiến thức, ví dụ, công thức hoặc mã nguồn.' },
      { en: 'Open Simulations when available and use the controls to explore what changes.', vi: 'Mở Mô phỏng nếu bài có phần này, rồi dùng các nút điều khiển để quan sát sự thay đổi.' },
      { en: 'Answer the Practice questions and check your answers. At the end, choose Mark as complete.', vi: 'Trả lời câu Tự luyện và kiểm tra câu trả lời. Cuối bài, chọn Đánh dấu hoàn thành.' },
    ],
    note: { en: 'Sign in and wait for a successful save before checking Progress. Completing the same lesson again does not earn XP again.', vi: 'Đăng nhập và chờ lưu thành công rồi xem Tiến trình. Hoàn thành lại cùng một bài không cộng XP lần nữa.' },
    href: '/subjects', action: { en: 'Choose a lesson', vi: 'Chọn bài để học' },
  },
  {
    id: 'professor', category: 'learn',
    title: { en: 'Ask the SciPal Professor', vi: 'Hỏi Giáo sư SciPal' },
    description: { en: 'Get hints when you are stuck on a learning question.', vi: 'Nhận gợi ý khi bạn chưa hiểu một câu hỏi học tập.' },
    steps: [
      { en: 'Open SciPal Professor, or the Professor panel inside a lesson.', vi: 'Mở Giáo sư SciPal, hoặc bảng Giáo sư ngay trong bài học.' },
      { en: 'State the question and what you have tried. Add the relevant lesson context when available.', vi: 'Nêu câu hỏi và phần bạn đã thử làm. Chọn bài học liên quan nếu có.' },
      { en: 'Follow the hints one step at a time. Ask again about the step you do not understand.', vi: 'Làm theo gợi ý từng bước. Hỏi tiếp về bước bạn chưa hiểu.' },
    ],
    note: { en: 'An internet connection is required. Your available questions depend on your plan; check important answers against the lesson.', vi: 'Cần kết nối mạng. Số lượt hỏi phụ thuộc gói của bạn; đối chiếu câu trả lời quan trọng với bài học.' },
    href: '/tutor', action: { en: 'Ask the Professor', vi: 'Mở Giáo sư SciPal' },
  },
  {
    id: 'glossary', category: 'learn',
    title: { en: 'Look up bilingual terms', vi: 'Tra thuật ngữ song ngữ' },
    description: { en: 'Find meanings, examples and pronunciation.', vi: 'Xem nghĩa, ví dụ và nghe cách phát âm.' },
    steps: [
      { en: 'Open Glossary and search in English or Vietnamese. Vietnamese without accents works too.', vi: 'Mở Từ điển và tìm bằng tiếng Anh hoặc tiếng Việt. Bạn có thể gõ tiếng Việt không dấu.' },
      { en: 'Filter by subject. Read the definition and example, or press the speaker button to listen.', vi: 'Lọc theo môn. Đọc định nghĩa và ví dụ, hoặc bấm nút loa để nghe.' },
      { en: 'Use the bookmark to save a term and the link button to share it. Find bookmarks under Saved.', vi: 'Bấm dấu lưu để lưu thuật ngữ, nút liên kết để chia sẻ. Xem lại trong mục Đã lưu.' },
    ],
    note: { en: 'Saved terms stay in this browser. Pronunciation depends on the voices supported by your device.', vi: 'Thuật ngữ đã lưu nằm trong trình duyệt này. Phát âm phụ thuộc giọng đọc thiết bị hỗ trợ.' },
    href: '/glossary', action: { en: 'Open glossary', vi: 'Mở từ điển' },
  },
  {
    id: 'exams', category: 'learn',
    title: { en: 'Take a timed practice exam', vi: 'Làm một đề thi thử' },
    description: { en: 'Exams are separate from lesson practice.', vi: 'Thi thử là mục riêng, tách khỏi câu tự luyện trong bài học.' },
    steps: [
      { en: 'Open Exams and select an available exam. Sign in to enter the exam room.', vi: 'Mở Thi thử và chọn đề đang có. Đăng nhập để vào phòng thi.' },
      { en: 'Read the duration, answer the questions and use the question palette to revisit unanswered ones.', vi: 'Xem thời lượng, trả lời câu hỏi và dùng bảng câu hỏi để quay lại câu chưa làm.' },
      { en: 'Choose Submit when ready. The exam attempts to submit automatically when time runs out; wait for the result.', vi: 'Chọn Nộp bài khi làm xong. Hết giờ, hệ thống tự gửi bài; chờ kết quả chấm điểm.' },
    ],
    note: { en: 'Keep this tab open and your connection stable. If submission fails, keep your answers on screen and retry.', vi: 'Giữ tab đang làm bài và kết nối ổn định. Nếu nộp thất bại, giữ nguyên câu trả lời trên màn hình rồi thử lại.' },
    href: '/exam', action: { en: 'View exams', vi: 'Xem đề thi' },
  },
  {
    id: 'profile', category: 'account',
    title: { en: 'Manage progress and preferences', vi: 'Xem tiến trình và cài đặt' },
    description: { en: 'Your learning record and settings in one account.', vi: 'Theo dõi việc học và điều chỉnh trải nghiệm của bạn.' },
    steps: [
      { en: 'Open Progress after signing in to see completed lessons, XP and your learning streak.', vi: 'Đăng nhập rồi mở Tiến trình để xem bài đã hoàn thành, XP và chuỗi ngày học.' },
      { en: 'Open Profile to change your education level, language or light/dark appearance.', vi: 'Mở Hồ sơ để đổi cấp học, ngôn ngữ hoặc chế độ sáng/tối.' },
      { en: 'Students can check their subscription and usage under My plan. Check current prices on Pricing.', vi: 'Học sinh xem gói và mức sử dụng ở Gói của tôi. Xem giá hiện tại ở Bảng giá.' },
    ],
    href: '/profile', action: { en: 'Open profile', vi: 'Mở hồ sơ' },
  },
  {
    id: 'classes', category: 'account',
    title: { en: 'Join your teacher’s class', vi: 'Vào lớp của thầy cô' },
    description: { en: 'Find assigned lessons and exams.', vi: 'Xem bài học và đề thi thầy cô đã giao.' },
    steps: [
      { en: 'Sign in with your student account and open My classes.', vi: 'Đăng nhập tài khoản học sinh rồi mở Lớp của em.' },
      { en: 'Choose Join with a code and enter the class code your teacher gives you.', vi: 'Chọn Vào lớp bằng mã và nhập mã thầy cô cung cấp.' },
      { en: 'Open assigned work, check its due date, then complete the lesson or submit the exam.', vi: 'Mở bài được giao, xem hạn làm rồi hoàn thành bài học hoặc nộp đề thi.' },
    ],
    href: '/classes', action: { en: 'Open my classes', vi: 'Mở lớp của em' },
  },
  {
    id: 'teachers', category: 'teach',
    title: { en: 'Teach with SciPal', vi: 'Dạy học cùng SciPal' },
    description: { en: 'Prepare materials and manage your classes.', vi: 'Soạn học liệu và quản lý lớp của bạn.' },
    steps: [
      { en: 'Request teacher access in Profile if needed. Wait for an administrator to approve your request.', vi: 'Gửi yêu cầu làm giáo viên trong Hồ sơ nếu cần. Chờ quản trị viên duyệt yêu cầu.' },
      { en: 'With teacher access, choose Write lessons on Subjects, Manage exams on Exams, or Add terms on Glossary.', vi: 'Khi có quyền giáo viên, chọn Soạn bài ở Môn học, Quản lý đề thi ở Thi thử, hoặc Thêm thuật ngữ ở Từ điển.' },
      { en: 'Open Teacher → Classes to create a class, share its code and assign available lessons or exams. Submit materials for review before publication.', vi: 'Mở Giáo viên → Lớp học để tạo lớp, chia sẻ mã và giao bài học hoặc đề thi đang có. Gửi học liệu để duyệt trước khi xuất bản.' },
    ],
    note: { en: 'Teacher tools appear only for authorized accounts.', vi: 'Công cụ giáo viên chỉ hiện với tài khoản có quyền tương ứng.' },
    href: '/profile', action: { en: 'Check teacher access', vi: 'Xem quyền giáo viên' },
  },
] as const satisfies readonly HelpGuide[];

export type HelpFaq = { readonly id: string; readonly category: Exclude<HelpCategory, 'all'>; readonly question: Copy; readonly answer: Copy };
export const HELP_FAQS = [
  { id: 'guest', category: 'start', question: { en: 'Can I try SciPal without an account?', vi: 'Chưa có tài khoản thì dùng SciPal được không?' }, answer: { en: 'Help, Home and Pricing are open. When guest trials are enabled, Subjects, Glossary and Exams have a 30-minute trial window, and the Professor offers one trial question. Sign in to save progress or enter an exam room.', vi: 'Hướng dẫn, Trang chủ và Bảng giá mở cho mọi người. Khi bật dùng thử, khách có 30 phút trải nghiệm Môn học, Từ điển và Thi thử; Giáo sư cho hỏi thử một câu. Đăng nhập để lưu tiến trình hoặc vào phòng thi.' } },
  { id: 'language', category: 'start', question: { en: 'How do I switch between English and Vietnamese?', vi: 'Đổi tiếng Anh và tiếng Việt ở đâu?' }, answer: { en: 'Use the EN/VI flag buttons on the navigation bar. You can also change the language in Profile. This Help page follows the same setting.', vi: 'Dùng nút cờ EN/VI trên thanh điều hướng. Bạn cũng có thể đổi ngôn ngữ trong Hồ sơ. Trang Hướng dẫn dùng cùng lựa chọn này.' } },
  { id: 'unpublished', category: 'learn', question: { en: 'Why is a subject marked “In preparation”?', vi: 'Vì sao môn học ghi “Đang biên soạn”?' }, answer: { en: 'The subject is in the curriculum catalog but has no published learning materials yet. Choose a subject with available lessons and check your selected grade.', vi: 'Môn đã có trong danh mục chương trình nhưng chưa có học liệu xuất bản. Chọn môn đã có bài và kiểm tra lại khối lớp đang chọn.' } },
  { id: 'save', category: 'account', question: { en: 'What if my progress was not saved?', vi: 'Làm gì khi chưa lưu được tiến trình?' }, answer: { en: 'Check that you are signed in and connected. Keep the lesson open and retry Mark as complete. Open Progress after SciPal confirms the save.', vi: 'Kiểm tra bạn đã đăng nhập và có mạng. Giữ bài đang mở rồi thử Đánh dấu hoàn thành lần nữa. Mở Tiến trình sau khi SciPal báo lưu thành công.' } },
  { id: 'limits', category: 'account', question: { en: 'What happens when I run out of questions or attempts?', vi: 'Hết lượt hỏi hoặc lượt thi thì làm gì?' }, answer: { en: 'Read the limit notice to see whether it resets daily or monthly. Students can check My plan in their account menu; Pricing lists the current plans. Limits depend on the active plan.', vi: 'Đọc thông báo để biết lượt được tính theo ngày hay tháng. Học sinh xem Gói của tôi trong menu tài khoản; Bảng giá có thông tin gói hiện tại. Giới hạn phụ thuộc gói đang dùng.' } },
  { id: 'teacher-tools', category: 'teach', question: { en: 'Why can’t I see teacher tools?', vi: 'Vì sao tôi chưa thấy công cụ giáo viên?' }, answer: { en: 'A new account starts as a student. Send a teacher request from Profile and wait for approval. If approved, refresh your session or sign in again. An interface setting alone does not grant teacher access.', vi: 'Tài khoản mới có quyền học sinh. Gửi yêu cầu làm giáo viên ở Hồ sơ và chờ duyệt. Khi đã được duyệt, làm mới phiên hoặc đăng nhập lại. Đổi giao diện không tự cấp quyền giáo viên.' } },
] as const satisfies readonly HelpFaq[];

function matchesQuery(fields: readonly Copy[], query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const text = normalize(fields.flatMap(({ en, vi }) => [en, vi]).join(' '));
  return words.every((word) => text.includes(word));
}
export function searchHelp(query: string, category: HelpCategory) {
  return {
    guides: HELP_GUIDES.filter((guide) => (category === 'all' || guide.category === category) && matchesQuery([guide.title, guide.description, ...guide.steps, ...('note' in guide ? [guide.note] : [])], query)),
    faqs: HELP_FAQS.filter((faq) => (category === 'all' || faq.category === category) && matchesQuery([faq.question, faq.answer], query)),
  };
}
