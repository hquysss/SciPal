import { normalize } from '@/features/glossary/termFilter';
import { STUDENT_GUIDES } from './studentGuides';
import { TEACHER_GUIDES } from './teacherGuides';
import type { HelpCategory, HelpCopy, HelpFaq, HelpGuide } from './guideTypes';

export type { HelpCategory, HelpFaq, HelpGuide } from './guideTypes';

export const HELP_CATEGORIES = [
  { id: 'all', label: { en: 'All topics', vi: 'Tất cả chủ đề' } },
  { id: 'start', label: { en: 'Getting started', vi: 'Bắt đầu sử dụng' } },
  { id: 'learn', label: { en: 'Learning tools', vi: 'Công cụ học tập' } },
  { id: 'account', label: { en: 'Your account', vi: 'Tài khoản của bạn' } },
  { id: 'teach', label: { en: 'For teachers', vi: 'Dành cho giáo viên' } },
] as const satisfies readonly { readonly id: HelpCategory; readonly label: HelpCopy }[];

export const HELP_GUIDES: readonly HelpGuide[] = [...STUDENT_GUIDES, ...TEACHER_GUIDES];

export const HELP_FAQS = [
  { id: 'guest', category: 'start', question: { en: 'Can I try SciPal without an account?', vi: 'Chưa có tài khoản thì dùng SciPal được không?' }, answer: { en: 'Help, Home and Pricing are open. When guest trials are enabled, Subjects, Glossary and Exams have a 30-minute trial window, and the Professor offers one trial question. Sign in to save progress or enter an exam room.', vi: 'Hướng dẫn, Trang chủ và Bảng giá mở cho mọi người. Khi bật dùng thử, khách có 30 phút trải nghiệm Môn học, Từ điển và Thi thử; Giáo sư cho hỏi thử một câu. Đăng nhập để lưu tiến trình hoặc vào phòng thi.' } },
  { id: 'language', category: 'start', question: { en: 'How do I switch between English and Vietnamese?', vi: 'Đổi tiếng Anh và tiếng Việt ở đâu?' }, answer: { en: 'Use the EN/VI flag buttons on the navigation bar. You can also change the language in Profile. This Help page follows the same setting.', vi: 'Dùng nút cờ EN/VI trên thanh điều hướng. Bạn cũng có thể đổi ngôn ngữ trong Hồ sơ. Trang Hướng dẫn dùng cùng lựa chọn này.' } },
  { id: 'unpublished', category: 'learn', question: { en: 'Why is a subject marked “In preparation”?', vi: 'Vì sao môn học ghi “Đang biên soạn”?' }, answer: { en: 'The subject is in the curriculum catalog but has no published learning materials yet. Choose a subject with available lessons and check your selected grade.', vi: 'Môn đã có trong danh mục chương trình nhưng chưa có học liệu xuất bản. Chọn môn đã có bài và kiểm tra lại khối lớp đang chọn.' } },
  { id: 'offline-lessons', category: 'account', question: { en: 'How do I read lessons offline?', vi: 'Làm sao đọc bài học khi không có mạng?' }, answer: { en: 'While connected, install SciPal from your browser and use Save lessons for offline on the lesson page. Reopen SciPal from your home screen to read saved lessons.', vi: 'Khi có mạng, cài SciPal từ trình duyệt rồi chọn Tải bài để học offline trong trang bài học. Mở lại SciPal từ màn hình chính để đọc bài đã lưu.' } },
  { id: 'save', category: 'account', question: { en: 'What if my progress was not saved?', vi: 'Làm gì khi chưa lưu được tiến trình?' }, answer: { en: 'Check that you are signed in and connected. Keep the lesson open and retry Mark as complete. Open Progress after SciPal confirms the save.', vi: 'Kiểm tra bạn đã đăng nhập và có mạng. Giữ bài đang mở rồi thử Đánh dấu hoàn thành lần nữa. Mở Tiến trình sau khi SciPal báo lưu thành công.' } },
  { id: 'limits', category: 'account', question: { en: 'What happens when I run out of questions or attempts?', vi: 'Hết lượt hỏi hoặc lượt thi thì làm gì?' }, answer: { en: 'Read the limit notice to see whether it resets daily or monthly. Students can check My plan in their account menu; Pricing lists the current plans. Limits depend on the active plan.', vi: 'Đọc thông báo để biết lượt được tính theo ngày hay tháng. Học sinh xem Gói của tôi trong menu tài khoản; Bảng giá có thông tin gói hiện tại. Giới hạn phụ thuộc gói đang dùng.' } },
  { id: 'teacher-tools', category: 'teach', question: { en: 'Why can’t I see teacher tools?', vi: 'Vì sao tôi chưa thấy công cụ giáo viên?' }, answer: { en: 'A new account starts as a student. Send a teacher request from Profile and wait for approval. If approved, refresh your session or sign in again. A profile setting alone does not grant teacher access.', vi: 'Tài khoản mới có quyền học sinh. Gửi yêu cầu làm giáo viên ở Hồ sơ và chờ duyệt. Khi đã được duyệt, làm mới phiên hoặc đăng nhập lại. Cài đặt hồ sơ không tự cấp quyền giáo viên.' } },
  { id: 'teacher-review', category: 'teach', question: { en: 'When can students see materials I submit?', vi: 'Khi nào học sinh thấy học liệu tôi gửi?' }, answer: { en: 'Teachers submit lessons, exams and glossary terms for review. Students can use them after approval and publication.', vi: 'Giáo viên gửi bài học, đề thi và thuật ngữ để duyệt. Học sinh dùng được sau khi học liệu được thông qua và xuất bản.' } },
] as const satisfies readonly HelpFaq[];

function matchesQuery(fields: readonly HelpCopy[], query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const text = normalize(fields.flatMap(({ en, vi }) => [en, vi]).join(' '));
  return words.every((word) => text.includes(word));
}

export function searchHelp(query: string, category: HelpCategory) {
  return {
    guides: HELP_GUIDES.filter((guide) =>
      (category === 'all' || guide.category === category) &&
      matchesQuery([guide.title, guide.description, ...guide.steps, ...guide.visualSteps, ...(guide.note ? [guide.note] : [])], query),
    ),
    faqs: HELP_FAQS.filter((faq) => (category === 'all' || faq.category === category) && matchesQuery([faq.question, faq.answer], query)),
  };
}
