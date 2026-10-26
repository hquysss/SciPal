import type { NewBadge } from '@scipal/types';
import { authoringCall, queryString, type ApiResult } from '../authoring/apiClient';

// Games and notifications from the backend (routes/games.ts). The server scores every play.

export type Bilingual = { vi: string; en: string };
export type GameKind = 'quiz' | 'match' | 'wordwall' | 'crossword';
export type CrosswordMode = 'en_from_vi' | 'vi_from_en' | 'term_from_def';
export type CrosswordWord = { number: number; row: number; col: number; dir: 'across' | 'down'; length: number; clue: Bilingual };
export type GameCard = { id: string; kind: GameKind; title: Bilingual; classId: string | null; timeLimitS: number | null; createdAt: string };
export type Choice = { id: string; text: Bilingual };
export type QuizQuestion = { id: string; type: 'mc' | 'truefalse' | 'short'; data: { stem: Bilingual; options?: Choice[]; items?: Choice[] } };
export type PlayStart =
  | { playId: string; kind: 'quiz'; timeLimitS: number | null; questions: QuizQuestion[] }
  | { playId: string; kind: 'match'; timeLimitS: number | null; left: Array<{ id: string; text: string }>; right: Array<{ index: number; text: string }> }
  | { playId: string; kind: 'wordwall'; timeLimitS: number | null }
  | { playId: string; kind: 'crossword'; timeLimitS: number | null; mode: CrosswordMode; rows: number; cols: number; words: CrosswordWord[] };
export type QuizResponse = { selected_option?: string; items?: Array<{ id: string; selected: boolean }>; short_answer?: string };
export type PlayResult = {
  score: number | null; maxScore: number | null; late: boolean; results?: Array<{ question_id: string; correct: boolean }>;
  /** crossword: the `${number}-${dir}` keys of the right words, and XP for the first full solve. */
  correct?: string[]; xp_earned?: number; new_badges?: NewBadge[];
};
export type LeaderEntry = { rank: number; name: string | null; me: boolean; score: number | null; maxScore: number | null; seconds: number };
export type Notification = { id: string; kind: string; title: Bilingual; link: string | null; read: boolean; createdAt: string };
export type NewGame = { classId?: string | null; kind: GameKind; titleVi: string; titleEn?: string; lessonId?: string; pairs?: number; words?: number; mode?: CrosswordMode; wordwall?: string; timeLimitS?: number | null };

const game = (id: string) => `/api/games/${encodeURIComponent(id)}`;

export const listGames = (): Promise<ApiResult<{ publicGames: GameCard[]; classGames: Array<GameCard & { className: string }> }>> => authoringCall('/api/games', 'GET');
export const listClassGames = (classId: string): Promise<ApiResult<{ games: Array<GameCard & { playerCount: number }> }>> =>
  authoringCall(`/api/classes/${encodeURIComponent(classId)}/games`, 'GET');
export const searchGameLessons = (q: string): Promise<ApiResult<{ items: Array<{ id: string; title: Bilingual }> }>> => authoringCall(`/api/games/lessons${queryString({ q })}`, 'GET');
export const createGame = (body: NewGame): Promise<ApiResult<{ id: string }>> => authoringCall('/api/games', 'POST', body);
export const deleteGame = (id: string): Promise<ApiResult<Record<string, never>>> => authoringCall(game(id), 'DELETE');
export const getGame = (id: string): Promise<ApiResult<{ game: GameCard & { wordwallUrl: string | null } }>> => authoringCall(game(id), 'GET');
export const startGame = (id: string): Promise<ApiResult<PlayStart>> => authoringCall(`${game(id)}/start`, 'POST');
export const submitGame = (id: string, body: { playId: string; answers?: Array<{ question_id: string; response: QuizResponse }> | Record<string, string>; pairs?: Array<{ termId: string; right: number }> }): Promise<ApiResult<PlayResult>> =>
  authoringCall(`${game(id)}/submit`, 'POST', body);
export const getLeaderboard = (id: string): Promise<ApiResult<{ entries: LeaderEntry[] }>> => authoringCall(`${game(id)}/leaderboard`, 'GET');
export const listNotifications = (): Promise<ApiResult<{ notifications: Notification[]; unread: number }>> => authoringCall('/api/notifications', 'GET');
export const deleteNotification = (id: string): Promise<ApiResult<Record<string, never>>> => authoringCall(`/api/notifications/${encodeURIComponent(id)}`, 'DELETE');
export const clearNotifications = (): Promise<ApiResult<Record<string, never>>> => authoringCall('/api/notifications', 'DELETE');
export const markNotificationsRead = (): Promise<ApiResult<Record<string, never>>> => authoringCall('/api/notifications/read', 'POST');

export const KIND_LABEL: Record<GameKind, Bilingual> = {
  quiz: { en: 'Quiz', vi: 'Đố vui' },
  match: { en: 'Match terms', vi: 'Ghép thuật ngữ' },
  wordwall: { en: 'Wordwall', vi: 'Wordwall' },
  crossword: { en: 'Crossword', vi: 'Ô chữ' },
};

export const CROSSWORD_MODE_LABEL: Record<CrosswordMode, Bilingual> = {
  en_from_vi: { en: 'English from Vietnamese', vi: 'Anh ← Việt' },
  vi_from_en: { en: 'Vietnamese from English', vi: 'Việt ← Anh' },
  term_from_def: { en: 'Term from its definition', vi: 'Thuật ngữ ← định nghĩa' },
};
