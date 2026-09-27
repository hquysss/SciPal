import type { CSSProperties, ReactNode } from 'react';
import type { EducationLevel } from '../educationLevel';
import { LEVEL_OBJECT_IDS } from './levelObjects';
import styles from './hero.module.css';

type Tone = 'nav' | 'action' | 'surface' | 'ink' | 'sun' | 'coral' | 'sky';

const SIDE: Record<Tone, string> = {
  nav: styles.navSide,
  action: styles.actionSide,
  surface: styles.surfaceSide,
  ink: styles.inkSide,
  sun: styles.sunSide,
  coral: styles.coralSide,
  sky: styles.skySide,
};

const TOP: Record<Tone, string> = {
  nav: styles.nav,
  action: styles.action,
  surface: styles.surfaceTile,
  ink: styles.ink,
  sun: styles.sun,
  coral: styles.coral,
  sky: styles.sky,
};

/** Delay for one step of the build-up, read by the CSS animations. */
const at = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

/** A raised tile: a darker strip under the rounded top face reads as thickness. */
function Slab({ x, y, width, depth, height, tone, radius = 4 }: {
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  tone: Tone;
  radius?: number;
}) {
  return (
    <>
      <rect x={x} y={y + height} width={width} height={depth} rx={radius} className={SIDE[tone]} />
      <rect x={x} y={y} width={width} height={depth} rx={radius} className={TOP[tone]} />
    </>
  );
}

function Contact({ cx, cy, rx, ry }: { cx: number; cy: number; rx: number; ry: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} className={styles.contact} filter="url(#hero-soft)" />;
}

function Keys({ x, y, columns, rows, size, gap, tone = 'surface', accent, accentTone = 'action' }: {
  x: number;
  y: number;
  columns: number;
  rows: number;
  size: [number, number];
  gap: number;
  tone?: Tone;
  accent?: [number, number];
  accentTone?: Tone;
}) {
  const [width, height] = size;
  return (
    <>
      {Array.from({ length: rows }, (_, row) =>
        Array.from({ length: columns }, (_, column) => (
          <Slab
            key={`${row}-${column}`}
            x={x + column * (width + gap)}
            y={y + row * (height + gap + 1)}
            width={width}
            depth={height}
            height={2}
            radius={2}
            tone={accent && accent[0] === row && accent[1] === column ? accentTone : tone}
          />
        )),
      )}
    </>
  );
}

// Page outlines curve up from the spine; `dy` offsets the stacked sheets beneath.
const leftPage = (dy = 0) =>
  `M240 ${124 + dy} C204 ${108 + dy} 146 ${104 + dy} 100 ${112 + dy} L86 ${250 + dy} C136 ${244 + dy} 198 ${248 + dy} 240 ${262 + dy} Z`;
const rightPage = (dy = 0) =>
  `M240 ${124 + dy} C276 ${108 + dy} 334 ${104 + dy} 380 ${112 + dy} L394 ${250 + dy} C344 ${244 + dy} 282 ${248 + dy} 240 ${262 + dy} Z`;

const RULE_ROWS = [144, 162, 180, 198, 216, 234];

function Book() {
  return (
    <g className={styles.bookRise}>
      <Contact cx={240} cy={290} rx={186} ry={16} />
      <path d="M62 266 H418 L415 281 Q414 286 408 286 H72 Q66 286 65 281 Z" className={styles.navSide} />
      <path d="M86 104 H394 Q402 104 403 112 L420 262 Q421 270 413 270 H67 Q59 270 60 262 L77 112 Q78 104 86 104 Z" className={styles.nav} />

      <g className={styles.pageOpen} style={at(150)}>
        <path d={leftPage(7)} className={styles.pageEdge} />
        <path d={leftPage(3.5)} className={styles.pageEdgeLight} />
        <path d={leftPage()} className={styles.surface} />
        <path d={leftPage()} fill="url(#hero-gutter-left)" />
        <path d="M114 130 Q138 126 164 128" pathLength={1} className={`${styles.strokeTitle} ${styles.draw}`} style={at(650)} />
        {RULE_ROWS.map((y, index) => {
          const start = 100 - ((y - 112) * 14) / 138 + 14;
          return (
            <path
              key={y}
              d={`M${start} ${y - 4} Q${(start + 226) / 2} ${y - 6} 226 ${y + 4}`}
              pathLength={1}
              className={`${styles.strokeRule} ${styles.draw}`}
              style={at(720 + index * 60)}
            />
          );
        })}
      </g>

      <g className={styles.pageOpen} style={at(150)}>
        <path d={rightPage(7)} className={styles.pageEdge} />
        <path d={rightPage(3.5)} className={styles.pageEdgeLight} />
        <path d={rightPage()} className={styles.surface} />
        <path d={rightPage()} fill="url(#hero-gutter-right)" />
        <path d="M270 138 V230 H372" pathLength={1} className={`${styles.strokeAxis} ${styles.draw}`} style={at(760)} />
        <path d="M274 150 Q322 272 370 158" pathLength={1} className={`${styles.strokeCurve} ${styles.drawSlow}`} style={at(980)} />
        <path d="M322 212 V230" className={`${styles.strokeGuide} ${styles.fade}`} style={at(1500)} />
        <g className={styles.pop} style={at(1560)}>
          <circle cx={322} cy={211} r={9} className={styles.sun} />
          <circle cx={322} cy={211} r={5.5} className={styles.action} />
        </g>
      </g>

      <path d="M240 124 V262" className={styles.strokeSpine} />
      <path d="M250 122 L262 124 V302 L256 295 L250 302 Z" className={`${styles.coral} ${styles.ribbon}`} style={at(900)} />
    </g>
  );
}

