'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '../../lib/supabase';

/**
 * The signed-in learner's XP total when the lesson opened (sum of `xp_log`, readable under RLS).
 * null for guests or when it could not be read; level-up is then not shown.
 */
export function useTotalXp(): number | null {
  const [total, setTotal] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const supabase = createBrowserClient();
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id;
        if (!userId) return;
        const { data, error } = await supabase.from('xp_log').select('delta').eq('user_id', userId);
        if (error || !alive) return;
        setTotal((data ?? []).reduce((sum: number, row: { delta: number | null }) => sum + (row.delta ?? 0), 0));
      } catch {
        // Level-up stays off.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  return total;
}
