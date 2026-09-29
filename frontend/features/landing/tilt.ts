import type { PointerEvent } from 'react';

/** A paid card leans toward the pointer and a spotlight follows it (fine pointers only, see CSS). */
export function tilt(event: PointerEvent<HTMLElement>) {
  const card = event.currentTarget;
  const box = card.getBoundingClientRect();
  const x = (event.clientX - box.left) / box.width;
  const y = (event.clientY - box.top) / box.height;
  card.style.setProperty('--tilt-x', `${((0.5 - y) * 7).toFixed(2)}deg`);
  card.style.setProperty('--tilt-y', `${((x - 0.5) * 9).toFixed(2)}deg`);
  card.style.setProperty('--spot-x', `${(x * 100).toFixed(1)}%`);
  card.style.setProperty('--spot-y', `${(y * 100).toFixed(1)}%`);
}

export function untilt(event: PointerEvent<HTMLElement>) {
  for (const name of ['--tilt-x', '--tilt-y', '--spot-x', '--spot-y']) event.currentTarget.style.removeProperty(name);
}
