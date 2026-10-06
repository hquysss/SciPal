import * as THREE from 'three';
export function makeTextTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '900 560px "Be Vietnam Pro", Arial, sans-serif';

  const cx = canvas.width / 2;
  const cy = canvas.height / 2 + 16;

  // 1. Wide atmospheric light aura (bloom)
  context.shadowColor = 'rgba(150, 125, 255, 0.70)';
  context.shadowBlur = 72;

  // Luminous light gradient fill: glowing starlight core to celestial violet
  const grad = context.createLinearGradient(0, cy - 260, 0, cy + 260);
  grad.addColorStop(0.0, 'rgba(235, 230, 255, 0.88)');
  grad.addColorStop(0.38, 'rgba(195, 180, 255, 0.75)');
  grad.addColorStop(0.72, 'rgba(155, 135, 255, 0.60)');
  grad.addColorStop(1.0, 'rgba(125, 100, 245, 0.45)');
  context.fillStyle = grad;
  context.fillText('404', cx, cy);

  // 2. Inner core radiance pass (pure light, zero stroke/border)
  context.shadowColor = 'rgba(215, 205, 255, 0.65)';
  context.shadowBlur = 24;
  context.fillText('404', cx, cy);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}
