'use client';

import { useLanguage } from '@scipal/hooks';

/** On the sign-in page when a visitor's trial of a feature has run out (?reason=trial). */
export function TrialEndedNote() {
  const { t } = useLanguage();
  return (
    <p role="status" className="katha-login-trial-note">
      {t({
        vi: 'Bạn đã dùng hết 30 phút dùng thử tính năng này. Lượt thử mới mở lại sau 24 giờ. Muốn học tiếp ngay, hãy tạo tài khoản miễn phí (hoặc đăng nhập), SciPal sẽ đưa bạn về đúng trang vừa mở.',
        en: 'You have used your 30-minute trial of this feature. A new trial opens in 24 hours. To keep going now, create a free account (or sign in) and SciPal will bring you back to this page.',
      })}
    </p>
  );
}
