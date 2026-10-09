import React from 'react';
import {
  AbsoluteFill, Audio, Easing, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';
import { loadFont } from '@remotion/google-fonts/BeVietnamPro';
import { COPY, Lang, Orientation, pick } from './copy';

const { fontFamily } = loadFont('normal', { weights: ['400', '600', '800'], subsets: ['latin', 'vietnamese'] });

// Bảng màu THPT trong packages/ui/src/theme/palettes.ts
const C = {
  navy: '#0B1F4A', deep: '#071433', paper: '#F3F7FF', action: '#2563C9',
  sun: '#F5B82E', coral: '#F0716B', sky: '#9D84F5', ink: '#0B1F4A',
};
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const FADE = 12;

export type TrailerProps = { lang: Lang; o: Orientation };

const prog = (f: number, start: number, dur = 20) =>
  interpolate(f - start, [0, dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });

const shot = (name: string, p: TrailerProps) => staticFile(`shots/${name}-${p.o}-${p.lang}.png`);

/* ---------- building blocks ---------- */

const Backdrop: React.FC = () => {
  const f = useCurrentFrame();
  const glow = (color: string, x: number, y: number, r: number, phase: number) => (
    <div style={{
      position: 'absolute', width: r, height: r, borderRadius: '50%', background: color, opacity: 0.35, filter: 'blur(140px)',
      left: `${x + Math.sin(f / 90 + phase) * 6}%`, top: `${y + Math.cos(f / 110 + phase) * 6}%`, transform: 'translate(-50%,-50%)',
    }} />
  );
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 0%, ${C.navy}, ${C.deep})`, overflow: 'hidden' }}>
      {glow(C.sun, 12, 18, 700, 0)}
      {glow(C.coral, 88, 78, 760, 2)}
      {glow(C.sky, 70, 12, 620, 4)}
      <AbsoluteFill style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)',
        backgroundSize: '64px 64px', backgroundPosition: `0 ${-f * 0.4}px`,
      }} />
    </AbsoluteFill>
  );
};

const Scene: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, FADE, dur - FADE, dur], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scale = interpolate(f, [0, dur], [1.02, 1], { extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>{children}</AbsoluteFill>;
};

const Headline: React.FC<{ text: string; sub?: string; o: Orientation; delay?: number; align?: 'left' | 'center' }> = ({
  text, sub, o, delay = 4, align = 'left',
}) => {
  const f = useCurrentFrame();
  const lines = text.split('\n');
  const size = o === 'wide' ? 80 : 92;
  return (
    <div style={{ textAlign: align }}>
      {lines.map((line, i) => {
        const p = prog(f, delay + i * 6, 22);
        return (
          <div key={i} style={{ overflow: 'hidden', paddingBottom: 6 }}>
            <div style={{
              fontSize: size, fontWeight: 800, lineHeight: 1.12, letterSpacing: -1.5, textWrap: 'balance',
              color: i === lines.length - 1 && lines.length > 1 ? C.sun : '#fff',
              transform: `translateY(${(1 - p) * 110}%)`,
            }}>{line}</div>
          </div>
        );
      })}
      <div style={{
        marginTop: 22, height: 8, width: 150 * prog(f, delay + 10, 24), borderRadius: 8,
        background: `linear-gradient(90deg, ${C.sun}, ${C.coral}, ${C.sky})`, marginLeft: align === 'center' ? 'auto' : 0, marginRight: align === 'center' ? 'auto' : 0,
      }} />
      {sub && (
        <div style={{
          marginTop: 26, fontSize: o === 'wide' ? 34 : 40, fontWeight: 400, lineHeight: 1.35, color: 'rgba(232,238,255,.85)',
          opacity: prog(f, delay + 14, 20), transform: `translateY(${(1 - prog(f, delay + 14, 20)) * 20}px)`,
        }}>{sub}</div>
      )}
    </div>
  );
};

type DeviceProps = {
  src: string; o: Orientation; dur: number; pan?: [number, number]; fit?: 'cover' | 'contain';
  wipeTo?: string; wipeAt?: number; ratio?: number;
  video?: boolean; browser?: boolean; width?: number; children?: React.ReactNode;
};

const Device: React.FC<DeviceProps> = ({ src, o, dur, pan = [0, 0], fit = 'cover', wipeTo, wipeAt = 0, ratio, video, browser, width, children }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: f - 6, fps, config: { damping: 18, stiffness: 90 } });
  const p = interpolate(f, [12, dur - 10], pan, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  const wide = browser ?? o === 'wide';
  const w = width ?? (wide ? 1120 : 780);
  // ratio: khung ôm sát ảnh section bề ngang (không thừa nền trắng)
  const h = wide ? (ratio ? Math.round(w / ratio) + 44 : 700) : 1240;
  const wipe = wipeTo ? prog(f, wipeAt, 26) : 0;
  const img = (s: string) => (
    <Img src={s} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: fit, objectPosition: `50% ${p}%`, background: C.paper }} />
  );
  return (
    <div style={{
      width: w, height: h, borderRadius: wide ? 22 : 72, overflow: 'hidden', position: 'relative', background: wide ? '#E6EEFF' : '#0D1424',
      border: wide ? '1px solid rgba(255,255,255,.4)' : '14px solid #0D1424',
      boxShadow: '0 60px 120px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.08)',
      transform: `perspective(1800px) translateY(${(1 - enter) * 140}px) rotateX(${(1 - enter) * 14}deg) scale(${0.92 + enter * 0.08})`,
      opacity: Math.min(1, enter * 1.5),
    }}>
      {wide && (
        <div style={{ height: 44, display: 'flex', alignItems: 'center', gap: 9, padding: '0 18px', background: '#fff', borderBottom: '1px solid #CCDBF7' }}>
          {[C.coral, C.sun, '#3BBF7A'].map((c) => <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />)}
          <div style={{ marginLeft: 18, flex: 1, maxWidth: 420, height: 26, borderRadius: 13, background: C.paper, color: '#3E5075', fontSize: 15, display: 'flex', alignItems: 'center', paddingLeft: 14 }}>
            scipal.io.vn
          </div>
        </div>
      )}
      <div style={{ position: 'absolute', inset: wide ? '44px 0 0 0' : 0, borderRadius: wide ? 0 : 58, overflow: 'hidden' }}>
        {video ? <OffthreadVideo src={src} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : img(src)}
        {children}
        {wipeTo && (
          <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 0 0 ${(1 - wipe) * 100}%)` }}>{img(wipeTo)}</div>
        )}
        {wipeTo && wipe > 0 && wipe < 1 && (
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${(1 - wipe) * 100}%`, width: 6, background: C.sun, boxShadow: `0 0 30px ${C.sun}` }} />
        )}
      </div>
    </div>
  );
};

const Split: React.FC<{ o: Orientation; text: React.ReactNode; device: React.ReactNode; center?: boolean }> = ({ o, text, device, center }) =>
  o === 'wide' ? (
    <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', padding: '0 90px 0 110px', gap: 70 }}>
      <div style={{ width: 560, flexShrink: 0 }}>{text}</div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>{device}</div>
    </AbsoluteFill>
  ) : (
    <AbsoluteFill style={{ alignItems: 'center', padding: '150px 90px 0' }}>
      <div style={{ width: '100%', minHeight: 420 }}>{text}</div>
      <div style={center ? { flex: 1, display: 'flex', alignItems: 'center', paddingBottom: 260 } : { marginTop: 20 }}>{device}</div>
    </AbsoluteFill>
  );

const Logo: React.FC<{ size: number }> = ({ size }) => (
  <Img src={staticFile('logo.svg')} style={{ width: size, height: size, borderRadius: size * 0.29, boxShadow: '0 24px 60px rgba(31,174,95,.45)' }} />
);

/* ---------- scenes ---------- */

const Hook: React.FC<TrailerProps & { dur: number }> = ({ lang, o, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = [C.sun, C.coral, C.sky];
  const out = prog(f, 72, 18);
  const pos = o === 'wide'
    ? [[-520, -120], [0, 90], [500, -60]]
    : [[-160, -420], [120, -60], [-60, 300]];
  return (
    <Scene dur={dur}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        {COPY.hookWords.map((w, i) => {
          const s = spring({ frame: f - 6 - i * 16, fps, config: { damping: 11, stiffness: 140 } });
          return (
            <div key={i} style={{
              position: 'absolute', fontSize: o === 'wide' ? 130 : 120, fontWeight: 800, color: colors[i], whiteSpace: 'nowrap',
              transform: `translate(${pos[i][0]}px, ${pos[i][1] - out * 60}px) scale(${s * (1 - out * 0.4)}) rotate(${(i - 1) * 5}deg)`,
              opacity: 1 - out,
            }}>{pick(w, lang)}</div>
          );
        })}
        <div style={{
          position: 'absolute', padding: '0 120px', textAlign: 'center', fontSize: o === 'wide' ? 84 : 92, fontWeight: 800, lineHeight: 1.15, color: '#fff', textWrap: 'balance', maxWidth: o === 'wide' ? 1500 : 1000,
          opacity: prog(f, 80, 20), transform: `translateY(${(1 - prog(f, 80, 20)) * 40}px)`,
        }}>{pick(COPY.hookLine, lang)}</div>
      </AbsoluteFill>
    </Scene>
  );
};

const Brand: React.FC<TrailerProps & { dur: number }> = ({ lang, o, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - 4, fps, config: { damping: 12, stiffness: 110 } });
  const ring = (rot: number, color: string) => (
    <ellipse cx="0" cy="0" rx="300" ry="110" fill="none" stroke={color} strokeWidth="5" strokeOpacity={0.7}
      transform={`rotate(${rot + f * 0.8})`} strokeDasharray="1400" strokeDashoffset={1400 * (1 - prog(f, 8, 40))} />
  );
  return (
    <Scene dur={dur}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <svg width="800" height="800" viewBox="-400 -400 800 800" style={{ position: 'absolute', top: o === 'wide' ? -10 : 380 }}>
          {ring(0, C.sun)}{ring(60, C.coral)}{ring(120, C.sky)}
        </svg>
        <div style={{ transform: `scale(${s}) rotate(${(1 - s) * -30}deg)` }}><Logo size={220} /></div>
        <div style={{ marginTop: 50, fontSize: 150, fontWeight: 800, color: '#fff', letterSpacing: -3, opacity: prog(f, 16), transform: `translateY(${(1 - prog(f, 16)) * 40}px)` }}>SciPal</div>
        <div style={{ fontSize: 46, fontWeight: 600, color: C.sun, opacity: prog(f, 28) }}>{pick(COPY.tagline, lang)}</div>
      </AbsoluteFill>
    </Scene>
  );
};

const Feature: React.FC<TrailerProps & {
  dur: number; title: { vi: string; en: string }; sub: { vi: string; en: string }; device: Omit<DeviceProps, 'o' | 'dur'>;
}> = ({ lang, o, dur, title, sub, device }) => (
  <Scene dur={dur}>
    <Split o={o} text={<Headline text={pick(title, lang)} sub={pick(sub, lang)} o={o} />} device={<Device {...device} o={o} dur={dur} />} />
  </Scene>
);

// Khớp PLAN trong scripts/record-3d.cjs (ms → frame, tọa độ theo tỉ lệ canvas)
const CURSOR = { dragStart: 60, dragEnd: 144, from: [0.45, 0.56], to: [0.535, 0.5], zoomStart: 162, zoomEnd: 183 };

const Cursor: React.FC = () => {
  const f = useCurrentFrame();
  const k = interpolate(f, [CURSOR.dragStart, CURSOR.dragEnd], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) });
  const toCenter = prog(f, CURSOR.dragEnd + 4, 14);
  const x = CURSOR.from[0] + (CURSOR.to[0] - CURSOR.from[0]) * k;
  const y = CURSOR.from[1] + (CURSOR.to[1] - CURSOR.from[1]) * k;
  const cx = x + (0.5 - x) * toCenter;
  const cy = y + (0.5 - y) * toCenter;
  const pressed = f >= CURSOR.dragStart && f <= CURSOR.dragEnd;
  const show = interpolate(f, [36, 50, 215, 235], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ripple = (delay: number) => {
    const r = prog(f, CURSOR.zoomStart + delay, 22);
    return r > 0 && r < 1 ? (
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 220 * r, height: 220 * r, transform: 'translate(-50%,-50%)', borderRadius: '50%', border: `4px solid ${C.sun}`, opacity: 1 - r }} />
    ) : null;
  };
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {ripple(0)}{ripple(7)}{ripple(14)}
      <div style={{ position: 'absolute', left: `${cx * 100}%`, top: `${cy * 100}%`, opacity: show }}>
        {pressed && <div style={{ position: 'absolute', left: -26, top: -26, width: 52, height: 52, borderRadius: '50%', background: 'rgba(245,184,46,.35)', border: `3px solid ${C.sun}` }} />}
        <svg width="46" height="46" viewBox="0 0 24 24" style={{ position: 'absolute', left: -6, top: -4, transform: `scale(${pressed ? 0.88 : 1})`, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.4))' }}>
          <path d="M4 2 L4 19 L8.5 14.8 L11.6 21.5 L14.4 20.2 L11.3 13.6 L17.5 13.6 Z" fill="#fff" stroke="#0B1F4A" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
};

const Interactive3D: React.FC<TrailerProps & { dur: number }> = ({ lang, o, dur }) => (
  <Scene dur={dur}>
    <Split
      o={o}
      center
      text={<Headline text={pick(COPY.sim3d, lang)} sub={pick(COPY.sim3dSub, lang)} o={o} />}
      device={
        <Device src={staticFile(`clips/harmonic-${lang}.mp4`)} video browser o={o} dur={dur} ratio={1218 / 760} width={o === 'wide' ? 1120 : 960}>
          <Cursor />
        </Device>
      }
    />
  </Scene>
);

const Stats: React.FC<TrailerProps & { dur: number }> = ({ lang, o, dur }) => {
  const f = useCurrentFrame();
  const colors = [C.sun, C.coral, C.sky];
  return (
    <Scene dur={dur}>
      <AbsoluteFill style={{ flexDirection: o === 'wide' ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: o === 'wide' ? 140 : 110 }}>
        {COPY.stats.map((s, i) => {
          const p = prog(f, 6 + i * 8, 34);
          return (
            <div key={i} style={{ textAlign: 'center', opacity: Math.min(1, p * 2), transform: `translateY(${(1 - p) * 50}px)` }}>
              <div style={{ fontSize: 210, fontWeight: 800, lineHeight: 1, color: colors[i], fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(s.n * p)}{s.suffix}
              </div>
              <div style={{ marginTop: 14, fontSize: 44, fontWeight: 600, color: '#fff' }}>{s[lang]}</div>
            </div>
          );
        })}
      </AbsoluteFill>
    </Scene>
  );
};

const Cta: React.FC<TrailerProps & { dur: number }> = ({ lang, o, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - 4, fps, config: { damping: 14 } });
  const pulse = 1 + Math.sin(f / 7) * 0.02 * prog(f, 40);
  return (
    <Scene dur={dur + FADE}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 34, transform: `scale(${s})` }}>
          <Logo size={o === 'wide' ? 140 : 160} />
          <div style={{ fontSize: o === 'wide' ? 120 : 130, fontWeight: 800, color: '#fff', letterSpacing: -3 }}>SciPal</div>
        </div>
        <div style={{ marginTop: 40, fontSize: o === 'wide' ? 64 : 76, fontWeight: 800, color: '#fff', opacity: prog(f, 16), padding: '0 80px' }}>
          {pick(COPY.cta, lang)}
        </div>
        <div style={{
          marginTop: 50, padding: '26px 64px', borderRadius: 80, fontSize: 56, fontWeight: 800, color: C.ink,
          background: `linear-gradient(90deg, ${C.sun}, ${C.coral})`, boxShadow: `0 20px 60px rgba(240,113,107,.45)`,
          opacity: prog(f, 26), transform: `translateY(${(1 - prog(f, 26)) * 30}px) scale(${pulse})`,
        }}>scipal.io.vn</div>
      </AbsoluteFill>
    </Scene>
  );
};

/* ---------- timeline ---------- */

const buildScenes = (p: TrailerProps) => {
  const list: [number, (dur: number) => React.ReactNode][] = [
    [150, (d) => <Hook {...p} dur={d} />],
    [135, (d) => <Brand {...p} dur={d} />],
    [195, (d) => <Feature {...p} dur={d} title={COPY.levels} sub={COPY.levelsSub} device={{ src: shot('picker', p), pan: [30, 55] }} />],
    [210, (d) => (
      <Feature {...p} dur={d} title={COPY.bilingual} sub={COPY.bilingualSub}
        device={{ src: shot('sec-landing', { ...p, lang: p.lang === 'vi' ? 'en' : 'vi' }), wipeTo: shot('sec-landing', p), wipeAt: 70, pan: [0, 25] }} />
    )],
    [195, (d) => <Feature {...p} dur={d} title={COPY.steps} sub={COPY.stepsSub} device={{ src: shot('sec-how', p), ratio: 1920 / 879, pan: [0, 100] }} />],
    [210, (d) => <Feature {...p} dur={d} title={COPY.tutor} sub={COPY.tutorSub} device={{ src: shot('sec-tutor', p), ratio: 1920 / 735, pan: [0, 100] }} />],
    [180, (d) => <Feature {...p} dur={d} title={COPY.lab} sub={COPY.labSub} device={{ src: shot('lab', p), pan: [0, 100] }} />],
    [285, (d) => <Interactive3D {...p} dur={d} />],
    [195, (d) => <Feature {...p} dur={d} title={COPY.pricing} sub={COPY.pricingSub} device={{ src: shot('sec-pricing', p), pan: [0, 100] }} />],
    [120, (d) => <Stats {...p} dur={d} />],
    [165, (d) => <Cta {...p} dur={d} />],
  ];
  let from = 0;
  return list.map(([dur, render], i) => {
    const seq = { from, dur, node: render(dur), key: i };
    from += dur - FADE;
    return seq;
  });
};

export const trailerDuration = (p: TrailerProps) => {
  const s = buildScenes(p);
  const last = s[s.length - 1];
  return last.from + last.dur;
};

export const Trailer: React.FC<TrailerProps> = (p) => (
  <AbsoluteFill style={{ fontFamily, color: '#fff' }}>
    <Backdrop />
    <Audio src={staticFile('music.wav')} />
    {buildScenes(p).map((s) => (
      <Sequence key={s.key} from={s.from} durationInFrames={s.dur}>{s.node}</Sequence>
    ))}
  </AbsoluteFill>
);
