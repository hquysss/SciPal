import Link from 'next/link';
import { SubjectGrid } from '@/features/subjects/SubjectGrid';

export default function HomePage() {
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid pb-20">
      {/* Background ambient radial glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-96 opacity-30"
        style={{
          background:
            'radial-gradient(circle at 50% 10%, var(--scipal-green, #16a34a) 0%, transparent 65%)',
        }}
      />

      <main className="relative mx-auto max-w-6xl px-4 pt-12 sm:px-6 lg:pt-16">
        {/* Hero */}
        <section className="mb-14 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-600/20 bg-emerald-50/80 px-3 py-1 mb-6 text-xs font-semibold text-emerald-800 backdrop-blur-xs">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Nền tảng học tập khoa học tự nhiên THPT</span>
          </div>

          <h1 className="text-4xl font-black tracking-tight text-gray-950 sm:text-6xl leading-[1.15]">
            Học khoa học tự nhiên
            <br />
            <span
              className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"
            >
              không khó như bạn nghĩ
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Hệ thống bài học chuẩn chương trình GDPT song ngữ (Anh – Việt), kết hợp mô phỏng tương tác và Gia sư AI đồng hành 24/7.
          </p>

          {/* Quick CTA banner */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/informatics"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-md hover:scale-105 active:scale-95 transition duration-150"
              style={{ backgroundColor: 'var(--scipal-green, #16a34a)' }}
            >
              <span>Trải nghiệm môn Tin học</span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/glossary"
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white/80 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-white hover:border-gray-400 transition backdrop-blur-xs"
            >
              <span>Tra từ điển thuật ngữ</span>
            </Link>
          </div>
        </section>

        {/* Feature Highlights Ribbon */}
        <section className="mb-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 rounded-2xl border border-gray-200/80 bg-white/90 p-5 shadow-xs backdrop-blur-xs">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-700">
              🌐
            </span>
            <div>
              <h4 className="text-sm font-bold text-gray-900">Song ngữ First-Class</h4>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                Chuyển đổi tức thời tiếng Anh và tiếng Việt cho mọi bài giảng, công thức và bài tập.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-gray-200/80 bg-white/90 p-5 shadow-xs backdrop-blur-xs">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-700">
              🤖
            </span>
            <div>
              <h4 className="text-sm font-bold text-gray-900">Gia sư AI đồng hành</h4>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                Giải đáp thắc mắc chuyên sâu, gợi ý tư duy từng bước mà không tiết lộ đáp án ngay.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-gray-200/80 bg-white/90 p-5 shadow-xs backdrop-blur-xs">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-xl text-purple-700">
              📈
            </span>
            <div>
              <h4 className="text-sm font-bold text-gray-900">Theo dõi tiến trình</h4>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                Tích lũy điểm kinh nghiệm XP, duy trì chuỗi học liên tục streak và mở khóa huy hiệu danh giá.
              </p>
            </div>
          </div>
        </section>

        {/* Subject Grid Section */}
        <section className="mb-16">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Các môn học tự nhiên
              </h2>
              <p className="text-xs text-gray-500 font-mono mt-1">
                Chọn môn học để khám phá các chủ đề kiến thức & bài giảng tương tác
              </p>
            </div>
          </div>

          <SubjectGrid />
        </section>
      </main>
    </div>
  );
}
