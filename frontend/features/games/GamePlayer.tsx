'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Timer, Trophy } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getGame, getLeaderboard, KIND_LABEL, startGame, submitGame,
  type Bilingual, type GameCard, type LeaderEntry, type PlayResult, type PlayStart, type QuizQuestion, type QuizResponse,
} from './gamesApi';

type Game = GameCard & { wordwallUrl: string | null };
type Body = { answers?: Array<{ question_id: string; response: QuizResponse }>; pairs?: Array<{ termId: string; right: number }> };
type Submit = (body: Body) => void;
/** What the player has so far, sent as is when the time runs out. */
type Draft = { current: Body };

function Countdown({ seconds, onEnd }: { seconds: number; onEnd: () => void }) {
  const { t } = useLanguage();
  const [left, setLeft] = useState(seconds);
  const ended = useRef(onEnd);
  ended.current = onEnd;
  useEffect(() => {
    const end = Date.now() + seconds * 1000;
    const timer = setInterval(() => {
      const s = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) { clearInterval(timer); ended.current(); }
    }, 250);
    return () => clearInterval(timer);
  }, [seconds]);
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return (
    <span role="timer" aria-label={t({ en: 'Time left', vi: 'Thời gian còn lại' })} className={`inline-flex items-center gap-1 font-bold tabular-nums ${left <= 10 ? 'text-danger' : 'text-ink'}`}>
      <Timer aria-hidden="true" className="h-4 w-4" />{mm}:{ss}
    </span>
  );
}

