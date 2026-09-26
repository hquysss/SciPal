'use client';
import { useRef, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { useAiChat } from './useAiChat';

interface AiTutorPanelProps {
  lessonId: string;
  subjectSlug: string;
  token: string | null;
  onClose: () => void;
}

export function AiTutorPanel({ lessonId, subjectSlug, token, onClose }: AiTutorPanelProps) {
  const { lang, t } = useLanguage();
  const { messages, loading, send } = useAiChat(lessonId, subjectSlug, token);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    send(input.trim(), lang);
    setInput('');
  };

  return (
    <div className="fixed bottom-0 right-4 z-50 flex w-full max-w-sm flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 rounded-t-2xl bg-action px-4 py-2 text-action-ink">
        <span className="text-xl" aria-hidden="true">🤖</span>
        <span className="text-sm font-semibold">
          {t({ en: `AI tutor · ${subjectSlug}`, vi: `Gia sư AI · ${subjectSlug}` })}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
          aria-label={t({ en: 'Close', vi: 'Đóng' })}
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="h-72 space-y-3 overflow-y-auto bg-surface-sunken px-4 py-3">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center text-sm text-ink-muted">
            <span className="mb-2 text-3xl" aria-hidden="true">💡</span>
            <p>
              {t({
                en: 'Ask anything about this lesson. The AI tutor is here to help you learn!',
                vi: 'Hỏi bất kỳ điều gì về bài học này. Gia sư AI sẽ hướng dẫn từng bước!',
              })}
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                m.role === 'user' ? 'bg-action font-medium text-action-ink' : 'bg-surface leading-relaxed text-ink'
              }`}
            >
              {m.content || (loading && m.role === 'assistant' ? (
                <span className="inline-flex gap-1 motion-safe:animate-pulse">
                  <span>•</span><span>•</span><span>•</span>
                </span>
              ) : '')}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 border-t border-line bg-surface px-3 py-2.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={t({ en: 'Ask a question…', vi: 'Hỏi về bài học…' })}
          aria-label={t({ en: 'Your question', vi: 'Câu hỏi của bạn' })}
          className="min-h-11 flex-1 rounded-full border border-edge bg-surface px-4 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="min-h-11 rounded-full bg-action px-4 text-sm font-semibold text-action-ink hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-40"
        >
          {t({ en: 'Send', vi: 'Gửi' })}
        </button>
      </div>
    </div>
  );
}