interface SceneObject {
  shadow: ReactNode;
  body: ReactNode;
}

const BACK_OBJECT: Record<EducationLevel, SceneObject> = {
  primary: {
    shadow: <Contact cx={410} cy={130} rx={66} ry={8} />,
    body: (
      <g transform="rotate(-10 408 106)">
        <Slab x={346} y={90} width={124} depth={28} height={6} tone="surface" radius={3} />
        <rect x={346} y={110} width={124} height={8} rx={2} className={styles.sky} />
        {Array.from({ length: 15 }, (_, index) => (
          <path key={index} d={`M${354 + index * 8} 90 V${index % 2 ? 96 : 101}`} className={styles.strokeTick} />
        ))}
      </g>
    ),
  },
  lower_secondary: {
    shadow: <Contact cx={414} cy={158} rx={60} ry={8} />,
    body: (
      <g transform="rotate(10 410 104)">
        <path d="M362 58 L362 154 L462 154 Z" transform="translate(0 6)" className={`${styles.skySide} ${styles.roundJoin}`} />
        <path d="M362 58 L362 154 L462 154 Z" className={`${styles.sky} ${styles.roundJoin}`} />
        <path d="M376 100 L376 140 L416 140 Z" className={styles.glass} />
        {Array.from({ length: 9 }, (_, index) => (
          <path key={index} d={`M${372 + index * 10} 154 V${index % 2 ? 149 : 146}`} className={styles.strokeTick} />
        ))}
      </g>
    ),
  },
  upper_secondary: {
    shadow: <Contact cx={412} cy={146} rx={58} ry={8} />,
    body: (
      <g transform="rotate(-18 404 108)">
        <Slab x={424} y={102} width={42} depth={12} height={5} tone="coral" radius={6} />
        <circle cx={396} cy={112} r={30} className={styles.ringSide} />
        <circle cx={396} cy={108} r={30} className={styles.glass} />
        <circle cx={396} cy={108} r={30} className={styles.ring} />
        <path d="M378 98 Q383 86 396 84" className={styles.strokeGlint} />
      </g>
    ),
  },
};

