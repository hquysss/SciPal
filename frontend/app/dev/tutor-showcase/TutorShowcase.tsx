'use client';

import { useState } from 'react';
import { ConversationList } from '@/features/ai-tutor/ConversationList';
import { LessonPicker } from '@/features/ai-tutor/LessonPicker';
import { VoiceChat } from '@/features/ai-tutor/voice/VoiceChat';
import { TutorChatView } from '@/features/ai-tutor/TutorChat';
import { TutorChatFrame, TutorListFrame } from '@/features/ai-tutor/TutorPage';
import type { TutorMessage } from '@/features/ai-tutor/api';

const FENCE = '`'.repeat(3);

const LESSONS = [
  { id: 'l1', title_vi: 'Vòng lặp for', title_en: 'For loops', grade: 10, subject_id: 's1', subject_name_vi: 'Tin học', subject_name_en: 'Informatics' },
  { id: 'l2', title_vi: 'Tìm kiếm nhị phân', title_en: 'Binary search', grade: 11, subject_id: 's1', subject_name_vi: 'Tin học', subject_name_en: 'Informatics' },
  { id: 'l3', title_vi: 'Dao động điều hòa', title_en: 'Simple harmonic motion', grade: 11, subject_id: 's2', subject_name_vi: 'Vật lí', subject_name_en: 'Physics' },
];

const CONVERSATIONS = [
  { id: 'c1', title: 'Vì sao vòng lặp while của em chạy mãi không dừng?', lesson_id: null, updated_at: '2026-09-28T08:00:00Z' },
  { id: 'c2', title: 'Tìm kiếm nhị phân bắt đầu từ đâu', lesson_id: 'l2', updated_at: '2026-09-27T08:00:00Z' },
  { id: 'c3', title: 'Độ phức tạp O(n log n)', lesson_id: null, updated_at: '2026-09-25T08:00:00Z' },
];

const CHAT: TutorMessage[] = [
  { role: 'user', content: 'Code em in ra 0 1 2 3 4 chứ không ra 1 2 3 4 5, sai ở đâu ạ?\n\nfor i in range(5):\n    print(i)' },
  {
    role: 'assistant',
    content: `Em đang nghĩ \`range(5)\` chạy từ **1 tới 5** đúng không? Thật ra nó bắt đầu từ 0.\n\nEm thử in thêm giá trị \`i\` ở vòng đầu tiên xem:\n\n${FENCE}python\nfor i in range(5):\n    print("vòng", i)\n${FENCE}\n\nNếu dãy có $n$ số thì \`range(n)\` cho $0, 1, \\dots, n-1$. Em thấy nó dừng ở số mấy?`,
  },
  { role: 'user', content: 'Dừng ở 4 ạ. Vậy phải là range(1, 6)?' },
  { role: 'assistant', content: 'Đúng rồi! Em đã tự nhận ra `range` **dừng trước** số cuối. Kiểm tra nhanh: `range(2, 5)` sẽ cho những số nào?' },
];

const noop = () => {};

export function TutorShowcase({ view }: { view: string }) {
  const [picked, setPicked] = useState<string | null>(view === 'picker' ? 'l2' : null);
  const base = { level: 'upper_secondary' as const, onSend: noop, onStop: noop, onRetry: noop, remaining: 27, error: null, limitReached: false, streaming: false };

  // The spoken panel over the page (it tries to connect, so without a backend it ends with an error).
  if (view === 'voice') return <VoiceChat onClose={noop} />;

  if (view === 'list') {
    return (
      <div className="max-w-xs">
        <ConversationList conversations={CONVERSATIONS} activeId="c1" onOpen={noop} onNew={noop} onDelete={noop} />
      </div>
    );
  }

  const chat =
    view === 'empty' || view === 'picker' ? (
      <TutorChatView {...base} messages={[]} lessonTitle={view === 'picker' ? LESSONS.find((l) => l.id === picked)?.title_vi : undefined} picker={<LessonPicker lessons={LESSONS} value={picked} onChange={setPicked} />} />
    ) : view === 'streaming' ? (
      <TutorChatView {...base} streaming messages={[...CHAT.slice(0, 1), { role: 'assistant', content: 'Em đang nghĩ `range(5)` chạy từ **1 tới 5** đúng' }]} />
    ) : view === 'error' ? (
      <TutorChatView {...base} error={{ vi: 'Gia sư đang bận. Hãy thử lại sau ít phút.', en: 'The tutor is busy. Try again in a few minutes.' }} messages={CHAT.slice(0, 1)} />
    ) : view === 'limit' ? (
      <TutorChatView {...base} remaining={0} limitReached error={{ vi: 'Em đã hết lượt hỏi hôm nay. Lượt mới có lúc 0 giờ.', en: 'You have used today’s questions.' }} messages={CHAT} />
    ) : (
      <TutorChatView {...base} lessonTitle="Vòng lặp for" messages={CHAT} />
    );

  return (
    <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-6">
      <TutorListFrame>
        <ConversationList conversations={CONVERSATIONS} activeId="c1" onOpen={noop} onNew={noop} onDelete={noop} />
      </TutorListFrame>
      <TutorChatFrame>{chat}</TutorChatFrame>
    </div>
  );
}
