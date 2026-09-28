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
      { event: 'meta', conversation_id: 'c1', remaining: 4 },
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
});
