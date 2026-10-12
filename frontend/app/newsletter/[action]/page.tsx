import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NewsletterLinkPage } from '@/features/newsletter/NewsletterLinkPage';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Newsletter', 'Nhận tin'), robots: { index: false } };

export default async function NewsletterRoute({ params, searchParams }: { params: Promise<{ action: string }>; searchParams: Promise<{ token?: string }> }) {
  const { action } = await params;
  if (action !== 'confirm' && action !== 'unsubscribe') notFound();
  const { token } = await searchParams;
  return <NewsletterLinkPage action={action} token={typeof token === 'string' ? token : ''} />;
}
