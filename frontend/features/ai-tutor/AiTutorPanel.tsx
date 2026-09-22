'use client';
import { useRef, useState, useEffect } from 'react';
import { useLanguage } from '@scipal/hooks';
import { useAiChat } from './useAiChat';

interface AiTutorPanelProps {
  lessonId: string;
  subjectSlug: string;
  token: string | null;
  onClose: () => void;
}

export function AiTutorPanel({ lessonId, subjectSlug, token, onClose }: AiTutorPanelProps) {
  const { lang } = useLanguage();
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
    <div className="fixed bottom-0 right-4 z-50 w-full max-w-sm rounded-t-2xl bg-white shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 rounded-t-2xl px-4 py-3"
        style={{ backgroundColor: 'var(--accent, #16a34a)' }}
      >
        <span className="text-xl" aria-hidden="true">🤖</span>
        <span className="font-semibold text-white text-sm">
          {lang === 'en' ? `AI Tutor · ${subjectSlug}` : `Gia sư AI · ${subjectSlug}`}
        </span>
        <button
          onClick={onClose}
          className="ml-auto text-white/80 hover:text-white p-1 rounded-full transition"
          aria-label="Đóng"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="h-72 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50/50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-xs text-gray-400 px-4">
            <span className="text-3xl mb-2">💡</span>
            <p>
              {lang === 'en'
                ? 'Ask anything about this lesson. The AI Tutor is here to help you learn!'
                : 'Hỏi bất kỳ điều gì về bài học này. Gia sư AI sẽ hướng dẫn từng bước!'}
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                m.role === 'user'
                  ? 'text-white font-medium'
                  : 'bg-white text-gray-800 shadow-xs border border-gray-100 leading-relaxed'
              }`}
              style={m.role === 'user' ? { backgroundColor: 'var(--accent, #16a34a)' } : {}}
            >
              {m.content || (loading && m.role === 'assistant' ? (
                <span className="inline-flex gap-1 animate-pulse">
                  <span>•</span><span>•</span><span>•</span>
                </span>
              ) : '')}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 border-t border-gray-100 px-3 py-2.5 bg-white">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={lang === 'en' ? 'Ask a question...' : 'Hỏi về bài học...'}
          className="flex-1 rounded-full border border-gray-200 px-4 py-1.5 text-sm outline-none focus:border-green-600 transition"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="rounded-full px-3.5 py-1.5 text-sm font-semibold text-white disabled:opacity-40 transition shadow-xs"
          style={{ backgroundColor: 'var(--accent, #16a34a)' }}
          aria-label="Gửi"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