const FRONT_OBJECTS: Record<EducationLevel, [SceneObject, SceneObject]> = {
  primary: [
    {
      shadow: <Contact cx={84} cy={306} rx={62} ry={8} />,
      body: (
        <g transform="rotate(-24 82 280)">
          <polygon points="32,270 32,290 6,280" className={styles.wood} />
          <polygon points="14,276 14,284 6,280" className={styles.ink} />
          <rect x={32} y={270} width={98} height={20} className={styles.sun} />
          <rect x={32} y={277} width={98} height={6} className={styles.sunSide} />
          <rect x={130} y={269} width={10} height={22} className={styles.metal} />
          <rect x={140} y={269} width={16} height={22} rx={4} className={styles.coral} />
        </g>
      ),
    },
    {
      shadow: <Contact cx={402} cy={326} rx={60} ry={8} />,
      body: (
        <g>
          {([
            [364, 236, styles.surfaceTile],
            [380, 230, styles.coralTile],
            [396, 240, styles.paperTile],
            [412, 234, styles.sunTile],
          ] as const).map(([x, y, className]) => (
            <rect key={x} x={x} y={y} width={11} height={40} rx={4} className={className} />
          ))}
          <rect x={350} y={260} width={104} height={14} rx={5} className={styles.skySide} />
          <rect x={350} y={268} width={104} height={52} rx={7} className={styles.sky} />
          <rect x={368} y={284} width={68} height={20} rx={3} className={styles.surface} />
          <path d="M376 291 H420 M376 297 H408" className={styles.strokeRule} />
        </g>
      ),
    },
  ],
  lower_secondary: [
    {
      shadow: <Contact cx={86} cy={318} rx={46} ry={7} />,
      body: (
        <g>
          <path d="M84 214 L54 304" className={styles.strokeLeg} />
          <path d="M84 214 L116 300" className={styles.strokeLegSide} />
          <polygon points="112,296 122,298 120,312" className={styles.wood} />
          <path d="M54 304 L52 314" className={styles.strokeNeedle} />
          <rect x={79} y={186} width={10} height={20} rx={4} className={styles.coralSide} />
          <circle cx={84} cy={212} r={11} className={styles.coral} />
          <circle cx={84} cy={212} r={3.5} className={styles.surface} />
        </g>
      ),
    },
    {
      shadow: <Contact cx={398} cy={330} rx={54} ry={8} />,
      body: (
        <g transform="rotate(-8 396 282)">
          <Slab x={352} y={236} width={88} depth={84} height={7} tone="ink" radius={10} />
          <rect x={362} y={246} width={68} height={20} rx={4} className={styles.glass} />
          <path d="M404 252 V260 M412 252 V260 M420 252 H424 V260" className={styles.strokeDigit} />
          <Keys x={363} y={276} columns={4} rows={3} size={[13, 10]} gap={4} accent={[2, 3]} accentTone="sun" />
        </g>
      ),
    },
  ],
  upper_secondary: [
    {
      shadow: <Contact cx={80} cy={318} rx={48} ry={8} />,
      body: (
        <g>
          <path d="M66 214 V246 L34 300 Q28 312 42 312 H114 Q128 312 122 300 L90 246 V214 Z" className={styles.glass} />
          <path d="M49 274 H107 L122 300 Q128 312 114 312 H42 Q28 312 34 300 Z" className={styles.sky} />
          <ellipse cx={78} cy={274} rx={29} ry={4} className={styles.liquidTop} />
          <path d="M66 214 V246 L34 300 Q28 312 42 312 H114 Q128 312 122 300 L90 246 V214 Z" className={styles.glassEdge} />
          <Slab x={60} y={202} width={36} depth={9} height={4} tone="surface" radius={4} />
          <path d="M50 292 L60 276" className={styles.strokeGlint} />
          <circle cx={86} cy={296} r={3} className={styles.bubble} />
          <circle cx={96} cy={286} r={2} className={styles.bubble} />
          <circle cx={74} cy={302} r={2} className={styles.bubble} />
        </g>
      ),
    },
    {
      shadow: <Contact cx={392} cy={326} rx={82} ry={9} />,
      body: (
        <g transform="rotate(-8 392 290)">
          <Slab x={316} y={262} width={152} depth={52} height={8} tone="ink" radius={8} />
          <Keys x={326} y={270} columns={9} rows={2} size={[12, 10]} gap={3} />
          <Slab x={326} y={298} width={12} depth={10} height={2} radius={2} tone="surface" />
          <Slab x={341} y={298} width={12} depth={10} height={2} radius={2} tone="surface" />
          <Slab x={356} y={298} width={72} depth={10} height={2} radius={2} tone="surface" />
          <Slab x={431} y={298} width={12} depth={10} height={2} radius={2} tone="surface" />
          <Slab x={446} y={298} width={12} depth={10} height={2} radius={2} tone="sun" />
        </g>
      ),
    },
  ],
};

/** An object that drops onto the desk; its shadow grows as it lands. */
function Drop({ object, delay }: { object: SceneObject; delay: number }) {
  return (
    <g style={at(delay)}>
      <g className={styles.shadowGrow}>{object.shadow}</g>
      <g className={styles.drop}>{object.body}</g>
    </g>
  );
}

/**
 * Desk scene drawn with faces and cast shadows for depth; every color is a theme token.
 * It builds itself once on arrival, and the three layers shift by different amounts
 * when the stage sets --px/--py from the pointer.
 */
export function HeroIllustration({ level }: { level: EducationLevel }) {
  const [frontLeft, frontRight] = FRONT_OBJECTS[level];
  return (
    <svg
      className={styles.art}
      viewBox="0 36 480 312"
      aria-hidden="true"
      focusable="false"
      data-level-objects={LEVEL_OBJECT_IDS[level].join(' ')}
    >
      <defs>
        <filter id="hero-soft" x="-30%" y="-150%" width="160%" height="400%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <linearGradient id="hero-gutter-left" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" className={styles.stopShade} />
          <stop offset="0.28" className={styles.stopClear} />
        </linearGradient>
        <linearGradient id="hero-gutter-right" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" className={styles.stopShade} />
          <stop offset="0.28" className={styles.stopClear} />
        </linearGradient>
      </defs>
      <g className={styles.layerBook}>
        <Book />
      </g>
      <g className={styles.layerBack}>
        <Drop object={BACK_OBJECT[level]} delay={620} />
      </g>
      <g className={styles.layerFront}>
        <Drop object={frontLeft} delay={780} />
        <Drop object={frontRight} delay={920} />
      </g>
    </svg>
  );
}
