'use client';

import { useLanguage } from '@scipal/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NewsletterSignup } from './NewsletterSignup';

/** The profile's newsletter sign-up, with the account's address filled in. */
export function NewsletterCard({ email }: { email: string | null }) {
  const { t } = useLanguage();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t({ vi: 'Nhận tin qua email', en: 'News by e-mail' })}</CardTitle>
        <CardDescription>{t({ vi: 'Báo cho bạn khi SciPal có bài và cấp học mới.', en: 'We tell you when SciPal adds lessons and levels.' })}</CardDescription>
      </CardHeader>
      <CardContent>
        <NewsletterSignup email={email ?? ''} />
      </CardContent>
    </Card>
  );
}
