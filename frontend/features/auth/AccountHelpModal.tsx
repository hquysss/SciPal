'use client';

import { useEffect, useRef } from 'react';
import { useLanguage } from '@scipal/hooks';

interface AccountHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountHelpModal({ isOpen, onClose }: AccountHelpModalProps) {
  const { t } = useLanguage();
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus close button on open
    const frameId = window.requestAnimationFrame(() => {
      closeBtnRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-xs transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-help-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-gray-200/90 bg-white p-6 sm:p-8 shadow-2xl dark:border-white/10 dark:bg-gray-900 transition-transform duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-lg font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              🏛️
            </span>
            <h3 id="account-help-title" className="text-lg font-bold text-gray-950 dark:text-white">
              {t({
                en: 'Institutional Account Policy',
                vi: 'Chính sách Tài khoản Cấp phát',
              })}
            </h3>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition"
            aria-label={t({ en: 'Close', vi: 'Đóng' })}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="py-5 space-y-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            <p className="font-semibold mb-1">
              {t({
                en: 'Accounts are issued directly by your school administration.',
                vi: 'Tài khoản được nhà trường hoặc ban quản trị cấp phát trực tiếp.',
              })}
            </p>
            <p className="text-xs">
              {t({
                en: 'SciPal operates as an authorized natural science learning environment. Public registration is permanently closed to ensure curriculum integrity and student verification.',
                vi: 'SciPal hoạt động như một môi trường học tập khoa học tự nhiên chuẩn mực. Hệ thống không mở đăng ký tự do để bảo đảm tính chuẩn xác và phân lớp học sinh.',
              })}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-gray-900 dark:text-white">
              {t({
                en: 'Forgot your password or haven’t received credentials?',
                vi: 'Quên mật khẩu hoặc chưa nhận được thông tin tài khoản?',
              })}
            </h4>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
              <li>
                <strong>{t({ en: 'For Students:', vi: 'Dành cho Học sinh:' })}</strong>{' '}
                {t({
                  en: 'Contact your Class Homeroom Teacher or your school’s Informatics/ICT teacher.',
                  vi: 'Liên hệ Giáo viên chủ nhiệm hoặc Giáo viên bộ môn Tin học tại trường của bạn.',
                })}
              </li>
              <li>
                <strong>{t({ en: 'For Teachers:', vi: 'Dành cho Giáo viên:' })}</strong>{' '}
                {t({
                  en: 'Contact your school’s Academic Affairs Office or the SciPal System Administrator.',
                  vi: 'Liên hệ Tổ trưởng Chuyên môn hoặc Ban Quản trị Hệ thống SciPal nhà trường.',
                })}
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-gray-100 pt-4 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-emerald-700 px-6 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-emerald-600 transition"
          >
            {t({ en: 'Understood', vi: 'Đã hiểu' })}
          </button>
        </div>
      </div>
    </div>
  );
}
