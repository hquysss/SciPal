import React from 'react';

/**
 * Mô hình Quỹ đạo Nguyên tử Rutherford-Bohr (Atom Orbit)
 * Đại diện cho Vật lý Lượng tử & Hóa học — biểu tượng đặc trưng của SciPal Lab.
 */
export function AtomOrbitMark({ className = 'size-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      {/* Hạt nhân tâm (Nucleus) */}
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      {/* Vòng quỹ đạo 1 (Nghiêng 0 độ) */}
      <ellipse
        cx="12"
        cy="12"
        rx="9.5"
        ry="3.8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeOpacity="0.85"
      />
      {/* Vòng quỹ đạo 2 (Nghiêng 60 độ) */}
      <ellipse
        cx="12"
        cy="12"
        rx="9.5"
        ry="3.8"
        transform="rotate(60 12 12)"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeOpacity="0.85"
      />
      {/* Vòng quỹ đạo 3 (Nghiêng 120 độ) */}
      <ellipse
        cx="12"
        cy="12"
        rx="9.5"
        ry="3.8"
        transform="rotate(120 12 12)"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeOpacity="0.85"
      />
      {/* Các hạt electron trên quỹ đạo */}
      <circle cx="21" cy="12" r="0.9" fill="currentColor" />
      <circle cx="7.25" cy="4.2" r="0.9" fill="currentColor" />
      <circle cx="7.25" cy="19.8" r="0.9" fill="currentColor" />
    </svg>
  );
}

/**
 * Cấu trúc Mạch Vòng Benzen 6 cạnh (Benzene Carbon Ring)
 * Đại diện cho Hóa học Hữu cơ THPT.
 */
export function BenzeneRingMark({ className = 'size-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <polygon
        points="12,2 20.66,7 20.66,17 12,22 3.34,17 3.34,7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="4.8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeDasharray="2.5 2"
      />
    </svg>
  );
}

/**
 * Biểu tượng Đồ thị Cây Thuật toán (Binary Tree / Graph Node)
 * Đại diện cho môn Tin học THPT.
 */
export function BinaryTreeMark({ className = 'size-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      {/* Root node */}
      <circle cx="12" cy="4" r="2.2" stroke="currentColor" strokeWidth="1.3" />
      {/* Child nodes level 1 */}
      <circle cx="6" cy="12" r="2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="18" cy="12" r="2" stroke="currentColor" strokeWidth="1.3" />
      {/* Leaf nodes level 2 */}
      <circle cx="3" cy="20" r="1.6" fill="currentColor" />
      <circle cx="9" cy="20" r="1.6" fill="currentColor" />
      <circle cx="15" cy="20" r="1.6" fill="currentColor" />
      <circle cx="21" cy="20" r="1.6" fill="currentColor" />
      {/* Edges */}
      <path
        d="M10.5 5.5L7.5 10.5M13.5 5.5L16.5 10.5M5 13.8L3.5 18.5M7 13.8L8.5 18.5M17 13.8L15.5 18.5M19 13.8L20.5 18.5"
        stroke="currentColor"
        strokeWidth="1.1"
      />
    </svg>
  );
}

/**
 * Biểu tượng Hạt Lượng tử / Kim cương Khoa học (Quantum Diamond Node)
 */
export function QuantumNodeMark({ className = 'size-3' }: { className?: string }) {
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
      <circle cx="6" cy="6" r="1.2" fill="#ffffff" />
    </svg>
  );
}

/**
 * Icon Hòm thư Email trường học
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
 * Icon Khóa bảo mật Điện toán
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
 * Icon Mắt mở (Show password)
 */
export function EyeIcon({ className = 'size-5' }: { className?: string }) {
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
      <path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/**
 * Icon Mắt ẩn (Hide password)
 */
export function EyeOffIcon({ className = 'size-5' }: { className?: string }) {
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
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c6.2 0 10 7 10 7a18.2 18.2 0 0 1-3.17 4.29M3.51 3.51l16.98 16.98M1 12s3.8-7 10-7c.72 0 1.41.09 2.07.26M6.28 6.28A18.8 18.8 0 0 0 2 12s3.8 7 10 7a10.3 10.3 0 0 0 5.27-1.48" />
    </svg>
  );
}

/**
 * Icon Tích chọn
 */
export function CheckIcon({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  );
}

/**
 * Icon Đóng hộp thoại
 */
export function CloseIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

/**
 * Icon Mũi tên chuyển tiếp
 */
export function ArrowRightIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

/**
 * Icon Khiên Bảo mật An ninh mạng
 */
export function ShieldCheckIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

/**
 * Icon Mặt trời (light theme toggle)
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
 * Icon Trăng khuyết (dark theme toggle)
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
 * Icon Quả địa cầu Tọa độ (language switcher)
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

