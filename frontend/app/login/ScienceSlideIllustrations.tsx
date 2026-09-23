import React from 'react';

/**
 * Slide 1: Tin học — Thuật toán & Cấu trúc dữ liệu
 */
export function InformaticsSlideGraphic() {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <svg
        viewBox="0 0 600 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-105"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="infGrad" x1="0" y1="0" x2="600" y2="360" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#064e3b" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#0f766e" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#022c22" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="barGlow" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>

        {/* Ambient Grid */}
        <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(52, 211, 153, 0.08)" strokeWidth="0.8" />
        </pattern>
        <rect width="600" height="360" fill="url(#smallGrid)" />

        {/* Sorting Bars Visualization */}
        <g transform="translate(70, 160)" opacity="0.85">
          <rect x="0" y="40" width="16" height="80" rx="4" fill="url(#barGlow)" opacity="0.5" />
          <rect x="26" y="20" width="16" height="100" rx="4" fill="url(#barGlow)" opacity="0.6" />
          <rect x="52" y="60" width="16" height="60" rx="4" fill="url(#barGlow)" opacity="0.4" />
          <rect x="78" y="0" width="16" height="120" rx="4" fill="#6ee7b7" />
          <rect x="104" y="30" width="16" height="90" rx="4" fill="url(#barGlow)" opacity="0.6" />
          <rect x="130" y="10" width="16" height="110" rx="4" fill="url(#barGlow)" opacity="0.7" />
          <rect x="156" y="50" width="16" height="70" rx="4" fill="url(#barGlow)" opacity="0.5" />
        </g>

        {/* Binary Tree Structure */}
        <g transform="translate(360, 60)">
          {/* Edges */}
          <line x1="100" y1="30" x2="50" y2="90" stroke="#34d399" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
          <line x1="100" y1="30" x2="150" y2="90" stroke="#34d399" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
          <line x1="50" y1="90" x2="20" y2="150" stroke="#34d399" strokeWidth="1.5" opacity="0.4" />
          <line x1="50" y1="90" x2="80" y2="150" stroke="#34d399" strokeWidth="1.5" opacity="0.4" />
          <line x1="150" y1="90" x2="120" y2="150" stroke="#34d399" strokeWidth="1.5" opacity="0.4" />
          <line x1="150" y1="90" x2="180" y2="150" stroke="#34d399" strokeWidth="1.5" opacity="0.4" />

          {/* Root node */}
          <circle cx="100" cy="30" r="18" fill="#065f46" stroke="#34d399" strokeWidth="2.5" />
          <text x="100" y="35" textAnchor="middle" fill="#ecfdf5" fontSize="12" fontFamily="monospace" fontWeight="bold">50</text>

          {/* Level 1 */}
          <circle cx="50" cy="90" r="15" fill="#047857" stroke="#34d399" strokeWidth="2" />
          <text x="50" y="94" textAnchor="middle" fill="#ecfdf5" fontSize="11" fontFamily="monospace" fontWeight="bold">25</text>
          <circle cx="150" cy="90" r="15" fill="#047857" stroke="#34d399" strokeWidth="2" />
          <text x="150" y="94" textAnchor="middle" fill="#ecfdf5" fontSize="11" fontFamily="monospace" fontWeight="bold">75</text>

          {/* Level 2 */}
          <circle cx="20" cy="150" r="12" fill="#064e3b" stroke="#6ee7b7" strokeWidth="1.5" />
          <text x="20" y="154" textAnchor="middle" fill="#a7f3d0" fontSize="10" fontFamily="monospace">12</text>
          <circle cx="80" cy="150" r="12" fill="#064e3b" stroke="#6ee7b7" strokeWidth="1.5" />
          <text x="80" y="154" textAnchor="middle" fill="#a7f3d0" fontSize="10" fontFamily="monospace">37</text>
          <circle cx="120" cy="150" r="12" fill="#064e3b" stroke="#6ee7b7" strokeWidth="1.5" />
          <text x="120" y="154" textAnchor="middle" fill="#a7f3d0" fontSize="10" fontFamily="monospace">62</text>
          <circle cx="180" cy="150" r="12" fill="#064e3b" stroke="#6ee7b7" strokeWidth="1.5" />
          <text x="180" y="154" textAnchor="middle" fill="#a7f3d0" fontSize="10" fontFamily="monospace">88</text>
        </g>

        {/* Algorithm Code Hint */}
        <g transform="translate(60, 45)" opacity="0.7">
          <rect width="180" height="70" rx="8" fill="#022c22" stroke="rgba(52, 211, 153, 0.3)" strokeWidth="1" />
          <text x="14" y="24" fill="#a7f3d0" fontSize="10" fontFamily="monospace">def binary_search(arr, x):</text>
          <text x="24" y="40" fill="#6ee7b7" fontSize="10" fontFamily="monospace">mid = (low + high) // 2</text>
          <text x="24" y="56" fill="#34d399" fontSize="10" fontFamily="monospace">return mid if arr[mid] == x</text>
        </g>
      </svg>
    </div>
  );
}

/**
 * Slide 2: Vật lý — Dao động & Cơ học Sóng điện từ
 */
