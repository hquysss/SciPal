import { describe, expect, it } from 'vitest';
import { createSseParser, type TutorEvent } from './streamTutor';

describe('createSseParser', () => {
  it('handles events split across chunks and several events in one chunk', () => {
    const seen: TutorEvent[] = [];
    const feed = createSseParser((e) => seen.push(e));
    feed('event: meta\ndata: {"conversation_id":"c1","remai');
    feed('ning":4}\n\nevent: delta\ndata: {"text":"Gợi"}\n\nevent: delta\ndata: {"text":" ý"}\n\n');
    feed('event: done\ndata: {}\n\n');
    expect(seen).toEqual([
      { event: 'meta', conversation_id: 'c1', remaining: 4, period: 'day' },
      { event: 'delta', text: 'Gợi' },
      { event: 'delta', text: ' ý' },
      { event: 'done' },
    ]);
  });

  it('turns a server error event into a bilingual error and ignores junk', () => {
    const seen: TutorEvent[] = [];
    const feed = createSseParser((e) => seen.push(e));
    feed(': ping\n\nevent: error\ndata: {"error":"Bận","error_en":"Busy"}\n\nevent: delta\ndata: not-json\n\n');
    expect(seen).toEqual([{ event: 'error', error: { vi: 'Bận', en: 'Busy' } }]);
  });

  it('passes on the refunded count and a removed conversation with an error', () => {
    const seen: TutorEvent[] = [];
    const feed = createSseParser((e) => seen.push(e));
    feed('event: error\ndata: {"error":"Quá tải","error_en":"Overloaded","remaining":27,"conversation_removed":true}\n\n');
    expect(seen).toEqual([{ event: 'error', error: { vi: 'Quá tải', en: 'Overloaded' }, remaining: 27, conversationRemoved: true }]);
  });

  it('reads the period of the count, and no count at all for admins', () => {
    const seen: TutorEvent[] = [];
    const feed = createSseParser((e) => seen.push(e));
    feed('event: meta\ndata: {"conversation_id":"c1","remaining":3,"period":"month"}\n\nevent: meta\ndata: {"conversation_id":"c2","remaining":null,"period":null}\n\n');
    expect(seen).toEqual([
      { event: 'meta', conversation_id: 'c1', remaining: 3, period: 'month' },
      { event: 'meta', conversation_id: 'c2', remaining: null, period: 'day' },
    ]);
  });
});
