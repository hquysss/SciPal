import type { Metadata } from 'next';
import { HelpCenter } from '@/features/help/HelpCenter';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = {
  ...pageTitle('Help', 'Hướng dẫn'),
  description: 'Hướng dẫn sử dụng SciPal: bài học, mô phỏng, tự luyện, từ điển, thi thử và Giáo sư SciPal. Learn how to use SciPal.',
};

export default function HelpPage() {
  return <HelpCenter />;
}
