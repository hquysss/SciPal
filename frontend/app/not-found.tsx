import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl border border-gray-200/80 bg-white p-8 text-center shadow-sm">
        <span className="text-5xl block mb-4" aria-hidden="true">🔬</span>
        <span className="font-mono text-xs font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-full">
          Mã lỗi 404
        </span>
        <h2 className="text-2xl font-black text-gray-900 mt-4 mb-2">
          Không tìm thấy trang
        </h2>
        <p className="text-xs text-gray-500 leading-relaxed mb-6">
          Trang bạn tìm kiếm không tồn tại hoặc đã được chuyển vị trí trong hệ thống học tập.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:scale-105 transition duration-150"
          style={{ backgroundColor: 'var(--scipal-green, #16a34a)' }}
        >
          <span>Trở về trang chủ</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
