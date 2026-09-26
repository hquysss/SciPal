'use client';

import { useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { postSurvey } from '../../lib/api';
import { Alert } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/empty-state';
import { Field } from '../../components/ui/field';
import { Input } from '../../components/ui/input';

interface FeatureItem {
  id: string;
  title_vi: string;
  title_en: string;
  votes: number;
  category: { en: string; vi: string };
}

const INITIAL_FEATURES: FeatureItem[] = [
  {
    id: 'f1',
    title_vi: 'Mô phỏng 3D tương tác cấu trúc phân tử Hóa học',
    title_en: 'Interactive 3D molecular simulation for Chemistry',
    votes: 42,
    category: { en: '3D simulation', vi: 'Mô phỏng 3D' },
  },
  {
    id: 'f2',
    title_vi: 'Trình giả lập mạch điện & dao động Vật lí',
    title_en: 'Physics electric circuit & oscillation simulator',
    votes: 38,
    category: { en: 'Virtual lab', vi: 'Thí nghiệm ảo' },
  },
  {
    id: 'f3',
    title_vi: 'Đấu trường thi đấu giải thuật Tin học 1v1 trực tiếp',
    title_en: 'Real-time 1v1 algorithm duel arena',
    votes: 56,
    category: { en: 'Gamification', vi: 'Trò chơi hoá' },
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
      category: { en: 'New idea', vi: 'Đề xuất mới' },
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
    <section className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-6 sm:p-8">
      <div className="border-b border-line pb-4">
        <p className="text-sm font-semibold text-ink-muted">{t({ en: 'SciPal community', vi: 'Cộng đồng SciPal' })}</p>
        <h2 className="text-lg font-bold text-ink">
          {t({ en: 'Feature requests', vi: 'Bảng đề xuất & bình chọn tính năng mới' })}
        </h2>
      </div>

      {features.length === 0 ? (
        <EmptyState
          title={t({ en: 'No ideas yet', vi: 'Chưa có đề xuất' })}
          description={t({ en: 'Be the first to suggest a tool or lesson.', vi: 'Hãy là người đầu tiên đề xuất công cụ hoặc bài học.' })}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {features.map((item) => {
            const hasVoted = votedIds.includes(item.id);
            const title = lang === 'en' ? item.title_en : item.title_vi;
            return (
              <li key={item.id} className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface-sunken p-4">
                <div className="flex flex-col gap-1">
                  <span className="w-fit rounded-md bg-surface px-2 py-0.5 text-sm text-ink-muted">{t(item.category)}</span>
                  <h3 className="text-sm font-bold text-ink">{title}</h3>
                </div>

                <button
                  type="button"
                  onClick={() => handleVote(item.id)}
                  aria-pressed={hasVoted}
                  aria-label={t({
                    en: `${hasVoted ? 'Voted' : 'Vote'} for "${title}", ${item.votes} votes`,
                    vi: `${hasVoted ? 'Đã bình chọn' : 'Bình chọn'} "${title}", ${item.votes} phiếu`,
                  })}
                  className={`flex min-h-11 min-w-16 shrink-0 flex-col items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-bold tabular-nums transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                    hasVoted ? 'border-action bg-action text-action-ink' : 'border-edge bg-surface text-ink hover:bg-surface-sunken'
                  }`}
                >
                  <ChevronUp aria-hidden="true" className="h-4 w-4" />
                  <span aria-hidden="true">{item.votes}</span>
                  <span aria-hidden="true" className="text-xs font-semibold">
                    {hasVoted ? t({ en: 'Voted', vi: 'Đã chọn' }) : t({ en: 'votes', vi: 'phiếu' })}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Suggest New Feature Form */}
      <form onSubmit={handleSuggest} className="flex flex-col gap-3 border-t border-line pt-4">
        <Field
          id="feature-idea"
          label={t({
            en: 'Have an idea? Suggest a tool or lesson to the SciPal team',
            vi: 'Bạn có ý tưởng mới? Đề xuất công cụ hoặc bài học cho đội ngũ SciPal',
          })}
        >
          {(control) => (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                {...control}
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={t({
                  en: 'e.g. Dijkstra simulator on a traffic map…',
                  vi: 'Ví dụ: giả lập thuật toán Dijkstra với bản đồ giao thông…',
                })}
                className="flex-1"
              />
              <Button type="submit" disabled={submitting || !newTitle.trim()}>
                {submitting ? t({ en: 'Sending…', vi: 'Đang gửi…' }) : t({ en: 'Send idea', vi: 'Gửi đề xuất' })}
              </Button>
            </div>
          )}
        </Field>
        {submittedMessage && (
          <Alert tone="success">
            {t({
              en: 'Thanks for your idea! It is now on the community board.',
              vi: 'Cảm ơn ý tưởng của bạn! Đề xuất đã được đưa lên bảng bình chọn cộng đồng.',
            })}
          </Alert>
        )}
      </form>
    </section>
  );
}
