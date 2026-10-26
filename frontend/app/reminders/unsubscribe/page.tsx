import type { Metadata } from 'next';
import { ReminderUnsubscribePage } from '@/features/reminders/ReminderUnsubscribePage';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Study reminders', 'Nhắc học'), robots: { index: false } };

export default async function ReminderUnsubscribeRoute({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <ReminderUnsubscribePage token={typeof token === 'string' ? token : ''} />;
}
