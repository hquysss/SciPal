'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Mic, MicOff, PhoneOff } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { startVoice } from '../api';
import { TutorAvatar } from '../TutorAvatar';
import styles from '../tutor.module.css';
import { startConversation, type GrantResult, type TranscriptLine, type VoiceState } from './liveSession';

type Bilingual = { vi: string; en: string };

const STATE_TEXT: Record<VoiceState, Bilingual> = {
  connecting: { vi: 'Đang kết nối…', en: 'Connecting…' },
  listening: { vi: 'Thầy đang nghe, em cứ nói', en: 'Listening, go ahead' },
  speaking: { vi: 'Thầy đang nói, em nói chen vào được', en: 'Speaking, you can cut in' },
  ended: { vi: 'Đã kết thúc', en: 'Ended' },
};

const EXAMPLE: Bilingual = { vi: '“Thầy giảng lại vòng lặp for giúp em với.”', en: '“Could you explain for loops again?”' };
const BARS = 5;

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** Appends words to the current turn of the same speaker, or starts a new line. */
export function addWords(lines: TranscriptLine[], who: TranscriptLine['who'], text: string, newTurn: boolean): TranscriptLine[] {
  const last = lines[lines.length - 1];
  if (last && last.who === who && !newTurn) return [...lines.slice(0, -1), { who, text: last.text + text }];
  return [...lines, { who, text: text.trimStart() }];
}

/**
 * A spoken conversation with the tutor, over the page. It lasts as long as the student wants and
 * their voice minutes allow: minutes are taken two at a time as the talk goes on, and it ends on the
 * button, Escape, or when the minutes run out.
 */
