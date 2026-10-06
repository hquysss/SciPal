import { createScene, type SceneHandle } from './blackHoleScene';

export function startBlackHoleAnimation(
  container: HTMLDivElement,
  callbacks: { onReady: () => void; onFallback: () => void }
) {
  const { onReady, onFallback } = callbacks;
  const pointer = { x: 0, y: 0 };
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let handle: SceneHandle | null = null;
    let frame = 0;
    let paused = document.visibilityState === 'hidden';
    let failed = false;
    let motionReduced = reducedMotionQuery.matches;
    let elapsed = 0;
    let previousNow = performance.now();
    let didNotifyReady = false;
    let removeRuntimeListeners = () => {};

    const cancelScheduledFrame = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    const fallback = () => {
      if (failed) return;
      failed = true;
      cancelScheduledFrame();
      removeRuntimeListeners();
      handle?.dispose();
      handle = null;
      onFallback();
    };

    const renderFrame = (now: number) => {
      if (failed || !handle || paused) return;
      const dt = motionReduced ? 0 : Math.max(0, Math.min(0.05, (now - previousNow) / 1000));
      if (!motionReduced) {
        elapsed += dt;
      }
      previousNow = now;

      const time = motionReduced ? 5.4 : elapsed;
      const reveal = motionReduced ? 1 : Math.min(1, elapsed / 1.5);

      const {
        material,
        particleMaterial,
        enduranceMaterial,
        renderer,
        scene,
        camera,
        updateParticles,
        updateEndurance,
        getViewport,
      } = handle;
      material.uniforms.uTime.value = time;
      material.uniforms.uReveal.value = reveal;
      particleMaterial.uniforms.uReveal.value = reveal;
      enduranceMaterial.uniforms.uReveal.value = reveal;

      // Gentle mouse parallax
      const currentMouse = material.uniforms.uMouse.value;
      currentMouse.x += (pointer.x - currentMouse.x) * 0.04;
      currentMouse.y += (pointer.y - currentMouse.y) * 0.04;

      const viewport = getViewport();
      updateParticles(dt, time, viewport.aspect, currentMouse, viewport.compact);
      updateEndurance(dt, time, reveal, currentMouse, viewport.compact, viewport.aspect);

      renderer.render(scene, camera);

      if (!didNotifyReady) {
        didNotifyReady = true;
        onReady();
      }
    };

    const animate = (now: number) => {
      frame = 0;
      if (failed || paused) return;
      renderFrame(now);
      if (!motionReduced) frame = requestAnimationFrame(animate);
    };

    const schedule = () => {
      if (!frame && !failed && !paused && !motionReduced) frame = requestAnimationFrame(animate);
    };

    try {
      handle = createScene(container);
      const canvas = handle.renderer.domElement;
      const contextLost = (event: Event) => {
        event.preventDefault();
        fallback();
      };
      canvas.addEventListener('webglcontextlost', contextLost, false);

      const handlePointerMove = (event: PointerEvent) => {
        if (event.pointerType === 'touch' || motionReduced || failed) return;
        pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
        pointer.y = -(event.clientY / window.innerHeight - 0.5) * 2;
      };

      const handlePointerLeave = () => {
        pointer.x *= 0.3;
        pointer.y *= 0.3;
      };

      const handleVisibility = () => {
        paused = document.visibilityState === 'hidden';
        cancelScheduledFrame();
        if (!paused) {
          previousNow = performance.now();
          if (motionReduced) renderFrame(previousNow);
          else schedule();
        }
      };

      const handleResize = () => {
        if (failed || !handle) return;
        handle.resize();
        if (motionReduced) renderFrame(performance.now());
      };

      const handleMotionChange = (event: MediaQueryListEvent) => {
        motionReduced = event.matches;
        cancelScheduledFrame();
        previousNow = performance.now();
        if (motionReduced) renderFrame(previousNow);
        else schedule();
      };

      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerleave', handlePointerLeave, { passive: true });
      window.addEventListener('resize', handleResize, { passive: true });
      document.addEventListener('visibilitychange', handleVisibility);

      if (typeof reducedMotionQuery.addEventListener === 'function') {
        reducedMotionQuery.addEventListener('change', handleMotionChange);
      } else {
        reducedMotionQuery.addListener(handleMotionChange);
      }

      removeRuntimeListeners = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerleave', handlePointerLeave);
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('visibilitychange', handleVisibility);
        if (typeof reducedMotionQuery.removeEventListener === 'function') {
          reducedMotionQuery.removeEventListener('change', handleMotionChange);
        } else {
          reducedMotionQuery.removeListener(handleMotionChange);
        }
        canvas.removeEventListener('webglcontextlost', contextLost);
      };

      if (motionReduced) renderFrame(performance.now());
      else schedule();

    } catch {
      fallback();
    }

    return () => {
      failed = true;
      cancelScheduledFrame();
      removeRuntimeListeners();
      handle?.dispose();
      handle = null;
    };
}
