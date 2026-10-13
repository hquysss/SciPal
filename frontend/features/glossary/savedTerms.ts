'use client';

import { useSyncExternalStore } from 'react';
import { createBrowserClient } from '@scipal/supabase';
import { authoringCall } from '@/features/authoring/apiClient';

// The learner's word list ("Sổ từ của tôi"), shared by the glossary, lesson popovers and term cards.
// Signed in: kept on the account (user_terms). Guest: kept in this browser, as the glossary always
// did; on sign-in those terms move up to the account once and leave the browser only when that worked.

export type SavedTermsState = { ids: ReadonlySet<string>; signedIn: boolean; ready: boolean };

const KEY = 'scipal-saved-terms';
/** The server takes at most this many ids per request (SAVE_MAX in backend routes/terms.ts). */
const CHUNK = 200;
const INITIAL: SavedTermsState = { ids: new Set(), signedIn: false, ready: false };

let state = INITIAL;
const listeners = new Set<() => void>();
let loading: Promise<void> | null = null;
let generation = 0;
let unsubscribeAuth: (() => void) | null = null;

function set(next: Partial<SavedTermsState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function readLocal(): Set<string> {
  try {
    const raw = window.localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeLocal(ids: ReadonlySet<string>) {
  try {
    if (ids.size === 0) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, JSON.stringify([...ids]));
  } catch {
    /* storage blocked: keep for this visit only */
  }
}

async function moveLocalUp(local: Set<string>): Promise<boolean> {
  const ids = [...local];
  for (let start = 0; start < ids.length; start += CHUNK) {
    const res = await authoringCall<{ saved: string[] }>('/api/me/terms', 'POST', { term_ids: ids.slice(start, start + CHUNK) });
    if (!res.ok) return false;
  }
  return true;
}

function load(): Promise<void> {
  const mine = ++generation;
  loading = (async () => {
    let supabase: ReturnType<typeof createBrowserClient> | null = null;
    let signedIn = false;
    try {
      supabase = createBrowserClient();
      signedIn = !!(await supabase.auth.getSession()).data.session;
    } catch {
      /* no client or no session: treated as a guest */
    }
    if (!supabase || !signedIn) {
      if (mine === generation) set({ ids: readLocal(), signedIn: false, ready: true });
      return;
    }
    const local = readLocal();
    if (local.size > 0 && (await moveLocalUp(local))) writeLocal(new Set());
    const { data, error } = await supabase.from('user_terms').select('term_id');
    if (mine !== generation) return;
    const ids = error ? state.ids : new Set(((data ?? []) as Array<{ term_id: string }>).map((row) => row.term_id));
    set({ ids, signedIn: true, ready: true });
  })();
  return loading;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!loading) {
    void load();
    try {
      const { data } = createBrowserClient().auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') void load();
      });
      unsubscribeAuth = () => data.subscription.unsubscribe();
    } catch {
      /* no client: stays a guest list */
    }
  }
  return () => {
    listeners.delete(listener);
  };
}

function update(id: string, keep: boolean) {
  const ids = new Set(state.ids);
  if (keep) ids.add(id);
  else ids.delete(id);
  set({ ids });
  if (!state.signedIn) writeLocal(ids);
}

/** Saves a term; true when it is in the list afterwards. */
async function save(id: string): Promise<boolean> {
  await (loading ?? load());
  if (state.ids.has(id)) return true;
  update(id, true);
  if (!state.signedIn) return true;
  const res = await authoringCall<{ saved: string[] }>('/api/me/terms', 'POST', { term_ids: [id] });
  if (res.ok && res.data.saved?.includes(id)) return true;
  update(id, false);
  return false;
}

/** Takes a term out of the list; true when it is gone afterwards. */
async function unsave(id: string): Promise<boolean> {
  await (loading ?? load());
  if (!state.ids.has(id)) return true;
  update(id, false);
  if (!state.signedIn) return true;
  const res = await authoringCall<Record<string, never>>(`/api/me/terms/${encodeURIComponent(id)}`, 'DELETE');
  if (res.ok) return true;
  update(id, true);
  return false;
}

export function useSavedTerms(): SavedTermsState & { save: typeof save; unsave: typeof unsave } {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => INITIAL);
  return { ...snapshot, save, unsave };
}

export function resetSavedTermsForTest() {
  unsubscribeAuth?.();
  unsubscribeAuth = null;
  state = INITIAL;
  loading = null;
  generation++;
}
