import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (c: { vi: string }) => c.vi }) }));

import { historyTurns, pcmToFloats, toBase64, micLevel } from './liveSession';
import { addWords, VoiceChat } from './VoiceChat';
import { TutorChatView } from '../TutorChat';

describe('voice audio', () => {
  it('reads 16-bit little-endian PCM back as samples', () => {
    const pcm = new Int16Array([0, 16384, -32768, 32767]);
    const floats = pcmToFloats(toBase64(pcm.buffer));
    expect(Array.from(floats)).toEqual([0, 0.5, -1, 32767 / 32768]);
  });
});

describe('voice transcript', () => {
  it('grows the current turn and starts a new line when the speaker or turn changes', () => {
    let lines = addWords([], 'student', ' Vòng lặp', true);
    lines = addWords(lines, 'student', ' là gì?', false);
    lines = addWords(lines, 'tutor', 'Em thử', false);
    lines = addWords(lines, 'tutor', 'Câu mới', true);
    expect(lines).toEqual([
      { who: 'student', text: 'Vòng lặp là gì?' },
      { who: 'tutor', text: 'Em thử' },
      { who: 'tutor', text: 'Câu mới' },
    ]);
  });
});

describe('TutorChatView microphone', () => {
  const base = { messages: [], streaming: false, remaining: 3, error: null, limitReached: false, level: 'upper_secondary' as const, onSend: () => {}, onStop: () => {}, onRetry: () => {} };
  it('offers voice only when the chat can start it', () => {
    expect(renderToStaticMarkup(<TutorChatView {...base} onVoice={() => {}} />)).toContain('aria-label="Nói chuyện với thầy"');
    expect(renderToStaticMarkup(<TutorChatView {...base} />)).not.toContain('Nói chuyện với thầy');
  });
});

describe('voice history', () => {
  it('replays the conversation to a new part as Live turns, skipping empty lines', () => {
    expect(historyTurns([{ who: 'student', text: ' Vòng lặp? ' }, { who: 'tutor', text: '' }, { who: 'tutor', text: 'Em thử nhé.' }])).toEqual([
      { role: 'user', parts: [{ text: 'Vòng lặp?' }] },
      { role: 'model', parts: [{ text: 'Em thử nhé.' }] },
    ]);
  });
});

describe('VoiceChat', () => {
  it('starts straight away, with no length to pick', () => {
    const html = renderToStaticMarkup(<VoiceChat onClose={() => {}} />);
    expect(html).toContain('Đang kết nối');
    expect(html).not.toContain('3 phút');
    expect(html).toContain('từng 2 phút');
  });

  it('always shows both clocks, the mute and end buttons, and a line to try', () => {
    const html = renderToStaticMarkup(<VoiceChat onClose={() => {}} />);
    expect(html).toContain('Đã nói');
    expect(html).toContain('Còn lại');
    expect(html).toContain('Tắt micro');
    expect(html).toContain('Kết thúc');
    expect(html).toContain('Thử nói');
  });
});

describe('micLevel', () => {
  it('is 0 for silence and grows with loudness, up to 1', () => {
    expect(micLevel(new Int16Array(160).buffer)).toBe(0);
    const quiet = micLevel(new Int16Array(160).fill(1000).buffer);
    const loud = micLevel(new Int16Array(160).fill(20000).buffer);
    expect(quiet).toBeGreaterThan(0);
    expect(loud).toBeGreaterThan(quiet);
    expect(loud).toBeLessThanOrEqual(1);
  });
});
