import React from 'react';

/**
 * Hoa sen lớn dạng watermark (Kbach Chhuk Mandala) — đặt sau hero,
 * cắt xén một góc, tĩnh và rất nhạt để không cạnh tranh nội dung.
 */
export function LotusWatermark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <circle cx="100" cy="100" r="88" stroke="currentColor" strokeWidth="1" strokeOpacity="0.45" />
      <circle cx="100" cy="100" r="64" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 4" strokeOpacity="0.35" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <g key={angle} transform={`rotate(${angle} 100 100)`}>
          <path
            d="M100 24C93 42 90 58 100 74C110 58 107 42 100 24Z"
            stroke="currentColor"
            strokeWidth="1"
            strokeOpacity="0.55"
          />
        </g>
      ))}
      {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((angle) => (
        <g key={angle} transform={`rotate(${angle} 100 100)`}>
          <path
            d="M100 40C96 51 94 62 100 70C106 62 104 51 100 40Z"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeOpacity="0.4"
          />
        </g>
      ))}
      <circle cx="100" cy="100" r="4" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5" />
    </svg>
  );
}

/**
 * Họa tiết kim cương 4 cánh (Kbach Piriel) — dấu nhỏ bên cạnh nhãn eyebrow.
 */
export function DiamondMark({ className = 'size-2.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      width="12"
      height="12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M6 0.8 8.1 3.9 11.2 6 8.1 8.1 6 11.2 3.9 8.1 0.8 6 3.9 3.9 6 0.8Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
    </svg>
  );
}

/**
 * Icon Email
 */
export function MailIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m5 8 7 5 7-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Icon Khoa bao mat (Lock)
 */
export function LockIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="10" width="16" height="11" rx="3" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Icon Mat hien (Show password)
 */
export function EyeIcon({ className = 'size-4.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/**
 * Icon Mat an (Hide password)
 */
export function EyeOffIcon({ className = 'size-4.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className={className}
      aria-hidden="true"
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c6.4 0 10 7 10 7a18.25 18.25 0 0 1-4.28 4.95M6.21 6.21A18.06 18.06 0 0 0 2 12s3.6 7 10 7c2.08 0 3.98-.75 5.6-1.95" />
      <path d="m2 2 20 20" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Icon Checkmark cho checkbox
 */
export function CheckIcon({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/**
 * Icon Mui ten (submit CTA)
 */
export function ArrowRightIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="18"
      height="18"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M3.5 10h12M10.5 5l5 5-5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Icon Mat troi (light theme)
 */
export function SunIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
    </svg>
  );
}

/**
 * Icon Trăng lưỡi liềm (dark theme)
 */
export function MoonIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.2 14.5A8.3 8.3 0 0 1 9.5 3.8a8.3 8.3 0 1 0 10.7 10.7Z" />
    </svg>
  );
}

/**
 * Icon Quả cầu (language switcher)
 */
export function GlobeIcon({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14.5 14.5 0 0 1 0 18M12 3a14.5 14.5 0 0 0 0 18" />
    </svg>
  );
}

/**
 * Icon Đóng (modal)
 */
export function CloseIcon({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}
