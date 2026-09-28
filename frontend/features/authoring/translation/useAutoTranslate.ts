'use client';

import { useCallback, useEffect, useState } from 'react';

// The "Tự dịch sang tiếng Anh" switch, remembered per browser. Storage may be blocked; the switch
// then stays on for the session.

const KEY = 'scipal-auto-translate';

export function readAutoTranslate(): boolean {
  try {
    return globalThis.localStorage?.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function writeAutoTranslate(on: boolean): void {
  try {
    globalThis.localStorage?.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // Remembering the switch is a convenience only.
  }
}

/** The switch's state: on while server rendering, then what this browser remembered. */
export function useAutoTranslate(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(true);
  useEffect(() => setOn(readAutoTranslate()), []);
  const set = useCallback((next: boolean) => {
    setOn(next);
    writeAutoTranslate(next);
  }, []);
  return [on, set];
}
