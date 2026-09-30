'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, PhoneOff } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { startVoice, VOICE_MINUTES } from '../api';
import styles from '../tutor.module.css';
import { startLiveSession, type TranscriptLine, type VoiceState } from './liveSession';

type Bilingual = { vi: string; en: string };

const STATE_TEXT: Record<VoiceState, Bilingual> = {
  connecting: { vi: 'Đang kết nối…', en: 'Connecting…' },
  listening: { vi: 'Thầy đang nghe — em cứ nói', en: 'Listening — go ahead' },
  speaking: { vi: 'Thầy đang nói — em nói chen vào được', en: 'Speaking — you can cut in' },
  ended: { vi: 'Đã kết thúc', en: 'Ended' },
};

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** Appends words to the current turn of the same speaker, or starts a new line. */
export function addWords(lines: TranscriptLine[], who: TranscriptLine['who'], text: string, newTurn: boolean): TranscriptLine[] {
  const last = lines[lines.length - 1];
  if (last && last.who === who && !newTurn) return [...lines.slice(0, -1), { who, text: last.text + text }];
  return [...lines, { who, text: text.trimStart() }];
}

/** A spoken session with the tutor, over the page: pick a length, then talk. Ends on the button,
 *  Escape, or when the picked minutes are up. */
export function VoiceChat({ lessonId, onClose }: { lessonId?: string; onClose: () => void }) {
  const { lang, t } = useLanguage();
  const [minutes, setMinutes] = useState<number | null>(null);
  const [minutesLeft, setMinutesLeft] = useState<{ n: number; period: 'day' | 'month' } | null>(null);
  const [state, setState] = useState<VoiceState>('connecting');
  const [error, setError] = useState<Bilingual | null>(null);
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [left, setLeft] = useState<number | null>(null);
  const stopRef = useRef<() => void>(() => {});
  const turnEnded = useRef(true);
  const endButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (minutes === null) return;
    let cancelled = false;
    void (async () => {
      const grant = await startVoice(lessonId, lang === 'en' ? 'en' : 'vi', minutes);
      if (cancelled) return;
      if (!grant.ok) {
        setError(grant.error);
        setState('ended');
        return;
      }
      if (grant.data.remaining !== null) setMinutesLeft({ n: grant.data.remaining, period: grant.data.period ?? 'month' });
      setLeft(grant.data.maxSeconds);
      const stop = await startLiveSession(grant.data, {
        onState: (next) => !cancelled && setState(next),
        onTranscript: (who, text) => {
          setLines((current) => addWords(current, who, text, turnEnded.current));
          turnEnded.current = false;
        },
        onTurnEnd: () => {
          turnEnded.current = true;
        },
        onError: (reason) =>
          setError(
            reason === 'microphone'
              ? { vi: 'Không dùng được micro. Hãy cho phép trình duyệt dùng micro rồi thử lại.', en: 'The microphone is not available. Allow the browser to use it, then try again.' }
              : { vi: 'Mất kết nối với gia sư. Em thử lại sau nhé.', en: 'Lost the connection to the tutor. Please try again.' },
          ),
      });
      if (cancelled) stop();
      else stopRef.current = stop;
    })();
    return () => {
      cancelled = true;
      stopRef.current();
    };
    // One session per picked length.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minutes]);

  useEffect(() => {
    if (left === null || state === 'ended') return;
    const id = window.setInterval(() => setLeft((s) => (s === null ? s : Math.max(0, s - 1))), 1000);
    return () => window.clearInterval(id);
  }, [left === null, state === 'ended']); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus lands in the panel once, on opening; later renders must not pull it back.
  useEffect(() => {
    endButton.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    stopRef.current();
    onClose();
  };

  return (
    <div className={styles.voiceBackdrop}>
      <div role="dialog" aria-modal="true" aria-labelledby="voice-title" className={styles.voicePanel}>
        <h2 id="voice-title" className="text-lg font-bold">{t({ vi: 'Nói chuyện với thầy', en: 'Talk with the tutor' })}</h2>
        <div className={styles.orb} data-state={minutes === null ? 'idle' : state} aria-hidden="true">
          <Mic className="h-10 w-10" />
        </div>
        {minutes === null ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-center text-sm text-ink-muted">{t({ vi: 'Em muốn nói chuyện bao lâu?', en: 'How long do you want to talk?' })}</p>
            <div role="group" aria-label={t({ vi: 'Thời lượng', en: 'Length' })} className="flex gap-2">
              {VOICE_MINUTES.map((m) => (
                <Button key={m} type="button" variant="outline" onClick={() => setMinutes(m)}>
                  {t({ vi: `${m} phút`, en: `${m} min` })}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <p role="status" className="text-center text-sm font-semibold text-ink-muted">
            {t(STATE_TEXT[state])}
            {left !== null && state !== 'ended' && <span className="ml-2 tabular-nums">· {clock(left)}</span>}
          </p>
        )}
        {error && <Alert tone="danger">{t(error)}</Alert>}
        {lines.length > 0 && (
          <ul className={styles.transcript} aria-live="polite">
            {lines.map((line, i) => (
              <li key={i} data-who={line.who}>
                <b>{line.who === 'tutor' ? t({ vi: 'Thầy: ', en: 'Tutor: ' }) : t({ vi: 'Em: ', en: 'You: ' })}</b>
                {line.text}
              </li>
            ))}
          </ul>
        )}
        <p className="text-center text-xs text-ink-muted">
          {t({
            vi: 'Số phút em chọn được trừ ngay khi bắt đầu, kể cả khi kết thúc sớm. Nội dung nói không được lưu lại.',
            en: 'The minutes you pick are taken when the talk starts, even if you end early. What is said is not saved.',
          })}
          {minutesLeft && (
            <span className="mt-1 block font-semibold">
              {minutesLeft.period === 'day'
                ? t({ vi: `Còn ${minutesLeft.n} phút hôm nay`, en: `${minutesLeft.n} minutes left today` })
                : t({ vi: `Còn ${minutesLeft.n} phút tháng này`, en: `${minutesLeft.n} minutes left this month` })}
            </span>
          )}
        </p>
        <Button ref={endButton} type="button" variant="destructive" onClick={close}>
          <PhoneOff aria-hidden="true" />
          {state === 'ended' || minutes === null ? t({ vi: 'Đóng', en: 'Close' }) : t({ vi: 'Kết thúc', en: 'End' })}
        </Button>
      </div>
    </div>
  );
}
