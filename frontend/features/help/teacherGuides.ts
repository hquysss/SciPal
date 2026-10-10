import type { HelpGuide } from './guideTypes';

export const TEACHER_GUIDES = [
  {
    id: 'teachers', audience: 'teacher', category: 'teach',
    title: { en: 'Request teacher access', vi: 'Xin quyền giáo viên' },
    description: { en: 'Teacher tools appear after an administrator approves your request.', vi: 'Công cụ giáo viên sẽ hiện sau khi quản trị viên duyệt yêu cầu.' },
    visualSteps: [
      { en: 'Request', vi: 'Gửi yêu cầu' }, { en: 'Approval', vi: 'Chờ duyệt' }, { en: 'Open tools', vi: 'Mở công cụ' },
    ],
    steps: [
      { en: 'Sign in and open Profile → Request teacher access. Complete the school and teaching details.', vi: 'Đăng nhập, mở Hồ sơ → Xin quyền giáo viên rồi điền thông tin trường và môn dạy.' },
      { en: 'Submit the request and check its status in Profile. An administrator reviews it.', vi: 'Gửi yêu cầu rồi xem trạng thái trong Hồ sơ. Quản trị viên sẽ duyệt.' },
      { en: 'After approval, refresh your session or sign in again to see teacher tools.', vi: 'Sau khi được duyệt, làm mới phiên hoặc đăng nhập lại để thấy công cụ giáo viên.' },
    ],
    note: { en: 'Changing a profile or display setting does not grant teacher access.', vi: 'Đổi hồ sơ hoặc cài đặt giao diện không tự cấp quyền giáo viên.' },
    href: '/profile', action: { en: 'Open profile', vi: 'Mở hồ sơ' },
  },
  {
    id: 'teacher-lessons', audience: 'teacher', category: 'teach',
    title: { en: 'Create and submit a lesson', vi: 'Soạn và gửi duyệt bài học' },
    description: { en: 'Use the Studio to create a bilingual lesson and preview it as a student.', vi: 'Dùng Studio để soạn bài song ngữ và xem trước như học sinh.' },
    visualSteps: [
      { en: 'Create draft', vi: 'Tạo nháp' }, { en: 'Add content', vi: 'Thêm học liệu' }, { en: 'Submit', vi: 'Gửi duyệt' },
    ],
    steps: [
      { en: 'From Subjects, choose Write lessons. Select a subject, grade and topic, then create a draft.', vi: 'Trong Môn học, chọn Soạn bài. Chọn môn, khối lớp, chủ đề rồi tạo bản nháp.' },
      { en: 'Add bilingual explanations, formulas, code, terms, simulations or practice questions. Use AI Draft or translation helpers as a starting point, then review both languages in the student preview.', vi: 'Thêm lý thuyết song ngữ, công thức, mã nguồn, thuật ngữ, mô phỏng hoặc câu tự luyện. Có thể dùng Soạn nháp bằng AI hoặc hỗ trợ dịch để bắt đầu, rồi kiểm tra cả hai ngôn ngữ ở phần xem trước.' },
      { en: 'Save the draft as you work. When it is ready, send it for review and follow its status in the Studio.', vi: 'Lưu bản nháp trong lúc soạn. Khi hoàn tất, gửi duyệt và theo dõi trạng thái trong Studio.' },
    ],
    note: { en: 'Teachers submit lessons for review; students see them after approval and publication.', vi: 'Giáo viên gửi bài để duyệt; học sinh chỉ thấy bài sau khi được thông qua và xuất bản.' },
    href: '/teacher/lessons', action: { en: 'Open lesson Studio', vi: 'Mở Studio soạn bài' },
  },
  {
    id: 'teacher-import', audience: 'teacher', category: 'teach',
    title: { en: 'Import lesson or exam files', vi: 'Nhập tệp bài học hoặc đề thi' },
    description: { en: 'Review supported files before saving them into SciPal.', vi: 'Kiểm tra tệp được hỗ trợ trước khi lưu vào SciPal.' },
    visualSteps: [
      { en: 'Choose file', vi: 'Chọn tệp' }, { en: 'Review', vi: 'Kiểm tra' }, { en: 'Save draft', vi: 'Lưu nháp' },
    ],
    steps: [
      { en: 'Open Teacher → Import. Choose Word (.docx) or text-selectable PDF for lessons, or the Excel (.xlsx) template for exams.', vi: 'Mở Giáo viên → Nhập tệp. Chọn Word (.docx) hoặc PDF chọn được chữ cho bài học, hoặc mẫu Excel (.xlsx) cho đề thi.' },
      { en: 'Check each lesson or question, fix validation issues and complete missing English text before saving.', vi: 'Kiểm tra từng bài hoặc câu hỏi, sửa lỗi xác thực và bổ sung tiếng Anh còn thiếu trước khi lưu.' },
      { en: 'Save the batch. Lesson files remain drafts for the Studio; imported questions and exams go to admin review.', vi: 'Lưu cả lô. Bài học thành bản nháp trong Studio; câu hỏi và đề thi được gửi admin duyệt.' },
    ],
    note: { en: 'Teachers’ imported materials remain drafts or await review; importing does not publish them.', vi: 'Học liệu giáo viên nhập sẽ ở dạng nháp hoặc chờ duyệt; nhập tệp không tự xuất bản.' },
    href: '/teacher/import', action: { en: 'Open import', vi: 'Mở trang nhập tệp' },
  },
  {
    id: 'teacher-exams', audience: 'teacher', category: 'teach',
    title: { en: 'Build an exam from questions', vi: 'Tạo đề thi từ ngân hàng câu hỏi' },
    description: { en: 'Choose a format, assemble questions and send the exam for review.', vi: 'Chọn định dạng, sắp xếp câu hỏi rồi gửi đề để duyệt.' },
    visualSteps: [
      { en: 'Create exam', vi: 'Tạo đề' }, { en: 'Add questions', vi: 'Thêm câu' }, { en: 'Submit', vi: 'Gửi duyệt' },
    ],
    steps: [
      { en: 'From Exams, choose Manage exams and create a draft with its subject, grade and format.', vi: 'Trong Thi thử, chọn Quản lý đề thi rồi tạo bản nháp với môn, khối lớp và định dạng.' },
      { en: 'Add sections, choose questions from the bank or create new ones, set the duration and preview the exam.', vi: 'Thêm phần, chọn câu trong ngân hàng hoặc tạo câu mới, đặt thời lượng rồi xem trước đề.' },
      { en: 'Save the draft, fix any review issues and send it for approval.', vi: 'Lưu bản nháp, sửa các lỗi được báo rồi gửi duyệt.' },
    ],
    note: { en: 'Only published exams can be assigned to a class.', vi: 'Chỉ đề đã xuất bản mới giao được cho lớp.' },
    href: '/exam/manage', action: { en: 'Manage exams', vi: 'Quản lý đề thi' },
  },
  {
    id: 'teacher-classes', audience: 'teacher', category: 'teach',
    title: { en: 'Create a class and assign work', vi: 'Tạo lớp và giao bài' },
    description: { en: 'Invite students, set due dates and follow completed work.', vi: 'Mời học sinh, đặt hạn nộp và theo dõi bài đã hoàn thành.' },
    visualSteps: [
      { en: 'Create class', vi: 'Tạo lớp' }, { en: 'Share code', vi: 'Chia sẻ mã' }, { en: 'Assign work', vi: 'Giao bài' },
    ],
    steps: [
      { en: 'Open Teacher → Classes and create a class. SciPal gives it a six-character invite code.', vi: 'Mở Giáo viên → Lớp học rồi tạo lớp. SciPal cấp mã mời sáu ký tự.' },
      { en: 'Share the code with students. Open the class to see its roster and learning progress.', vi: 'Gửi mã cho học sinh. Mở lớp để xem danh sách và tiến trình học.' },
      { en: 'Assign a published lesson or exam, optionally set a due date, then follow completion in the class.', vi: 'Giao bài học hoặc đề đã xuất bản, đặt hạn nếu cần rồi theo dõi tiến độ trong lớp.' },
    ],
    href: '/teacher/classes', action: { en: 'Open classes', vi: 'Mở lớp học' },
  },
  {
    id: 'teacher-games', audience: 'teacher', category: 'teach',
    title: { en: 'Make a game for a class', vi: 'Tạo game cho lớp' },
    description: { en: 'Choose a quiz, a term match or an embedded Wordwall game.', vi: 'Chọn game đố vui, ghép thuật ngữ hoặc Wordwall nhúng.' },
    visualSteps: [
      { en: 'Choose type', vi: 'Chọn loại' }, { en: 'Create game', vi: 'Tạo game' }, { en: 'Follow plays', vi: 'Theo dõi' },
    ],
    steps: [
      { en: 'Open one of your classes and choose New game.', vi: 'Mở lớp bạn phụ trách rồi chọn Tạo game.' },
      { en: 'Choose a quiz from lesson practice, an English–Vietnamese term match or a Wordwall link.', vi: 'Chọn câu đố từ phần Tự luyện, ghép thuật ngữ Anh–Việt hoặc liên kết Wordwall.' },
      { en: 'Save the game. Students in the class receive a notification; return here to see plays and available results.', vi: 'Lưu game. Học sinh trong lớp nhận thông báo; quay lại đây để xem lượt chơi và kết quả hiện có.' },
    ],
    href: '/teacher/classes', action: { en: 'Open classes', vi: 'Mở lớp học' },
  },
  {
    id: 'teacher-terms', audience: 'teacher', category: 'teach',
    title: { en: 'Add bilingual glossary terms', vi: 'Thêm thuật ngữ song ngữ' },
    description: { en: 'Add one term or prepare a batch for your subject.', vi: 'Thêm từng thuật ngữ hoặc chuẩn bị một lô cho môn của bạn.' },
    visualSteps: [
      { en: 'Add term', vi: 'Thêm từ' }, { en: 'Submit', vi: 'Gửi duyệt' }, { en: 'Approved', vi: 'Đã duyệt' },
    ],
    steps: [
      { en: 'Open Glossary and choose Add terms. Select your subject and enter the Vietnamese and English term details.', vi: 'Mở Từ điển, chọn Thêm thuật ngữ, chọn môn rồi nhập thông tin tiếng Việt và tiếng Anh.' },
      { en: 'Add definitions and examples, or use the batch tool for several terms. Review the rows before sending.', vi: 'Thêm định nghĩa và ví dụ, hoặc dùng nhập hàng loạt. Kiểm tra các dòng trước khi gửi.' },
      { en: 'Submit the terms and check their status in Teacher → Terms.', vi: 'Gửi thuật ngữ rồi xem trạng thái trong Giáo viên → Thuật ngữ.' },
    ],
    note: { en: 'An administrator reviews teacher-submitted terms before students can see them.', vi: 'Quản trị viên duyệt thuật ngữ giáo viên gửi trước khi học sinh nhìn thấy.' },
    href: '/teacher/terms', action: { en: 'Add terms', vi: 'Thêm thuật ngữ' },
  },
  {
    id: 'teacher-simulations', audience: 'teacher', category: 'teach',
    title: { en: 'Request a lesson simulation', vi: 'Đề xuất mô phỏng cho bài học' },
    description: { en: 'Track a requested simulation and insert it into its lesson when ready.', vi: 'Theo dõi mô phỏng đã đề xuất rồi chèn vào bài khi có kết quả.' },
    visualSteps: [
      { en: 'Request', vi: 'Đề xuất' }, { en: 'Track', vi: 'Theo dõi' }, { en: 'Insert', vi: 'Chèn vào bài' },
    ],
    steps: [
      { en: 'Open the lesson Studio and choose its Simulation part. Submit a request with the lesson context.', vi: 'Mở Studio của bài, chọn phần Mô phỏng rồi gửi đề xuất kèm ngữ cảnh bài học.' },
      { en: 'Open Teacher → Simulation requests to check each request’s status.', vi: 'Mở Giáo viên → Đề xuất mô phỏng để xem trạng thái.' },
      { en: 'When a result is ready, reopen its lesson and choose Insert into lesson.', vi: 'Khi có kết quả, mở lại bài tương ứng rồi chọn Chèn vào bài.' },
    ],
    href: '/teacher/simulation-requests', action: { en: 'View requests', vi: 'Xem đề xuất' },
  },
] as const satisfies readonly HelpGuide[];