export function VoiceChat({ lessonId, onClose }: { lessonId?: string; onClose: () => void }) {
  const { lang, t } = useLanguage();
  const [minutesLeft, setMinutesLeft] = useState<{ n: number; period: 'day' | 'month' } | null>(null);
  const [state, setState] = useState<VoiceState>('connecting');
  const [error, setError] = useState<Bilingual | null>(null);
  const [lastCall, setLastCall] = useState(false);
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [elapsed, setElapsed] = useState(0);
  // When the talk must stop if nothing more is paid: the end of the current part plus the minutes
  // still in the plan. Null for admins (not metered).
  const [stopsAt, setStopsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // Admins are not metered: the clock then says so instead of counting down.
  const [unmetered, setUnmetered] = useState(false);
  const linesRef = useRef<TranscriptLine[]>([]);
  const stopRef = useRef<() => void>(() => {});
  const turnEnded = useRef(true);
  const endButton = useRef<HTMLButtonElement>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  // The loudness of whoever is talking, written straight to the stage (60 times a second, no render).
  const stageRef = useRef<HTMLDivElement>(null);
  const level = useRef(0);
  const transcriptEnd = useRef<HTMLLIElement>(null);

  useEffect(() => {
    let cancelled = false;
    let first = true;
    const nextGrant = async (): Promise<GrantResult> => {
      const res = await startVoice(lessonId, lang === 'en' ? 'en' : 'vi');
      if (!res.ok) {
        const outOfMinutes = res.status === 429;
        // The first refusal is the answer to the button; later ones only mean the talk is ending.
        if (first || !outOfMinutes) setError(res.error);
        first = false;
        return { ok: false, outOfMinutes };
      }
      first = false;
      setUnmetered(res.data.remaining === null);
      if (res.data.remaining !== null) {
        setMinutesLeft({ n: res.data.remaining, period: res.data.period ?? 'month' });
        setStopsAt(Date.now() + (res.data.maxSeconds + res.data.remaining * 60) * 1000);
      }
      return { ok: true, grant: res.data };
    };
    void startConversation(nextGrant, () => linesRef.current, {
      onState: (next) => !cancelled && setState(next),
      onLastSegment: () => !cancelled && setLastCall(true),
      onTranscript: (who, text) => {
        linesRef.current = addWords(linesRef.current, who, text, turnEnded.current);
        turnEnded.current = false;
        setLines(linesRef.current);
      },
      onTurnEnd: () => {
        turnEnded.current = true;
      },
      onLevel: (_who, next) => {
        // Rise fast, fall slowly, so the rings move with speech rather than flicker.
        level.current = next > level.current ? next : level.current * 0.85 + next * 0.15;
        stageRef.current?.style.setProperty('--level', level.current.toFixed(3));
      },
      isMuted: () => mutedRef.current,
      onError: (reason) =>
        setError(
          reason === 'microphone'
            ? { vi: 'Không dùng được micro. Hãy cho phép trình duyệt dùng micro rồi thử lại.', en: 'The microphone is not available. Allow the browser to use it, then try again.' }
            : { vi: 'Mất kết nối với Giáo sư Quý. Em thử lại sau nhé.', en: 'Lost the connection to the Professor. Please try again.' },
        ),
    }).then((stop) => {
      if (cancelled) stop();
      else stopRef.current = stop;
    });
    return () => {
      cancelled = true;
      stopRef.current();
    };
    // One conversation per opening of the panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const talking = state === 'listening' || state === 'speaking';
  useEffect(() => {
    if (!talking) return;
    const id = window.setInterval(() => {
      setElapsed((s) => s + 1);
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [talking]);

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

  const toggleMute = () => {
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
  };

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [lines]);

  const left = stopsAt === null ? null : Math.max(0, Math.round((stopsAt - now) / 1000));

  return (
    <div className={styles.voiceBackdrop}>
      <div role="dialog" aria-modal="true" aria-labelledby="voice-title" className={styles.voicePanel}>
        <header className={styles.voiceHeader}>
          <TutorAvatar size="2.5rem" />
          <div className="min-w-0">
            <h2 id="voice-title" className="text-base font-bold leading-tight">{t({ vi: 'Nói chuyện với thầy', en: 'Talk with the Professor' })}</h2>
            <p className="text-xs text-ink-muted">{t({ vi: 'Giáo sư Quý', en: 'Professor Quys' })}</p>
          </div>
        </header>

        <div ref={stageRef} className={styles.voiceStage} data-state={state} aria-hidden="true">
          <span className={styles.ring} />
          <span className={styles.ring} />
          <div className={styles.orb} data-state={state}>
            <TutorAvatar size="5.5rem" />
          </div>
          <div className={styles.bars}>
            {Array.from({ length: BARS }, (_, i) => (
              <span key={i} style={{ '--bar': i } as CSSProperties} />
            ))}
          </div>
        </div>

        <p role="status" className={styles.voiceStatus} data-state={muted && talking ? 'muted' : state}>
          <span aria-hidden="true" />
          {muted && talking ? t({ vi: 'Micro đang tắt', en: 'Mic is off' }) : t(STATE_TEXT[state])}
        </p>
        {state !== 'ended' && (
          <div className={styles.voiceClocks} aria-live="off">
            <div>
              <span>{t({ vi: 'Đã nói', en: 'Talked' })}</span>
              <b>{clock(elapsed)}</b>
            </div>
            <div data-low={left !== null && left < 60 ? 'true' : undefined}>
              <span>{t({ vi: 'Còn lại', en: 'Left' })}</span>
              <b>{left !== null ? clock(left) : unmetered ? t({ vi: 'Không giới hạn', en: 'Unlimited' }) : '–:––'}</b>
            </div>
          </div>
        )}

        {lastCall && state !== 'ended' && (
          <Alert tone="warning">{t({ vi: 'Em sắp hết phút nói chuyện, cuộc trò chuyện sẽ dừng trong giây lát.', en: 'You are almost out of voice minutes; the talk will stop in a moment.' })}</Alert>
        )}
        {error && <Alert tone="danger">{t(error)}</Alert>}

        {lines.length > 0 ? (
          <ul className={styles.transcript} aria-live="polite">
            {lines.map((line, i) => (
              <li key={i} data-who={line.who}>
                <span className="sr-only">{line.who === 'tutor' ? t({ vi: 'Thầy: ', en: 'Professor: ' }) : t({ vi: 'Em: ', en: 'You: ' })}</span>
                {line.text}
              </li>
            ))}
            <li ref={transcriptEnd} aria-hidden="true" className={styles.transcriptEnd} />
          </ul>
        ) : (
          state !== 'ended' && (
            <p className={styles.voiceHint}>
              {t({ vi: 'Thử nói: ', en: 'Try saying: ' })}
              <i>{t(EXAMPLE)}</i>
            </p>
          )
        )}

        <div className={styles.voiceControls}>
          {state !== 'ended' && (
            <button
              type="button"
              className={styles.voiceControl}
              aria-pressed={muted}
              onClick={toggleMute}
              disabled={!talking}
            >
              {muted ? <MicOff aria-hidden="true" /> : <Mic aria-hidden="true" />}
              <span>{muted ? t({ vi: 'Bật micro', en: 'Unmute' }) : t({ vi: 'Tắt micro', en: 'Mute' })}</span>
            </button>
          )}
          <button ref={endButton} type="button" className={styles.voiceEnd} onClick={close}>
            <PhoneOff aria-hidden="true" />
            <span>{state === 'ended' ? t({ vi: 'Đóng', en: 'Close' }) : t({ vi: 'Kết thúc', en: 'End' })}</span>
          </button>
        </div>

        <p className={styles.voiceNote}>
          {t({
            vi: 'Nói bao lâu cũng được; phút được trừ dần theo từng 2 phút và dừng khi hết phút. Nội dung nói không được lưu.',
            en: 'Talk as long as you like; minutes are taken two at a time and the talk stops when they run out. Nothing said is saved.',
          })}
          {minutesLeft && (
            <>
              {' '}
              {minutesLeft.period === 'day'
                ? t({ vi: `Còn ${minutesLeft.n} phút hôm nay sau đoạn này.`, en: `${minutesLeft.n} minutes left today after this part.` })
                : t({ vi: `Còn ${minutesLeft.n} phút tháng này sau đoạn này.`, en: `${minutesLeft.n} minutes left this month after this part.` })}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
