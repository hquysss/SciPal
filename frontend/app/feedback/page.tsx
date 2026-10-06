import type { Metadata } from 'next';
import { WebsiteFeedbackPage } from '@/features/website-feedback/WebsiteFeedbackPage';
import { pageTitle } from '@/lib/pageTitle';
export const metadata: Metadata = { ...pageTitle('Review SciPal', 'Đánh giá SciPal') };
export default function FeedbackPage() { return <WebsiteFeedbackPage />; }