export function PhysicsSlideGraphic() {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <svg
        viewBox="0 0 600 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-105"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="waveGlow" x1="0" y1="0" x2="600" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>

        {/* Harmonic Sine Waves */}
        <path
          d="M 20 180 Q 80 80, 140 180 T 260 180 T 380 180 T 500 180 T 600 180"
          stroke="url(#waveGlow)"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 20 180 Q 80 260, 140 180 T 260 180 T 380 180 T 500 180 T 600 180"
          stroke="#38bdf8"
          strokeWidth="1.8"
          strokeDasharray="6 4"
          fill="none"
          opacity="0.6"
        />

        {/* Center Axis */}
        <line x1="20" y1="180" x2="580" y2="180" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3 3" />

        {/* Interference Circles */}
        <g transform="translate(180, 180)">
          <circle cx="0" cy="0" r="40" stroke="#38bdf8" strokeWidth="1" opacity="0.3" fill="none" />
          <circle cx="0" cy="0" r="70" stroke="#818cf8" strokeWidth="1" opacity="0.2" fill="none" />
          <circle cx="0" cy="0" r="100" stroke="#c084fc" strokeWidth="1" opacity="0.1" fill="none" />
          <circle cx="0" cy="0" r="6" fill="#38bdf8" />
        </g>
        <g transform="translate(420, 180)">
          <circle cx="0" cy="0" r="40" stroke="#38bdf8" strokeWidth="1" opacity="0.3" fill="none" />
          <circle cx="0" cy="0" r="70" stroke="#818cf8" strokeWidth="1" opacity="0.2" fill="none" />
          <circle cx="0" cy="0" r="100" stroke="#c084fc" strokeWidth="1" opacity="0.1" fill="none" />
          <circle cx="0" cy="0" r="6" fill="#c084fc" />
        </g>

        {/* Physical Formula Badge */}
        <g transform="translate(380, 50)" opacity="0.8">
          <rect width="180" height="54" rx="8" fill="#082f49" stroke="rgba(56, 189, 248, 0.4)" strokeWidth="1" />
          <text x="90" y="24" textAnchor="middle" fill="#bae6fd" fontSize="12" fontFamily="serif" fontStyle="italic">λ = v / f = 2π / k</text>
          <text x="90" y="42" textAnchor="middle" fill="#7dd3fc" fontSize="10" fontFamily="sans-serif">λ = 650 nm · Giao thoa sóng</text>
        </g>
      </svg>
    </div>
  );
}

/**
 * Slide 3: Hóa học — Cân bằng & Nhiệt động học Phân tử
 */
export function ChemistrySlideGraphic() {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <svg
        viewBox="0 0 600 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-105"
        aria-hidden="true"
      >
        {/* Hexagonal Lattice */}
        <g transform="translate(180, 90)" stroke="#fbbf24" strokeWidth="2" fill="rgba(245, 158, 11, 0.08)">
          <polygon points="60,0 120,35 120,105 60,140 0,105 0,35" />
          <circle cx="60" cy="70" r="32" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3" fill="none" />
          <circle cx="0" cy="35" r="7" fill="#fbbf24" stroke="#78350f" strokeWidth="2" />
          <circle cx="60" cy="0" r="7" fill="#fbbf24" stroke="#78350f" strokeWidth="2" />
          <circle cx="120" cy="35" r="7" fill="#fbbf24" stroke="#78350f" strokeWidth="2" />
          <circle cx="120" cy="105" r="7" fill="#fbbf24" stroke="#78350f" strokeWidth="2" />
          <circle cx="60" cy="140" r="7" fill="#fbbf24" stroke="#78350f" strokeWidth="2" />
          <circle cx="0" cy="105" r="7" fill="#fbbf24" stroke="#78350f" strokeWidth="2" />
        </g>

        {/* Secondary ring */}
        <g transform="translate(300, 90)" stroke="#f59e0b" strokeWidth="1.8" fill="rgba(217, 119, 6, 0.06)" opacity="0.8">
          <polygon points="60,0 120,35 120,105 60,140 0,105 0,35" />
          <circle cx="60" cy="70" r="28" stroke="#d97706" strokeWidth="1.2" strokeDasharray="3 3" fill="none" />
          <circle cx="60" cy="0" r="6" fill="#fcd34d" />
          <circle cx="120" cy="35" r="6" fill="#fcd34d" />
          <circle cx="120" cy="105" r="6" fill="#fcd34d" />
          <circle cx="60" cy="140" r="6" fill="#fcd34d" />
        </g>

        {/* Reaction Formula Box */}
        <g transform="translate(60, 230)" opacity="0.85">
          <rect width="210" height="56" rx="8" fill="#451a03" stroke="rgba(245, 158, 11, 0.4)" strokeWidth="1" />
          <text x="105" y="25" textAnchor="middle" fill="#fde68a" fontSize="12" fontFamily="serif">ΔG = ΔH - T·ΔS &lt; 0</text>
          <text x="105" y="43" textAnchor="middle" fill="#fcd34d" fontSize="10" fontFamily="sans-serif">Phản ứng tự diễn biến ở T cao</text>
        </g>
      </svg>
    </div>
  );
}
