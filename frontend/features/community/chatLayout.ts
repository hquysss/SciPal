import type { ChatMessage } from './chatApi';

// How a conversation is laid out like a messenger: runs of messages from one person sit together,
// and a time label appears after a pause.

const GROUP_GAP_MS = 5 * 60 * 1000;
const LABEL_GAP_MS = 15 * 60 * 1000;

export type MessageGroup = { sender_id: string; sender_name: string; messages: ChatMessage[]; timeLabel: string | null };

const DAY = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' });
const CLOCK = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const SHORT_DAY = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit' });

/** "10:05" for today in Vietnam time, "11/10 10:05" for another day. */
export function timeLabel(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  const clock = CLOCK.format(at);
  return DAY.format(at) === DAY.format(now) ? clock : `${SHORT_DAY.format(at)} ${clock}`;
}

export function groupMessages(messages: ChatMessage[], now: Date = new Date()): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let previous: ChatMessage | null = null;
  for (const message of messages) {
    const gap = previous ? new Date(message.created_at).getTime() - new Date(previous.created_at).getTime() : Infinity;
    const last = groups[groups.length - 1];
    if (last && previous && last.sender_id === message.sender_id && gap <= GROUP_GAP_MS) {
      last.messages.push(message);
    } else {
      groups.push({
        sender_id: message.sender_id,
        sender_name: message.sender_name,
        messages: [message],
        timeLabel: gap > LABEL_GAP_MS ? timeLabel(message.created_at, now) : null,
      });
    }
    previous = message;
  }
  return groups;
}
