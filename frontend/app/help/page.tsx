import type { Metadata } from 'next';
import { HelpCenter } from '@/features/help/HelpCenter';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = {
  ...pageTitle('Help', 'Hướng dẫn'),
  description: 'Hướng dẫn song ngữ cho học sinh và giáo viên: học bài, thi thử, lớp học và soạn học liệu. Bilingual guides to learning, exams, classes and teaching tools in SciPal.',
};

export default function HelpPage() {
  return <HelpCenter />;
}
