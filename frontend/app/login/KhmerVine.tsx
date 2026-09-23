export function KhmerVine({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 600" fill="none" aria-hidden="true" className={className}>
      {[0, 120, 240, 360, 480].map((y) => (
        <g key={y} transform={`translate(0 ${y})`} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M60 120C60 96 20 92 24 62C28 34 74 40 72 65C70 82 47 82 45 68C43 58 54 53 60 60M60 120C60 102 101 91 96 59C93 38 72 25 60 0" />
          <path d="M60 7C42 25 32 29 33 46C48 45 61 32 60 7ZM92 49C98 29 94 18 87 9C86 29 68 35 78 49ZM27 74C12 69 7 53 12 39C16 54 37 52 27 74ZM60 108C77 102 85 91 82 79C70 84 59 91 60 108Z" fill="currentColor" fillOpacity=".12" />
          <path d="M60 8L43 38M88 22L84 40M16 50L24 65M76 87L64 101" opacity=".65" />
          <path d="M60 120C46 113 41 103 46 94C49 99 56 103 60 120ZM60 120C67 109 72 109 75 110C76 116 69 122 60 120Z" />
          <circle cx="60" cy="3" r="2" fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}
