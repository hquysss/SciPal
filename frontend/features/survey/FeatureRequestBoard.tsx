'use client';

import { useState } from 'react';
import { postSurvey } from '@/lib/api';
import { useLanguage } from '@scipal/hooks';

interface FeatureItem {
  id: string;
  title_vi: string;
  title_en: string;
  votes: number;
  category: string;
}

const INITIAL_FEATURES: FeatureItem[] = [
  {
    id: 'f1',
    title_vi: 'Mô phỏng 3D tương tác cấu trúc phân tử Hóa học',
    title_en: 'Interactive 3D Molecular Simulation for Chemistry',
    votes: 42,
    category: 'Mô phỏng 3D',
  },
  {
    id: 'f2',
    title_vi: 'Trình giả lập mạch điện & dao động Vật lí',
    title_en: 'Physics Electric Circuit & Oscillation Simulator',
    votes: 38,
    category: 'Thí nghiệm ảo',
  },
  {
    id: 'f3',
    title_vi: 'Đấu trường thi đấu giải thuật Tin học 1v1 trực tiếp',
    title_en: 'Real-time 1v1 Algorithm Duel Arena',
    votes: 56,
    category: 'Gamification',
  },
];

export function FeatureRequestBoard() {
  const { lang, t } = useLanguage();
  const [features, setFeatures] = useState<FeatureItem[]>(INITIAL_FEATURES);
  const [votedIds, setVotedIds] = useState<string[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState(false);

  const handleVote = async (id: string) => {
    if (votedIds.includes(id)) return;
    setVotedIds((prev) => [...prev, id]);
    setFeatures((prev) =>
      prev.map((f) => (f.id === id ? { ...f, votes: f.votes + 1 } : f)),
    );

    try {
      await postSurvey({
        type: 'feature_request',
        payload: { action: 'upvote', feature_id: id },
      });
    } catch {}
  };

  const handleSuggest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSubmitting(true);
    const newItem: FeatureItem = {
      id: `f-${Date.now()}`,
      title_vi: newTitle.trim(),
      title_en: newTitle.trim(),
      votes: 1,
      category: 'Đề xuất mới',
    };

    try {
      await postSurvey({
        type: 'feature_request',
        payload: { action: 'create', title: newTitle.trim() },
      });
    } catch {}

    setFeatures((prev) => [newItem, ...prev]);
    setVotedIds((prev) => [...prev, newItem.id]);
    setNewTitle('');
    setSubmitting(false);
    setSubmittedMessage(true);
    setTimeout(() => setSubmittedMessage(false), 3000);
  };

  return (
    <div className="rounded-3xl border border-gray-200/80 bg-white/90 p-6 sm:p-8 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-card/90 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
        <div>
          <span className="font-mono text-xs font-bold uppercase text-purple-700 dark:text-purple-300">
            Cộng đồng SciPal (§9.7)
          </span>
          <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
            {t({ en: 'Feature Requests & Innovation Board', vi: 'Bảng đề xuất & Bình chọn tính năng mới' })}
          </h3>
        </div>
        <span className="font-mono text-xs text-purple-700 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-300 px-2.5 py-1 rounded-full font-bold">
          S12
        </span>
      </div>

      {/* Feature List */}
      <div className="space-y-3">
        {features.map((item) => {
          const hasVoted = votedIds.includes(item.id);
          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200/80 bg-gray-50/50 p-4 transition hover:border-purple-200 hover:bg-white dark:border-gray-800 dark:bg-card/60"
            >
              <div className="space-y-1">
                <span className="rounded-full bg-purple-100 px-2 py-0.5 font-mono text-[10px] font-bold text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                  {item.category}
                </span>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  {lang === 'en' ? item.title_en : item.title_vi}
                </h4>
              </div>

              <button
                type="button"
                onClick={() => handleVote(item.id)}
                disabled={hasVoted}
                className={`flex flex-col items-center justify-center rounded-2xl border px-3.5 py-2 font-mono transition duration-150 active:scale-95 ${
                  hasVoted
                    ? 'border-purple-300 bg-purple-50 text-purple-800 font-black dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-purple-400 hover:text-purple-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                <span className="text-xs">▲</span>
                <span className="text-xs font-bold">{item.votes}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Suggest New Feature Form */}
      <form onSubmit={handleSuggest} className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-3">
        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
          {t({
            en: 'Have an idea? Suggest a tool or simulation to SciPal engineers:',
            vi: 'Bạn có ý tưởng mới? Đề xuất công cụ hoặc bài học cho đội ngũ SciPal:',
          })}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            required
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Ví dụ: Giả lập thuật toán Dijkstra với bản đồ giao thông..."
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50/60 px-3.5 py-2 text-xs outline-none focus:border-purple-600 focus:bg-white transition dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <button
            type="submit"
            disabled={submitting || !newTitle.trim()}
            className="rounded-xl bg-purple-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-800 active:scale-95 transition disabled:opacity-50"
          >
            {submitting ? 'Đang gửi...' : 'Gửi đề xuất'}
          </button>
        </div>
        {submittedMessage && (
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            ✓ Cảm ơn ý tưởng của bạn! Đề xuất đã được đưa lên bảng bình chọn cộng đồng.
          </p>
        )}
      </form>
    </div>
  );
}