function QuizPlay({ questions, onSubmit, busy, draft }: { questions: QuizQuestion[]; onSubmit: Submit; busy: boolean; draft: Draft }) {
  const { t } = useLanguage();
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuizResponse>>({});
  const q = questions[i]!;
  const set = (r: QuizResponse) => setAnswers((a) => ({ ...a, [q.id]: r }));
  const a = answers[q.id] ?? {};
  const body = { answers: Object.entries(answers).map(([question_id, response]) => ({ question_id, response })) };
  useEffect(() => { draft.current = body; });
  const submit = () => onSubmit(body);
  const choice = (active: boolean) => `min-h-11 w-full rounded-lg border px-4 py-2 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus ${active ? 'border-action bg-surface-sunken font-semibold text-ink' : 'border-line text-ink hover:border-action'}`;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-muted">{t({ en: `Question ${i + 1} of ${questions.length}`, vi: `Câu ${i + 1}/${questions.length}` })}</p>
      <p className="whitespace-pre-wrap text-lg font-semibold text-ink">{t(q.data.stem)}</p>
      {q.type === 'mc' && (
        <div className="flex flex-col gap-2">
          {q.data.options?.map((o) => (
            <button key={o.id} type="button" aria-pressed={a.selected_option === o.id} onClick={() => set({ selected_option: o.id })} className={choice(a.selected_option === o.id)}>{t(o.text)}</button>
          ))}
        </div>
      )}
      {q.type === 'truefalse' && (
        <ul className="flex flex-col gap-2">
          {q.data.items?.map((item) => {
            const picked = a.items?.find((x) => x.id === item.id)?.selected;
            const pick = (selected: boolean) => set({ items: [...(a.items ?? []).filter((x) => x.id !== item.id), { id: item.id, selected }] });
            return (
              <li key={item.id} className="flex flex-col gap-2 rounded-lg border border-line p-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-ink">{t(item.text)}</span>
                <span className="flex gap-2">
                  <Button type="button" variant={picked === true ? 'default' : 'outline'} aria-pressed={picked === true} onClick={() => pick(true)}>{t({ en: 'True', vi: 'Đúng' })}</Button>
                  <Button type="button" variant={picked === false ? 'default' : 'outline'} aria-pressed={picked === false} onClick={() => pick(false)}>{t({ en: 'False', vi: 'Sai' })}</Button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {q.type === 'short' && (
        <Input aria-label={t({ en: 'Your answer', vi: 'Câu trả lời' })} value={a.short_answer ?? ''} onChange={(e) => set({ short_answer: e.target.value })} />
      )}
      <div className="flex justify-between gap-2">
        <Button type="button" variant="ghost" disabled={i === 0} onClick={() => setI(i - 1)}>{t({ en: 'Back', vi: 'Câu trước' })}</Button>
        {i < questions.length - 1
          ? <Button type="button" onClick={() => setI(i + 1)}>{t({ en: 'Next', vi: 'Câu tiếp' })}</Button>
          : <Button type="button" disabled={busy} onClick={submit}>{t({ en: 'Finish', vi: 'Nộp bài' })}</Button>}
      </div>
    </div>
  );
}

function MatchPlay({ left, right, onSubmit, busy, draft }: { left: Array<{ id: string; text: string }>; right: Array<{ index: number; text: string }>; onSubmit: Submit; busy: boolean; draft: Draft }) {
  const { t } = useLanguage();
  const [picked, setPicked] = useState<string | null>(null);
  const [pairs, setPairs] = useState<Record<string, number>>({});
  const body = { pairs: Object.entries(pairs).map(([termId, r]) => ({ termId, right: r })) };
  useEffect(() => { draft.current = body; });
  const pairNo = (termId: string) => Object.keys(pairs).indexOf(termId) + 1;
  const ownerOf = (index: number) => Object.entries(pairs).find(([, r]) => r === index)?.[0];
  const cell = (active: boolean, paired: boolean) => `flex min-h-11 w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus ${active ? 'border-action ring-2 ring-action' : paired ? 'border-action bg-surface-sunken' : 'border-line hover:border-action'}`;
  const tag = (n: number) => (n > 0 ? <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-action text-xs font-bold text-action-ink">{n}</span> : null);

  const chooseRight = (index: number) => {
    if (!picked) {
      // Tapping a paired right item undoes that pair.
      const owner = ownerOf(index);
      if (owner) setPairs(({ [owner]: _, ...rest }) => rest);
      return;
    }
    setPairs((p) => {
      const next = Object.fromEntries(Object.entries(p).filter(([id, r]) => id !== picked && r !== index));
      return { ...next, [picked]: index };
    });
    setPicked(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-muted">{t({ en: 'Tap an English term, then its Vietnamese meaning.', vi: 'Chạm một thuật ngữ tiếng Anh, rồi chạm nghĩa tiếng Việt tương ứng.' })}</p>
      <div className="grid grid-cols-2 gap-3">
        <ul className="flex flex-col gap-2" aria-label="English">
          {left.map((l) => (
            <li key={l.id}>
              <button type="button" aria-pressed={picked === l.id} onClick={() => setPicked(picked === l.id ? null : l.id)} className={cell(picked === l.id, l.id in pairs)} lang="en">
                {tag(pairNo(l.id))}<span className="break-words">{l.text}</span>
              </button>
            </li>
          ))}
        </ul>
        <ul className="flex flex-col gap-2" aria-label="Tiếng Việt">
          {right.map((r) => {
            const owner = ownerOf(r.index);
            return (
              <li key={r.index}>
                <button type="button" onClick={() => chooseRight(r.index)} className={cell(false, Boolean(owner))} lang="vi">
                  {tag(owner ? pairNo(owner) : 0)}<span className="break-words">{r.text}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="flex justify-end">
        <Button type="button" disabled={busy || Object.keys(pairs).length < left.length} onClick={() => onSubmit(body)}>
          {t({ en: 'Finish', vi: 'Nộp bài' })}
        </Button>
      </div>
    </div>
  );
}

function Leaderboard({ entries }: { entries: LeaderEntry[] | null }) {
  const { t } = useLanguage();
  if (!entries) return null;
  return (
    <section className="flex flex-col gap-2" aria-labelledby="leaderboard">
      <h2 id="leaderboard" className="flex items-center gap-2 text-base font-semibold text-ink"><Trophy aria-hidden="true" className="h-5 w-5 text-action" />{t({ en: 'Leaderboard', vi: 'Bảng xếp hạng' })}</h2>
      {entries.length === 0 ? <p className="text-sm text-ink-muted">{t({ en: 'No one has played yet.', vi: 'Chưa ai chơi.' })}</p> : (
        <ol className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
          {entries.map((e) => (
            <li key={e.rank} className={`flex items-center justify-between gap-3 px-4 py-2 text-sm ${e.me ? 'bg-surface-sunken font-semibold' : ''}`}>
              <span className="flex min-w-0 items-center gap-3"><span className="w-6 tabular-nums text-ink-muted">{e.rank}</span><span className="truncate text-ink">{e.name ?? t({ en: 'Student', vi: 'Học sinh' })}{e.me ? ` (${t({ en: 'you', vi: 'em' })})` : ''}</span></span>
              <span className="shrink-0 tabular-nums text-ink">{e.score === null ? t({ en: 'Played', vi: 'Đã chơi' }) : `${e.score}/${e.maxScore} · ${e.seconds}s`}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function GamePlayer({ id }: { id: string }) {
  const { t } = useLanguage();
  const [game, setGame] = useState<Game | null>(null);
  const [play, setPlay] = useState<PlayStart | null>(null);
  const [result, setResult] = useState<PlayResult | null>(null);
  const [board, setBoard] = useState<LeaderEntry[] | null>(null);
  const [error, setError] = useState<Bilingual | null>(null);
  const [busy, setBusy] = useState(false);
  const submitted = useRef(false);
  const draft = useRef<Body>({});

  const loadBoard = useCallback(async () => {
    const r = await getLeaderboard(id);
    if (r.ok) setBoard(r.data.entries);
  }, [id]);

  useEffect(() => {
    void getGame(id).then((r) => (r.ok ? setGame(r.data.game) : setError(r.error)));
    void loadBoard();
  }, [id, loadBoard]);

  const start = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    submitted.current = false;
    draft.current = {};
    const r = await startGame(id);
    setBusy(false);
    if (r.ok) setPlay(r.data);
    else setError(r.error);
  };

  const submit: Submit = async (body) => {
    if (!play || submitted.current) return;
    submitted.current = true;
    setBusy(true);
    const r = await submitGame(id, { playId: play.playId, ...body });
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    setResult(r.data);
    setPlay(null);
    void loadBoard();
  };

  if (error && !game) return <Alert tone="danger">{t(error)}</Alert>;
  if (!game) return <p role="status" className="text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t(game.title)}</h1>
          <span><Badge>{t(KIND_LABEL[game.kind])}</Badge></span>
        </div>
        {play && play.timeLimitS && <Countdown seconds={play.timeLimitS} onEnd={() => submit(draft.current)} />}
      </header>

      {error && <Alert tone="danger">{t(error)}</Alert>}

      {result && (
        <Alert tone={result.late ? 'danger' : 'success'}>
          {result.score === null
            ? t({ en: 'Recorded. Thanks for playing!', vi: 'Đã ghi nhận. Cảm ơn em đã chơi!' })
            : result.late
              ? t({ en: 'Time ran out before the answers arrived, so this play scores 0.', vi: 'Hết giờ trước khi bài được nộp nên lượt này được 0 điểm.' })
              : t({ en: `You scored ${result.score}/${result.maxScore}.`, vi: `Em được ${result.score}/${result.maxScore} điểm.` })}
        </Alert>
      )}

      {!play && (
        <div>
          <Button type="button" disabled={busy} onClick={() => void start()}>
            {result ? t({ en: 'Play again', vi: 'Chơi lại' }) : t({ en: 'Play', vi: 'Bắt đầu' })}
          </Button>
        </div>
      )}

      {play?.kind === 'quiz' && <QuizPlay questions={play.questions} onSubmit={submit} busy={busy} draft={draft} />}
      {play?.kind === 'match' && <MatchPlay left={play.left} right={play.right} onSubmit={submit} busy={busy} draft={draft} />}
      {play?.kind === 'wordwall' && game.wordwallUrl && (
        <div className="flex flex-col gap-3">
          <div className="relative w-full overflow-hidden rounded-xl border border-line" style={{ aspectRatio: '4 / 3' }}>
            <iframe
              src={game.wordwallUrl}
              title={t(game.title)}
              className="absolute inset-0 h-full w-full"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex justify-end">
            <Button type="button" disabled={busy} onClick={() => submit({})}>{t({ en: 'I finished', vi: 'Em đã chơi xong' })}</Button>
          </div>
        </div>
      )}

      <Leaderboard entries={board} />
    </div>
  );
}
