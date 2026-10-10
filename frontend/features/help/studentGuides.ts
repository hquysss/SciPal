import type { HelpGuide } from './guideTypes';

export const STUDENT_GUIDES = [
  {
    id: 'start', audience: 'student', category: 'start',
    title: { en: 'Find your first lesson', vi: 'Tìm bài học đầu tiên' },
    description: { en: 'Choose the school level, grade and subject that fit you.', vi: 'Chọn cấp học, khối lớp và môn phù hợp với bạn.' },
    visualSteps: [
      { en: 'Level', vi: 'Cấp' }, { en: 'Subject', vi: 'Môn' }, { en: 'Lesson', vi: 'Bài' },
    ],
    steps: [
      { en: 'On Home, choose Primary, Lower secondary or Upper secondary, then open Subjects.', vi: 'Ở Trang chủ, chọn Tiểu học, THCS hoặc THPT rồi mở Môn học.' },
      { en: 'Choose your grade and a subject with published lessons, then open a topic.', vi: 'Chọn khối lớp, môn đã có bài xuất bản rồi mở một chủ đề.' },
      { en: 'Open a lesson and start with its objectives. Follow the parts shown in that lesson.', vi: 'Mở bài học, xem mục tiêu trước rồi học theo các phần có trong bài.' },
    ],
    note: { en: '“In preparation” means the subject has no published learning materials yet.', vi: '“Đang biên soạn” nghĩa là môn chưa có học liệu được xuất bản.' },
    href: '/subjects', action: { en: 'Explore subjects', vi: 'Xem môn học' },
  },
  {
    id: 'account', audience: 'student', category: 'start',
    title: { en: 'Create an account or sign in', vi: 'Tạo tài khoản và đăng nhập' },
    description: { en: 'Sign in when you want SciPal to save your learning progress.', vi: 'Đăng nhập để SciPal lưu tiến trình học của bạn.' },
    visualSteps: [
      { en: 'Create', vi: 'Tạo' }, { en: 'Confirm', vi: 'Xác nhận' }, { en: 'Sign in', vi: 'Đăng nhập' },
    ],
    steps: [
      { en: 'Choose Sign in in the navigation bar, then switch to Create account if needed.', vi: 'Chọn Đăng nhập trên thanh điều hướng rồi chuyển sang Tạo tài khoản nếu cần.' },
      { en: 'Enter your name, email and password. Confirm your email if SciPal asks you to.', vi: 'Nhập họ tên, email và mật khẩu. Xác nhận email nếu SciPal yêu cầu.' },
      { en: 'Google or Facebook sign-in appears when that provider is available.', vi: 'Nút đăng nhập Google hoặc Facebook hiện khi nhà cung cấp đó được bật.' },
    ],
    note: { en: 'Guest trials do not save progress to an account.', vi: 'Lượt dùng thử của khách không lưu tiến trình vào tài khoản.' },
    href: '/login', action: { en: 'Open sign in', vi: 'Mở trang đăng nhập' },
  },
  {
    id: 'lesson', audience: 'student', category: 'learn',
    title: { en: 'Learn, simulate and practise', vi: 'Học bài, xem mô phỏng, tự luyện' },
    description: { en: 'Use the lesson parts that are available for each topic.', vi: 'Dùng các phần học liệu có trong từng bài.' },
    visualSteps: [
      { en: 'Read', vi: 'Đọc' }, { en: 'Explore', vi: 'Khám phá' }, { en: 'Practice', vi: 'Tự luyện' },
    ],
    steps: [
      { en: 'Read the lesson content: explanations, examples, formulas, code or linked terms.', vi: 'Đọc kiến thức, ví dụ, công thức, mã nguồn hoặc thuật ngữ liên kết.' },
      { en: 'Open Simulations when shown. Adjust the controls and observe what changes.', vi: 'Mở Mô phỏng nếu bài có phần này, điều chỉnh nút và quan sát thay đổi.' },
      { en: 'Answer Practice questions, check your work, then choose Mark as complete.', vi: 'Làm câu Tự luyện, kiểm tra đáp án rồi chọn Đánh dấu hoàn thành.' },
    ],
    note: { en: 'Sign in and wait for a successful save before checking Progress. Completing the same lesson again does not award XP again.', vi: 'Đăng nhập và chờ lưu thành công rồi xem Tiến trình. Học lại bài đã hoàn thành không cộng XP lần nữa.' },
    href: '/subjects', action: { en: 'Choose a lesson', vi: 'Chọn bài để học' },
  },
  {
    id: 'professor', audience: 'student', category: 'learn',
    title: { en: 'Ask the SciPal Professor', vi: 'Hỏi Giáo sư SciPal' },
    description: { en: 'Get a hint when a lesson or question has you stuck.', vi: 'Nhận gợi ý khi bạn chưa hiểu bài hoặc câu hỏi.' },
    visualSteps: [
      { en: 'Ask', vi: 'Hỏi' }, { en: 'Get a hint', vi: 'Nhận gợi ý' }, { en: 'Continue', vi: 'Học tiếp' },
    ],
    steps: [
      { en: 'Open the Professor panel or go to Professor from the navigation bar.', vi: 'Mở bảng Giáo sư hoặc chọn Giáo sư trên thanh điều hướng.' },
      { en: 'Describe the question and what you have tried by text or voice when available. Add the current lesson when relevant.', vi: 'Mô tả câu hỏi và phần bạn đã thử bằng chữ hoặc giọng nói khi có. Chọn bài đang học nếu phù hợp.' },
      { en: 'Use the hints one step at a time, then ask about any step that remains unclear.', vi: 'Làm theo từng gợi ý rồi hỏi tiếp về bước bạn chưa rõ.' },
    ],
    note: { en: 'The Professor needs an internet connection. Available questions depend on your plan.', vi: 'Giáo sư cần kết nối mạng. Số lượt hỏi phụ thuộc vào gói của bạn.' },
    href: '/tutor', action: { en: 'Ask the Professor', vi: 'Mở Giáo sư SciPal' },
  },
  {
    id: 'lab', audience: 'student', category: 'learn',
    title: { en: 'Explore the Lab', vi: 'Khám phá Thí nghiệm' },
    description: { en: 'Use interactive models to see how a scientific idea behaves.', vi: 'Dùng mô hình tương tác để quan sát một ý tưởng khoa học.' },
    visualSteps: [
      { en: 'Choose', vi: 'Chọn mẫu' }, { en: 'Adjust', vi: 'Điều chỉnh' }, { en: 'Observe', vi: 'Quan sát' },
    ],
    steps: [
      { en: 'Open Lab and choose a simulation that is available for your level.', vi: 'Mở Thí nghiệm rồi chọn mô phỏng đang có ở cấp học của bạn.' },
      { en: 'Change its controls, move the model or use the time controls when provided.', vi: 'Điều chỉnh tham số, thao tác mô hình hoặc dùng nút thời gian nếu có.' },
      { en: 'Compare the result with the lesson. Some linked external simulations need internet access.', vi: 'Đối chiếu kết quả với bài học. Một số mô phỏng ngoài cần kết nối mạng.' },
    ],
    href: '/lab', action: { en: 'Open Lab', vi: 'Mở Thí nghiệm' },
  },
  {
    id: 'glossary', audience: 'student', category: 'learn',
    title: { en: 'Look up bilingual terms', vi: 'Tra thuật ngữ song ngữ' },
    description: { en: 'Find a definition, example, pronunciation or saved term.', vi: 'Xem định nghĩa, ví dụ, phát âm và thuật ngữ đã lưu.' },
    visualSteps: [
      { en: 'Search', vi: 'Tra từ' }, { en: 'Read', vi: 'Xem nghĩa' }, { en: 'Save', vi: 'Lưu' },
    ],
    steps: [
      { en: 'Search in English or Vietnamese; Vietnamese without accents works too.', vi: 'Tìm bằng tiếng Anh hoặc tiếng Việt. Bạn có thể gõ tiếng Việt không dấu.' },
      { en: 'Filter by subject, read the definition and example, or use the speaker button.', vi: 'Lọc theo môn, đọc định nghĩa và ví dụ hoặc bấm nút loa.' },
      { en: 'Bookmark a term or copy its link. Open Saved to revisit your bookmarks.', vi: 'Lưu thuật ngữ hoặc sao chép liên kết. Mở Đã lưu để xem lại.' },
    ],
    note: { en: 'Saved terms stay in this browser. Pronunciation depends on your device.', vi: 'Thuật ngữ đã lưu nằm trong trình duyệt này. Phát âm phụ thuộc thiết bị.' },
    href: '/glossary', action: { en: 'Open glossary', vi: 'Mở từ điển' },
  },
  {
    id: 'exams', audience: 'student', category: 'learn',
    title: { en: 'Take a timed practice exam', vi: 'Làm một đề thi thử' },
    description: { en: 'Use the exam room to practise against a time limit.', vi: 'Luyện tập trong phòng thi có giới hạn thời gian.' },
    visualSteps: [
      { en: 'Choose', vi: 'Chọn đề' }, { en: 'Answer', vi: 'Làm bài' }, { en: 'Submit', vi: 'Nộp bài' },
    ],
    steps: [
      { en: 'Open Exams, choose an available exam and sign in to enter the exam room.', vi: 'Mở Thi thử, chọn đề đang có rồi đăng nhập để vào phòng thi.' },
      { en: 'Check the duration, answer each question and use the question list to revisit items.', vi: 'Xem thời lượng, trả lời câu hỏi và dùng bảng câu hỏi để quay lại.' },
      { en: 'Submit when ready. When time runs out, wait while SciPal sends and grades the attempt.', vi: 'Nộp bài khi sẵn sàng. Hết giờ, chờ SciPal gửi và chấm bài.' },
    ],
    note: { en: 'Keep the exam tab open and your connection stable. If submission fails, keep your answers on screen and retry.', vi: 'Giữ tab thi và kết nối ổn định. Nếu nộp lỗi, giữ nguyên câu trả lời rồi thử lại.' },
    href: '/exam', action: { en: 'View exams', vi: 'Xem đề thi' },
  },
  {
    id: 'games', audience: 'student', category: 'learn',
    title: { en: 'Play a learning game', vi: 'Chơi game học tập' },
    description: { en: 'Play public games or open a game assigned by your teacher.', vi: 'Chơi game công khai hoặc game thầy cô giao.' },
    visualSteps: [
      { en: 'Choose', vi: 'Chọn game' }, { en: 'Play', vi: 'Chơi' }, { en: 'Review', vi: 'Xem điểm' },
    ],
    steps: [
      { en: 'Open Games for public games, or open Classes to find a game assigned to your class.', vi: 'Mở Game để xem trò chơi công khai hoặc vào Lớp của em để tìm game được giao.' },
      { en: 'Read the game instructions, then answer the quiz, match the terms or open Wordwall.', vi: 'Đọc hướng dẫn rồi làm câu đố, ghép thuật ngữ hoặc mở Wordwall.' },
      { en: 'Return to the game or class to review the recorded result. Wordwall records that you played, not an external score.', vi: 'Quay lại game hoặc lớp để xem kết quả đã ghi nhận. Wordwall chỉ ghi nhận lượt chơi, không lấy điểm từ trang ngoài.' },
    ],
    href: '/games', action: { en: 'Browse games', vi: 'Xem game' },
  },
  {
    id: 'profile', audience: 'student', category: 'account',
    title: { en: 'Check progress, plan and preferences', vi: 'Xem tiến trình, gói học và cài đặt' },
    description: { en: 'Keep your learning record and account settings in view.', vi: 'Theo dõi việc học và các cài đặt tài khoản.' },
    visualSteps: [
      { en: 'Progress', vi: 'Tiến trình' }, { en: 'My plan', vi: 'Gói học' }, { en: 'Settings', vi: 'Cài đặt' },
    ],
    steps: [
      { en: 'Open Progress after signing in to see completed lessons, XP and your learning streak.', vi: 'Đăng nhập rồi mở Tiến trình để xem bài đã học, XP và chuỗi ngày học.' },
      { en: 'Open Profile → My plan to review your plan and current usage. Pricing lists available plans.', vi: 'Mở Hồ sơ → Gói của tôi để xem gói và mức sử dụng. Bảng giá liệt kê các gói.' },
      { en: 'In Profile, change your education level, language or light/dark appearance.', vi: 'Trong Hồ sơ, đổi cấp học, ngôn ngữ hoặc giao diện sáng/tối.' },
    ],
    href: '/profile', action: { en: 'Open profile', vi: 'Mở hồ sơ' },
  },
  {
    id: 'classes', audience: 'student', category: 'account',
    title: { en: 'Join a class and open assigned work', vi: 'Vào lớp và làm bài được giao' },
    description: { en: 'Use your teacher’s code to find lessons, exams and games for your class.', vi: 'Dùng mã của thầy cô để xem bài học, đề thi và game của lớp.' },
    visualSteps: [
      { en: 'Join', vi: 'Vào lớp' }, { en: 'Open work', vi: 'Bài giao' }, { en: 'Complete', vi: 'Hoàn thành' },
    ],
    steps: [
      { en: 'Sign in, open My classes and choose Join with a code.', vi: 'Đăng nhập, mở Lớp của em rồi chọn Vào lớp bằng mã.' },
      { en: 'Enter the six-character code from your teacher. Open an assignment to see its due date.', vi: 'Nhập mã sáu ký tự của thầy cô. Mở bài được giao để xem hạn nộp.' },
      { en: 'Complete the lesson or submit the exam. Return to the class to see what is still due.', vi: 'Hoàn thành bài học hoặc nộp đề thi. Quay lại lớp để xem bài còn hạn.' },
    ],
    href: '/classes', action: { en: 'Open my classes', vi: 'Mở lớp của em' },
  },
  {
    id: 'offline', audience: 'student', category: 'account',
    title: { en: 'Install SciPal and study offline', vi: 'Cài SciPal và học offline' },
    description: { en: 'Install SciPal from your browser and save lessons before you lose connection.', vi: 'Cài SciPal từ trình duyệt và lưu bài trước khi mất mạng.' },
    visualSteps: [
      { en: 'Install', vi: 'Cài SciPal' }, { en: 'Save lesson', vi: 'Tải bài' }, { en: 'Study offline', vi: 'Học offline' },
    ],
    steps: [
      { en: 'Use Install SciPal when your browser offers it. On iPhone or iPad, use Safari’s Share → Add to Home Screen.', vi: 'Chọn Cài SciPal khi trình duyệt gợi ý. Trên iPhone hoặc iPad, dùng Safari: Chia sẻ → Thêm vào MH chính.' },
      { en: 'While online, open a lesson and choose Save lessons for offline.', vi: 'Khi đang có mạng, mở bài học rồi chọn Tải bài để học offline.' },
      { en: 'Open SciPal again from your home screen and read the saved lesson without a connection.', vi: 'Mở lại SciPal từ màn hình chính để đọc bài đã lưu khi không có mạng.' },
    ],
    note: { en: 'Interactive content that depends on an external service may still need internet.', vi: 'Nội dung tương tác dùng dịch vụ bên ngoài vẫn có thể cần mạng.' },
    href: '/subjects', action: { en: 'Find lessons', vi: 'Tìm bài học' },
  },
] as const satisfies readonly HelpGuide[];
