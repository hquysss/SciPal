'use client';

import { useLanguage } from '@scipal/hooks';

/** On the sign-in page when a visitor's trial of a feature has run out (?reason=trial). */
export function TrialEndedNote() {
  const { t } = useLanguage();
  return (
    <p role="status" className="katha-login-trial-note">
      {t({
        vi: 'Bạn đã dùng hết lượt thử tính năng này. Tạo tài khoản miễn phí (hoặc đăng nhập) để học tiếp. SciPal sẽ đưa bạn về đúng trang vừa mở.',
        en: 'You have used your trial of this feature. Create a free account (or sign in) to keep going — SciPal will bring you back to this page.',
      })}
    </p>
  );
}
