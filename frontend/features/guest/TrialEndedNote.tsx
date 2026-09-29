'use client';

import { useLanguage } from '@scipal/hooks';

/** On the sign-in page when a visitor's trial of a feature has run out (?reason=trial). */
export function TrialEndedNote() {
  const { t } = useLanguage();
  return (
    <p role="status" className="katha-login-trial-note">
      {t({
        vi: 'Bạn đã dùng hết lượt thử tính năng này. Đăng nhập (miễn phí) để học tiếp — SciPal sẽ đưa bạn về đúng trang vừa mở.',
        en: 'You have used your trial of this feature. Sign in (free) to keep going — SciPal will bring you back to this page.',
      })}
    </p>
  );
}
