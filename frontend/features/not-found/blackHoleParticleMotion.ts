import * as THREE from 'three';
import { smoothstepValue, boundedEinsteinLensFactor, tangentialFlowOffset } from './blackHoleMotion';

type ParticleMotionState = {
  PARTICLE_COUNT: number;
  PRIMARY_COUNT: number;
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  alphas: Float32Array;
  radii: Float32Array;
  angles: Float32Array;
  zDisp: Float32Array;
  orbitSpeeds: Float32Array;
  infallSpeeds: Float32Array;
  baseSizes: Float32Array;
  orbitRate: Float32Array;
  infallRate: Float32Array;
  turbulencePhase: Float32Array;
  particleAge: Float32Array;
  streamPhase: Float32Array;
  streamRadialAmplitude: Float32Array;
  streamTangentialAmplitude: Float32Array;
  streamGroup: Uint8Array;
  posAttr: THREE.BufferAttribute;
  colAttr: THREE.BufferAttribute;
  sizeAttr: THREE.BufferAttribute;
  alphaAttr: THREE.BufferAttribute;
};

export function createParticleUpdater(state: ParticleMotionState) {
  const { PARTICLE_COUNT, PRIMARY_COUNT, positions, colors, sizes, alphas, radii, angles, zDisp, orbitSpeeds, infallSpeeds, baseSizes, orbitRate, infallRate, turbulencePhase, particleAge, streamPhase, streamRadialAmplitude, streamTangentialAmplitude, streamGroup, posAttr, colAttr, sizeAttr, alphaAttr } = state;
  return (
    dt: number,
    time: number,
    aspect: number,
    mouse: { x: number; y: number },
    compact: boolean
  ) => {
    const B_CRIT = 2.5980762;
    const cosI = Math.cos(1.30);   // ~0.2675 — match shader's uIncl = 1.30 rad
    const sinI = Math.sin(1.30);   // ~0.9636
    const roll = -0.38;
    const cosR = Math.cos(roll);
    const sinR = Math.sin(roll);
    const holeRadius = compact ? 0.125 : 0.155;
    const W = B_CRIT / Math.max(holeRadius, 1e-4);
    const holeCenterX = compact ? 0.5 : 0.64;
    const holeCenterY = compact ? 0.60 : 0.48;
    const mouseOffX = (mouse.x * 0.015) / aspect;
    const mouseOffY = mouse.y * 0.012;
    const clampedDt = Math.min(dt, 0.05);
    const orbitalDt = clampedDt * 0.16;
    const infallDt = clampedDt * 0.22;
    const flowTime = Number.isFinite(time) ? time : 0;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particleAge[i] += clampedDt;
      angles[i] += orbitSpeeds[i] * orbitalDt * orbitRate[i];
      radii[i] -= infallSpeeds[i] * infallDt * infallRate[i];

      const curR = radii[i];
      if (curR < 1.15) {
        if (i < PRIMARY_COUNT) {
          radii[i] = 12.0 + Math.random() * 2.0;
          angles[i] = Math.random() * Math.PI * 2;
          zDisp[i] = (Math.random() - 0.5) * 0.08 * Math.sqrt(radii[i]);
        } else {
          radii[i] = 12.0 + Math.random() * 2.0;
          angles[i] = Math.random() * Math.PI * 2;
          zDisp[i] = (Math.random() - 0.5) * 0.05 * Math.sqrt(radii[i]);
        }
        particleAge[i] = 0;
      }

      infallSpeeds[i] = 0.35 / Math.sqrt(Math.max(radii[i] - 0.95, 0.20));
      orbitSpeeds[i] = 2.4 / Math.pow(Math.max(radii[i] - 0.95, 0.25), 1.15);

      const r = radii[i];
      const theta = ((angles[i] % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const group = streamGroup[i];
      const groupPhase = streamPhase[group];
      const radialWobble = 0.018 * Math.sin(theta * 2.0 + turbulencePhase[i]);
      const sharedRadialFlow =
        streamRadialAmplitude[group] * Math.sin(theta * 2.0 - flowTime * 0.16 + groupPhase);
      const localRadialFlow =
        0.0035 * Math.sin(theta * 3.0 - flowTime * 0.23 + turbulencePhase[i]);
      const radialOffset = THREE.MathUtils.clamp(
        radialWobble + sharedRadialFlow + localRadialFlow,
        -0.045,
        0.045
      );
      const orbitR = Math.max(1.1, r + radialOffset);
      const tangentialOffset = tangentialFlowOffset(
        theta,
        flowTime,
        groupPhase,
        streamTangentialAmplitude[group],
        turbulencePhase[i]
      );
      const visualTheta = theta + tangentialOffset / Math.max(orbitR, 1.1);
      const cosT = Math.cos(visualTheta);
      const sinT = Math.sin(visualTheta);

      // ── 3D position in the tilted disk plane ──
      // Disk in equatorial plane (x, y, z=0), tilted by inclination angle
      // so observer sees from above at angle incl from disk normal.
      // x_unbent = r*cos(theta)  (horizontal in disk plane)
      // y_unbent = r*sin(theta)*cos(incl)  (foreshortened vertical)
      // z_depth  = r*sin(theta)*sin(incl)  (depth toward/away from observer)
      const xUnbent = orbitR * cosT;
      const yUnbent = orbitR * sinT * cosI;
      const zDepth  = orbitR * sinT * sinI;  // >0 = behind hole, <0 = in front

      let xd: number, yd: number;

      if (i >= PRIMARY_COUNT) {
        // ── Secondary: Under-arch (back-side light refracted UNDER the hole) ──
        // These represent light from the back of the disk that curves UNDER
        // the black hole due to gravitational lensing (the bottom Einstein arch).
        const bUnbent = Math.sqrt(xUnbent * xUnbent + yUnbent * yUnbent);
        const factor = boundedEinsteinLensFactor(bUnbent, B_CRIT);
        // Mirror vertically: under-arch goes below instead of above
        xd = xUnbent * factor;
        yd = -yUnbent * factor;
      } else {
        // ── Continuous top-dome / front-belt projection ──
        // Normalize depth by the orbit radius so the blend follows orbital angle,
        // rather than becoming a razor-thin transition on larger rings.
        const bUnbent = Math.sqrt(xUnbent * xUnbent + yUnbent * yUnbent);
        const factor = boundedEinsteinLensFactor(bUnbent, B_CRIT);
        const normalizedDepth = zDepth / Math.max(Math.abs(orbitR * sinI), 1e-4);
        const blendToDome = smoothstepValue(normalizedDepth, -0.42, 0.42);
        const sagStrength = 0.38 / Math.max(orbitR - 0.8, 0.35);
        const frontSag = sagStrength * (0.8 + 0.6 * Math.pow(Math.abs(sinT), 1.5));
        // Front belt and top dome share the same in-plane coordinates and crossfade
        // over a wide angular band, so neither path can jump vertically.
        const xFront = xUnbent;
        const yFront = yUnbent - frontSag * (1.0 - blendToDome);
        const xDome = xUnbent * factor;
        const yDome = yUnbent * factor;
        xd = xFront + (xDome - xFront) * blendToDome;
        yd = yFront + (yDome - yFront) * blendToDome;
      }

      // ── Add z-displacement for disk thickness ──
      xd += zDisp[i] * 0.25;
      yd += zDisp[i] * 0.16;

      // ── Apply system roll rotation ──
      const xRoll = xd * cosR - yd * sinR;
      const yRoll = xd * sinR + yd * cosR;

      // ── Project to screen UV coordinates ──
      const uvX = holeCenterX + mouseOffX + xRoll / (W * aspect);
      const uvY = holeCenterY + mouseOffY + yRoll / W;
      positions[i * 3] = (uvX - 0.5) * 2;
      positions[i * 3 + 1] = (uvY - 0.5) * 2;
      positions[i * 3 + 2] = 0.0;

      // ── Hide particles inside the opaque shadow ──
      const projectedX = (uvX - holeCenterX - mouseOffX) * aspect;
      const projectedY = uvY - holeCenterY - mouseOffY;
      const projectedRadius = Math.hypot(projectedX, projectedY);
      let particleAlpha = i < PRIMARY_COUNT ? 1.0 : 0.88;
      if (projectedRadius < holeRadius * 1.06) {
        particleAlpha = 0;
      } else if (projectedRadius < holeRadius * 1.24) {
        particleAlpha *= (projectedRadius - holeRadius * 1.06) / (holeRadius * 0.18);
      }
      // ── Depth ordering: continuous Doppler beaming from line-of-sight velocity ──
      // Positive z velocity points away from the observer; use the orbital tangent
      // rather than a hard x=0 side switch.
      const lineOfSightVelocity = -orbitR * orbitSpeeds[i] * cosT * sinI;
      const velocityScale = Math.max(orbitR * orbitSpeeds[i] * sinI, 1e-4);
      const approachSignal = THREE.MathUtils.clamp(lineOfSightVelocity / velocityScale, -1, 1);
      const approachBlend = smoothstepValue(approachSignal, -0.26, 0.26);
      const doppler = THREE.MathUtils.lerp(0.82, 1.35, approachBlend);

      // ── Color temperature varies with orbital radius ──
      // Keep the same white-hot -> orange -> red family, but ease between bands.
      let cr = 1.0, cg = 0.96, cb = 0.92;
      let paletteBlend = smoothstepValue(r, 2.15, 2.85);
      cr = THREE.MathUtils.lerp(cr, 1.0, paletteBlend);
      cg = THREE.MathUtils.lerp(cg, 0.86, paletteBlend);
      cb = THREE.MathUtils.lerp(cb, 0.58, paletteBlend);
      paletteBlend = smoothstepValue(r, 4.1, 4.9);
      cr = THREE.MathUtils.lerp(cr, 1.0, paletteBlend);
      cg = THREE.MathUtils.lerp(cg, 0.68, paletteBlend);
      cb = THREE.MathUtils.lerp(cb, 0.26, paletteBlend);
      paletteBlend = smoothstepValue(r, 7.5, 8.5);
      cr = THREE.MathUtils.lerp(cr, 0.95, paletteBlend);
      cg = THREE.MathUtils.lerp(cg, 0.46, paletteBlend);
      cb = THREE.MathUtils.lerp(cb, 0.15, paletteBlend);
      paletteBlend = smoothstepValue(r, 11.0, 12.0);
      cr = THREE.MathUtils.lerp(cr, 0.78, paletteBlend);
      cg = THREE.MathUtils.lerp(cg, 0.32, paletteBlend);
      cb = THREE.MathUtils.lerp(cb, 0.08, paletteBlend);

      // Blueshift approaching particles, eased over the projected velocity.
      const blueshift = approachBlend * 0.42;
      cr = THREE.MathUtils.lerp(cr, 1.0, blueshift);
      cg = THREE.MathUtils.lerp(cg, 0.98, blueshift);
      cb = THREE.MathUtils.lerp(cb, 0.94, blueshift);

      // Fade at boundaries
      if (r < 1.30) particleAlpha *= Math.max(0, (r - 1.15) / 0.15);
      if (r > 12.0) particleAlpha *= Math.max(0, (14.0 - r) / 2.0);
      particleAlpha *= smoothstepValue(particleAge[i], 0, 0.75);

      const brightness = doppler * 0.95;
      colors[i * 3] = cr * brightness;
      colors[i * 3 + 1] = cg * brightness;
      colors[i * 3 + 2] = cb * brightness;
      alphas[i] = particleAlpha;
      const sizeBlend = THREE.MathUtils.lerp(0.90, 1.15, approachBlend);
      sizes[i] = baseSizes[i] * (compact ? 0.75 : 1.0) * sizeBlend;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
  };

}
