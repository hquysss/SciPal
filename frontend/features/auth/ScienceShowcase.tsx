'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@scipal/hooks';

export function ScienceShowcase() {
  const { t } = useLanguage();
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const slides = [
    {
      id: 'informatics',
      subject: t({ en: 'Informatics 11', vi: 'Tin học 11' }),
      subjectIcon: '💻',
      badgeTerm: 'Algorithm · Thuật toán',
      badgeCode: 'O(log N) · Binary Search',
      title: t({
        en: 'Algorithmic Thinking & Problem Solving',
        vi: 'Tư duy Thuật toán & Cấu trúc Dữ liệu',
      }),
      description: t({
        en: 'Bilingual exploration of sorting algorithms, recursion, and computational complexity tailored for Vietnamese high school students.',
        vi: 'Khám phá song ngữ về thuật toán sắp xếp, đệ quy và độ phức tạp tính toán theo chuẩn chương trình Tin học THPT 2018.',
      }),
      bgGradient: 'from-emerald-900 via-teal-950 to-slate-950',
      accentColor: '#16a34a',
      accentTag: 'CS-THPT',
    },
    {
      id: 'physics',
      subject: t({ en: 'Physics 11', vi: 'Vật lý 11' }),
      subjectIcon: '⚡',
      badgeTerm: 'Wave Optics · Quang sóng',
      badgeCode: 'λ = v / f · Light Interference',
      title: t({
        en: 'Wave Mechanics & Electromagnetic Fields',
        vi: 'Dao động & Cơ học Sóng Điện từ',
      }),
      description: t({
        en: 'Interactive mathematical simulations bridging physical phenomena with rigorous bilingual scientific terminologies.',
        vi: 'Mô phỏng tương tác trực quan kết nối hiện tượng vật lý với hệ thống thuật ngữ chuẩn quốc tế Anh - Việt.',
      }),
      bgGradient: 'from-sky-950 via-indigo-950 to-slate-950',
      accentColor: '#0ea5e9',
      accentTag: 'PHY-THPT',
    },
    {
      id: 'chemistry',
      subject: t({ en: 'Chemistry 11', vi: 'Hóa học 11' }),
      subjectIcon: '⚗️',
      badgeTerm: 'Thermodynamics · Nhiệt động học',
      badgeCode: 'ΔH < 0 · Exothermic Reaction',
      title: t({
        en: 'Chemical Equilibrium & Molecular Bonds',
        vi: 'Cân bằng Hóa học & Năng lượng Liên kết',
      }),
      description: t({
        en: 'Structured bilingual flashcards and laboratory reaction models for deep comprehension and exam mastery.',
        vi: 'Hệ thống thẻ thuật ngữ song ngữ và mô hình phản ứng phòng thí nghiệm giúp học sâu và nắm vững kỳ thi.',
      }),
      bgGradient: 'from-amber-950 via-orange-950 to-slate-950',
      accentColor: '#f59e0b',
      accentTag: 'CHEM-THPT',
    },
  ];

  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [isPaused, slides.length]);

  const current = slides[activeSlide];

  return (
    <div
      className={`relative flex h-full min-h-[460px] lg:min-h-screen flex-col justify-between overflow-hidden rounded-3xl lg:rounded-none bg-gradient-to-br ${current.bgGradient} p-8 sm:p-12 lg:p-14 xl:p-16 text-white shadow-2xl lg:shadow-none transition-all duration-700`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      {/* Background Grid Pattern */}
      <div className="pointer-events-none absolute inset-0 bg-science-grid opacity-15" />

      {/* Ambient Radial Accent */}
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full opacity-20 blur-3xl transition-all duration-700"
        style={{ backgroundColor: current.accentColor }}
      />

      {/* Top Header / Eyebrow */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-sm backdrop-blur-xs">
            {current.subjectIcon}
          </span>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-300">
            SciPal · {current.subject}
          </span>
        </div>
        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 font-mono text-[11px] font-bold text-white/90 backdrop-blur-xs">
          {current.accentTag}
        </span>
      </div>

      {/* Center Editorial Content */}
      <div className="relative z-10 my-8 space-y-6">
        {/* Bilingual Concept Badge (Katha Style) */}
        <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-xs backdrop-blur-md">
          <span className="font-mono font-bold text-emerald-300">{current.badgeTerm}</span>
          <span className="text-white/40">|</span>
          <span className="font-mono text-white/80">{current.badgeCode}</span>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight tracking-tight text-white drop-shadow-xs">
            {current.title}
          </h2>
          <p className="max-w-md text-sm sm:text-base leading-relaxed text-white/80">
            {current.description}
          </p>
        </div>
      </div>

      {/* Bottom Controls & Archive Stamp */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/10 pt-6">
        {/* Interactive Dots Navigation */}
        <div className="flex items-center gap-2" role="tablist" aria-label="Slides">
          {slides.map((slide, idx) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={idx === activeSlide}
              aria-label={`Slide ${idx + 1}: ${slide.subject}`}
              onClick={() => setActiveSlide(idx)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                idx === activeSlide ? 'w-8 bg-emerald-400' : 'w-2.5 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>

        {/* Institutional Archive Stamp */}
        <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-white/50">
          VIETNAM NATURAL SCIENCES · ACADEMY 2026
        </p>
      </div>
    </div>
  );
}
