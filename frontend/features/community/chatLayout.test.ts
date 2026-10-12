import { describe, expect, it } from 'vitest';
import { groupMessages, timeLabel } from './chatLayout';
import type { ChatMessage } from './chatApi';

const m = (id: string, sender: string, at: string): ChatMessage => ({
  id, sender_id: sender, sender_name: `Tên ${sender}`, body: id, image_url: null, created_at: at,
});

describe('timeLabel', () => {
  it('shows the hour in Vietnam time today, and the date too on another day', () => {
    const now = new Date('2026-10-12T05:00:00Z'); // 12:00 on 12/10 in Vietnam
    expect(timeLabel('2026-10-12T03:05:00Z', now)).toBe('10:05');
    expect(timeLabel('2026-10-11T03:05:00Z', now)).toBe('11/10 10:05');
    // 18:30 UTC is already the next day in Vietnam
    expect(timeLabel('2026-10-11T18:30:00Z', new Date('2026-10-12T05:00:00Z'))).toBe('01:30');
  });
});

describe('groupMessages', () => {
  it('puts quick messages from one sender in one group and splits on a new sender', () => {
    const groups = groupMessages([
      m('1', 'a', '2026-10-12T03:00:00Z'), m('2', 'a', '2026-10-12T03:01:00Z'), m('3', 'b', '2026-10-12T03:02:00Z'),
    ]);
    expect(groups.map((g) => g.messages.map((x) => x.id))).toEqual([['1', '2'], ['3']]);
  });

  it('starts a new group after a 5 minute pause, even for the same sender', () => {
    const groups = groupMessages([m('1', 'a', '2026-10-12T03:00:00Z'), m('2', 'a', '2026-10-12T03:06:00Z')]);
    expect(groups).toHaveLength(2);
  });

  it('puts a time label before the first group and after a pause of over 15 minutes, not otherwise', () => {
    const now = new Date('2026-10-12T05:00:00Z');
    const groups = groupMessages([
      m('1', 'a', '2026-10-12T03:00:00Z'), m('2', 'b', '2026-10-12T03:07:00Z'), m('3', 'a', '2026-10-12T03:30:00Z'),
    ], now);
    expect(groups.map((g) => g.timeLabel)).toEqual(['10:00', null, '10:30']);
  });

  it('is empty for no messages', () => {
    expect(groupMessages([])).toEqual([]);
  });
});
