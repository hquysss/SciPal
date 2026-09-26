import React from 'react';

/**
 * Chuỗi Xoắn Kép ADN (DNA Double Helix)
 * Đại diện cho Sinh học phân tử & Di truyền học THPT.
 * Thiết kế uốn lượn hình sin với các liên kết cặp bazơ (A-T, G-C).
 */
export function ScienceDnaHelix({ className = '' }: { className?: string }) {
  // Chu kỳ xoắn theo trục Y từ 0 đến 600
  const helixSteps = [0, 80, 160, 240, 320, 400, 480, 560];

  return (
    <svg
      viewBox="0 0 100 640"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="dnaGlow" x1="0" y1="0" x2="100" y2="640" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" />
          <stop offset="50%" stopColor="currentColor" stopOpacity="0.4" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Sợi xoắn Alpha 1 (Trái qua phải) */}
      <path
        d="M20,0 Q80,40 50,80 Q20,120 50,160 Q80,200 50,240 Q20,280 50,320 Q80,360 50,400 Q20,440 50,480 Q80,520 50,560 Q20,600 50,640"
        stroke="url(#dnaGlow)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Sợi xoắn Beta 2 (Ngược pha) */}
      <path
        d="M80,0 Q20,40 50,80 Q80,120 50,160 Q20,200 50,240 Q80,280 50,320 Q20,360 50,400 Q80,440 50,480 Q20,520 50,560 Q80,600 50,640"
        stroke="url(#dnaGlow)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="4 2"
      />

      {/* Các bậc liên kết cặp bazơ (Base-pair rungs) */}
      {helixSteps.map((y, i) => {
        const isWide = i % 2 === 0;
        const x1 = isWide ? 22 : 38;
        const x2 = isWide ? 78 : 62;
        return (
          <g key={y} opacity="0.75">
            <line
              x1={x1}
              y1={y + 40}
              x2={x2}
              y2={y + 40}
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            {/* Nucleotide nodes */}
            <circle cx={x1} cy={y + 40} r="2.8" fill="currentColor" />
            <circle cx={x2} cy={y + 40} r="2.8" fill="currentColor" />
            <circle cx="50" cy={y + 40} r="1.5" fill="var(--surface)" fillOpacity="0.8" />
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Đồ Thị Cây Thuật Toán & Mạng Lưới Dữ Liệu (Algorithm Tree / Neural Topology)
 * Đại diện cho môn Tin học & Tư duy Tính toán THPT.
 */
export function ScienceAlgorithmTree({ className = '' }: { className?: string }) {
  const levels = [
    { y: 30, nodes: [50] },
    { y: 110, nodes: [28, 72] },
    { y: 190, nodes: [16, 40, 60, 84] },
    { y: 270, nodes: [26, 74] },
    { y: 350, nodes: [50] },
    { y: 430, nodes: [24, 76] },
    { y: 510, nodes: [14, 38, 62, 86] },
    { y: 590, nodes: [50] },
  ];

  return (
    <svg
      viewBox="0 0 100 640"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      {/* Đường truyền dữ liệu (Data pipelines) */}
      <path
        d="M50,30 L28,110 L16,190 L26,270 L50,350 L24,430 L14,510 L50,590"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeOpacity="0.4"
        strokeDasharray="3 3"
      />
      <path
        d="M50,30 L72,110 L84,190 L74,270 L50,350 L76,430 L86,510 L50,590"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeOpacity="0.4"
      />
      <path
        d="M28,110 L40,190 L26,270 M72,110 L60,190 L74,270 M24,430 L38,510 L50,590 M76,430 L62,510 L50,590"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.3"
      />

      {/* Các nút tính toán (Computation Nodes) */}
      {levels.map((lvl) =>
        lvl.nodes.map((x, idx) => (
          <g key={`${lvl.y}-${idx}`}>
            <circle
              cx={x}
              cy={lvl.y}
              r="3.5"
              fill="currentColor"
              fillOpacity="0.9"
            />
            <circle
              cx={x}
              cy={lvl.y}
              r="6.5"
              stroke="currentColor"
              strokeWidth="0.9"
              strokeOpacity="0.5"
            />
          </g>
        ))
      )}
    </svg>
  );
}
