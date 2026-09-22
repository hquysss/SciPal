'use client';

import { useState } from 'react';
import { postSurvey } from '@/lib/api';
import { useLanguage } from '@scipal/hooks';

interface SubjectDemandModalProps {
  open: boolean;
  onClose: () => void;
}

export function SubjectDemandModal({ open, onClose }: SubjectDemandModalProps) {
  const { lang, t } = useLanguage();
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [grade, setGrade] = useState<number>(10);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const toggleSubject = (s: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const handleSubmit = async () => {
    if (selectedSubjects.length === 0) return;
    setLoading(true);

    try {
      await postSurvey({
        type: 'demand',
        payload: { subjects: selectedSubjects, grade },
      });
    } catch (err) {
      console.warn('Subject demand survey warning:', err);
    } finally {
      setSubmitted(true);
      setLoading(false);
      setTimeout(onClose, 2200);
    }
  };

  const subjectOptions = [
    { id: 'math', vi: 'Toán học', en: 'Mathematics', icon: '📐' },
    { id: 'physics', vi: 'Vật lí', en: 'Physics', icon: '⚡' },
    { id: 'chemistry', vi: 'Hóa học', en: 'Chemistry', icon: '🧪' },
    { id: 'biology', vi: 'Sinh học', en: 'Biology', icon: '🧬' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 sm:p-8 shadow-2xl dark:border-gray-800 dark:bg-card">
        {submitted ? (
          <div className="py-6 text-center space-y-2 animate-in fade-in zoom-in-95 duration-150">
            <span className="text-4xl">🌟</span>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">
              {t({ en: 'Vote Recorded!', vi: 'Ghi nhận bình chọn thành công!' })}
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              {t({
                en: 'SciPal will prioritize expanding lessons for the subjects you selected.',
                vi: 'SciPal sẽ ưu tiên đẩy nhanh tốc độ biên soạn cho các môn học bạn đã bình chọn.',
              })}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                  Khảo sát nhu cầu (§9.7)
                </span>
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  {t({ en: 'Which subject do you want next?', vi: 'Bạn muốn học môn nào tiếp theo?' })}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-8 w-8 rounded-full text-sm font-bold text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {t({
                en: 'Vote for natural science subjects you want SciPal to launch next. Your voice directly guides content prioritization!',
                vi: 'Bình chọn môn KHTN bạn muốn SciPal ra mắt nội dung tiếp theo. Ý kiến của bạn quyết định trực tiếp lộ trình biên soạn!',
              })}
            </p>

            {/* Subject Choices */}
            <div className="grid grid-cols-2 gap-2.5">
              {subjectOptions.map((subj) => {
                const isSelected = selectedSubjects.includes(subj.id);
                return (
                  <button
                    key={subj.id}
                    type="button"
                    onClick={() => toggleSubject(subj.id)}
                    className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left font-bold text-xs transition duration-150 active:scale-95 ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-100'
                        : 'border-gray-200 bg-gray-50/60 text-gray-700 hover:border-gray-300 hover:bg-gray-100/80 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-300'
                    }`}
                  >
                    <span className="text-lg">{subj.icon}</span>
                    <span>{lang === 'en' ? subj.en : subj.vi}</span>
                  </button>
                );
              })}
            </div>

            {/* Grade Selection */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                {t({ en: 'Grade Level', vi: 'Khối lớp của bạn' })}:
              </span>
              <div className="flex gap-2">
                {[10, 11, 12].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGrade(g)}
                    className={`h-8 w-8 rounded-xl font-mono text-xs font-bold transition active:scale-95 ${
                      grade === g
                        ? 'bg-gray-900 text-white shadow-xs dark:bg-white dark:text-gray-900'
                        : 'border border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 transition dark:hover:bg-gray-800"
              >
                {t({ en: 'Later', vi: 'Để sau' })}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || selectedSubjects.length === 0}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition disabled:opacity-50"
              >
                {loading
                  ? t({ en: 'Submitting...', vi: 'Đang gửi...' })
                  : t({ en: 'Submit Vote', vi: 'Gửi bình chọn' })}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
