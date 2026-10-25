/** Short practice sounds made with Web Audio (no files). Off unless the learner turns them on. */

const KEY = 'scipal:sfx';
export type Sfx = 'right' | 'wrong' | 'levelUp';

export function sfxEnabled(): boolean {
  try {
    return window.localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export function setSfxEnabled(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(KEY, 'on');
    else window.localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the setting lasts this page only.
  }
}

const NOTES: Record<Sfx, number[]> = {
  right: [660, 880],
  wrong: [220],
  levelUp: [523, 659, 784, 1047],
};

let ctx: AudioContext | null = null;

export function playSfx(kind: Sfx): void {
  if (!sfxEnabled()) return;
  try {
    ctx ??= new AudioContext();
    const start = ctx.currentTime;
    NOTES[kind].forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = kind === 'wrong' ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      const at = start + i * 0.09;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.15, at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(at);
      osc.stop(at + 0.18);
    });
  } catch {
    // No audio on this device.
  }
}
