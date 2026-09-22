'use client';
import { useState, useCallback } from 'react';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function useAiChat(lessonId: string, subjectSlug: string, token: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

  const send = useCallback(async (text: string, lang: 'en' | 'vi') => {
    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          lesson_id: lessonId,
          messages: [...messages, userMsg],
          subject_slug: subjectSlug,
          language: lang,
        }),
      });

      if (!res.ok || !res.body) {
        setLoading(false);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              lang === 'en'
                ? 'Sorry, unable to connect to AI Tutor right now.'
                : 'Xin lỗi, hiện không thể kết nối với Gia sư AI. Vui lòng thử lại sau.',
          },
        ]);
        return;
      }

      // Stream SSE
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
          return updated;
        });
      }
    } catch (err) {
      console.error('AI chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            lang === 'en'
              ? 'Connection error. Please check your network.'
              : 'Lỗi kết nối mạng. Vui lòng kiểm tra lại đường truyền.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, lessonId, subjectSlug, token, API_BASE]);

  return { messages, loading, send };
}
