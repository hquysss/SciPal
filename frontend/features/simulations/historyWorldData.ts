import type { HistoryWorldMap } from '@scipal/types';
import type { Bilingual } from './types';

// The built-in animated world maps, after the History 11 textbook (Kết nối tri thức). Countries are
// today's, by ISO 3166 alpha-3, as the textbook draws today's borders. The textbook draws only one
// moment; the stage each territory joins is the year of its main conquest or protectorate, so the
// slider can show the world being divided. Teachers cannot change these maps.

export type Power = 'uk' | 'fr' | 'de' | 'us' | 'ru' | 'es' | 'pt' | 'nl';

export const POWER_NAME: Record<Power, Bilingual> = {
  uk: { vi: 'Anh', en: 'Britain' },
  fr: { vi: 'Pháp', en: 'France' },
  de: { vi: 'Đức', en: 'Germany' },
  us: { vi: 'Mỹ', en: 'United States' },
  ru: { vi: 'Nga', en: 'Russia' },
  es: { vi: 'Tây Ban Nha', en: 'Spain' },
  pt: { vi: 'Bồ Đào Nha', en: 'Portugal' },
  nl: { vi: 'Hà Lan', en: 'the Netherlands' },
};

export type Territory = {
  iso: string;
  name: Bilingual;
  power: Power;
  /** First step the territory is tinted from. */
  from: number;
  /** Step from which it is independent, and the year shown on the map. */
  free?: { step: number; year: number; note?: Bilingual; /** No year on the map (a small neighbour already shows it). */ quiet?: boolean };
  home?: boolean;
};

export type WorldStep = { period: string; title: Bilingual; text: Bilingual; narration?: Partial<Record<'en' | 'vi', string>> };

export type WorldMapData = {
  view: 'world' | 'latin-america';
  title: Bilingual;
  source: Bilingual;
  /** The colour each power is painted with on this map: theme tokens, mixed where the textbook needs a hue the theme lacks. */
  colors: Partial<Record<Power, string>>;
  steps: WorldStep[];
  /** The year at each step's mark on the slider; the slider runs through the years in between. */
  years: number[];
  territories: Territory[];
};

const t = (vi: string, en: string): Bilingual => ({ vi, en });

// [iso, vi, en, step]
type Row = [string, string, string, number];
const rows = (power: Power, list: Row[], home?: string): Territory[] =>
  list.map(([iso, vi, en, from]) => ({ iso, name: t(vi, en), power, from, ...(iso === home ? { home: true } : {}) }));

const EMPIRES: WorldMapData = {
  view: 'world',
  title: t('Các đế quốc và thuộc địa đầu thế kỉ XX', 'Empires and colonies in the early 20th century'),
  source: t('Theo SGK Lịch sử 11, Hình 6 tr.15. Mốc từng vùng là năm chiếm hoặc đặt bảo hộ chủ yếu, có tính ước lượng.', 'After History 11, figure 6 p.15. The stage of each territory is the year of its main conquest or protectorate, approximately.'),
  colors: { uk: 'var(--success)', fr: 'var(--coral)', de: 'var(--sky)', us: 'color-mix(in srgb, var(--sky) 45%, var(--danger))', ru: 'var(--sun)' },
  years: [1869, 1884, 1899, 1914],
  steps: [
    {
      period: 'Trước 1870',
      title: t('Các đế quốc cũ và những vùng đất đầu tiên', 'The older empires and their first lands'),
      text: t(
        'Anh đã nắm Ấn Độ, Ca-na-đa, Ô-xtrây-li-a và đất Cáp ở Nam Phi; Pháp chiếm An-giê-ri; Nga mở rộng sang Xi-bi-ri và vùng Cáp-ca; Mỹ mở rộng lãnh thổ trên lục địa Bắc Mỹ. Phần lớn châu Phi vẫn chưa bị chia cắt.',
        'Britain already held India, Canada, Australia and the Cape in South Africa; France had taken Algeria; Russia had spread into Siberia and the Caucasus; the United States had grown across North America. Most of Africa was still undivided.',
      ),
      narration: { vi: '/audio/history/empires-1914/01.vi.mp3' },
    },
    {
      period: '1870–1884',
      title: t('Tranh giành thuộc địa bắt đầu sôi nổi', 'The scramble for colonies begins'),
      text: t(
        'Chủ nghĩa tư bản chuyển sang giai đoạn đế quốc, các nước đẩy mạnh xâm lược. Anh chiếm Ai Cập (1882); Pháp chiếm Tuy-ni-di (1881) và đặt ách bảo hộ lên Việt Nam (1884); Đức bắt đầu có thuộc địa ở châu Phi; Nga tiến vào Trung Á.',
        'As capitalism became imperialism the powers pushed harder. Britain took Egypt (1882); France took Tunisia (1881) and made Viet Nam a protectorate (1884); Germany won its first colonies in Africa; Russia advanced into Central Asia.',
      ),
      narration: { vi: '/audio/history/empires-1914/02.vi.mp3' },
    },
    {
      period: '1885–1899',
      title: t('Châu Phi bị chia cắt', 'Africa is carved up'),
      text: t(
        'Sau Hội nghị Béc-lin (1884–1885), các nước châu Âu chia nhau châu Phi: Anh chiếm một dải từ Ai Cập xuống Nam Phi, Pháp chiếm phần lớn Tây Phi và Ma-đa-ga-xca, Đức chiếm Đông Phi. Ở châu Á, Pháp lập Liên bang Đông Dương, Anh chiếm Mi-an-ma; năm 1898 Mỹ giành Phi-líp-pin từ tay Tây Ban Nha.',
        'After the Berlin Conference (1884–1885) the European powers divided Africa: Britain took a belt from Egypt down to South Africa, France most of West Africa and Madagascar, Germany East Africa. In Asia France formed French Indochina and Britain took Myanmar; in 1898 the United States won the Philippines from Spain.',
      ),
      narration: { vi: '/audio/history/empires-1914/03.vi.mp3' },
    },
    {
      period: '1900–1914',
      title: t('Thế giới bị chia xong', 'The world is divided'),
      text: t(
        'Đầu thế kỉ XX, Pháp chiếm nốt Tây Phi và Ma-rốc (1912). Thuộc địa của Anh rộng tới 33 triệu km² với 400 triệu người, gấp 12 lần thuộc địa của Đức và 3 lần thuộc địa của Pháp. Cuộc tranh giành chia lại thế giới dẫn tới Chiến tranh thế giới thứ nhất.',
        'In the early 1900s France took the rest of West Africa and Morocco (1912). Britain’s colonies covered 33 million km² with 400 million people, 12 times Germany’s and 3 times France’s. The fight to redivide the world led to the First World War.',
      ),
      narration: { vi: '/audio/history/empires-1914/04.vi.mp3' },
    },
  ],
  territories: [
    ...rows('uk', [
      ['GBR', 'Anh', 'Britain', 0], ['CAN', 'Ca-na-đa', 'Canada', 0], ['AUS', 'Ô-xtrây-li-a', 'Australia', 0], ['NZL', 'Niu Di-lân', 'New Zealand', 0],
      ['IND', 'Ấn Độ', 'India', 0], ['PAK', 'Pa-ki-xtan', 'Pakistan', 0], ['BGD', 'Băng-la-đét', 'Bangladesh', 0], ['LKA', 'Xri Lan-ca', 'Sri Lanka', 0],
      ['ZAF', 'Nam Phi', 'South Africa', 0], ['GMB', 'Găm-bi-a', 'The Gambia', 0], ['SLE', 'Xi-ê-ra Lê-ôn', 'Sierra Leone', 0], ['LSO', 'Lê-xô-thô', 'Lesotho', 0],
      ['GUY', 'Guy-a-na', 'Guyana', 0], ['BLZ', 'Bê-li-xê', 'Belize', 0], ['JAM', 'Gia-mai-ca', 'Jamaica', 0],
      ['EGY', 'Ai Cập', 'Egypt', 1], ['GHA', 'Ga-na', 'Ghana', 1], ['MYS', 'Ma-lai-xi-a', 'Malaysia', 1], ['CYP', 'Síp', 'Cyprus', 1], ['FJI', 'Phi-gi', 'Fiji', 1],
      ['MMR', 'Mi-an-ma', 'Myanmar', 2], ['KEN', 'Kê-ni-a', 'Kenya', 2], ['UGA', 'U-gan-đa', 'Uganda', 2], ['SDN', 'Xu-đăng', 'Sudan', 2], ['SDS', 'Nam Xu-đăng', 'South Sudan', 2],
      ['ZWE', 'Dim-ba-bu-ê', 'Zimbabwe', 2], ['ZMB', 'Dăm-bi-a', 'Zambia', 2], ['MWI', 'Ma-la-uy', 'Malawi', 2], ['BWA', 'Bốt-xoa-na', 'Botswana', 2], ['NGA', 'Ni-giê-ri-a', 'Nigeria', 2],
      ['BRN', 'Bru-nây', 'Brunei', 2], ['SLB', 'Quần đảo Xô-lô-môn', 'Solomon Islands', 2], ['KWT', 'Cô-oét', 'Kuwait', 2], ['SWZ', 'Xoa-di-len', 'Eswatini', 3],
    ], 'GBR'),
    ...rows('fr', [
      ['FRA', 'Pháp', 'France', 0], ['DZA', 'An-giê-ri', 'Algeria', 0], ['SEN', 'Xê-nê-gan', 'Senegal', 0], ['KHM', 'Cam-pu-chia', 'Cambodia', 0],
      ['TUN', 'Tuy-ni-di', 'Tunisia', 1], ['VNM', 'Việt Nam', 'Viet Nam', 1], ['GIN', 'Ghi-nê', 'Guinea', 1],
      ['LAO', 'Lào', 'Laos', 2], ['MDG', 'Ma-đa-ga-xca', 'Madagascar', 2], ['MLI', 'Ma-li', 'Mali', 2], ['BFA', 'Buốc-ki-na Pha-xô', 'Burkina Faso', 2], ['BEN', 'Bê-nanh', 'Benin', 2],
      ['CIV', 'Cốt Đi-voa', 'Ivory Coast', 2], ['GAB', 'Ga-bông', 'Gabon', 2], ['COG', 'Cộng hoà Công-gô', 'Republic of the Congo', 2], ['CAF', 'Trung Phi', 'Central African Republic', 2], ['DJI', 'Gi-bu-ti', 'Djibouti', 2],
      ['MAR', 'Ma-rốc', 'Morocco', 3], ['MRT', 'Mô-ri-ta-ni', 'Mauritania', 3], ['NER', 'Ni-giê', 'Niger', 3], ['TCD', 'Sát', 'Chad', 3],
    ], 'FRA'),
    ...rows('de', [
      ['DEU', 'Đức', 'Germany', 0],
      ['NAM', 'Na-mi-bi-a', 'Namibia', 1], ['CMR', 'Ca-mơ-run', 'Cameroon', 1], ['TGO', 'Tô-gô', 'Togo', 1],
      ['TZA', 'Tan-da-ni-a', 'Tanzania', 2], ['RWA', 'Ru-an-đa', 'Rwanda', 2], ['BDI', 'Bu-run-đi', 'Burundi', 2],
    ], 'DEU'),
    ...rows('us', [['USA', 'Mỹ', 'United States', 0], ['PHL', 'Phi-líp-pin', 'Philippines', 2], ['PRI', 'Pu-éc-tô Ri-cô', 'Puerto Rico', 2]], 'USA'),
    ...rows('ru', [
      ['RUS', 'Nga', 'Russia', 0], ['KAZ', 'Ca-dắc-xtan', 'Kazakhstan', 0], ['GEO', 'Gru-di-a', 'Georgia', 0], ['ARM', 'Ác-mê-ni-a', 'Armenia', 0], ['AZE', 'A-déc-bai-gian', 'Azerbaijan', 0],
      ['UZB', 'U-dơ-bê-ki-xtan', 'Uzbekistan', 1], ['TKM', 'Tuốc-mê-ni-xtan', 'Turkmenistan', 1], ['KGZ', 'Cư-rơ-gư-xtan', 'Kyrgyzstan', 1], ['TJK', 'Tát-gi-ki-xtan', 'Tajikistan', 1],
    ], 'RUS'),
  ],
};

// [iso, vi, en, power, free step, year]
type Free = [string, string, string, Power, number, number];
const LATIN: Free[] = [
  ['HTI', 'Ha-i-ti', 'Haiti', 'fr', 1, 1804],
  ['VEN', 'Vê-nê-xu-ê-la', 'Venezuela', 'es', 2, 1811], ['PRY', 'Pa-ra-goay', 'Paraguay', 'es', 2, 1811], ['ARG', 'Ác-hen-ti-na', 'Argentina', 'es', 2, 1816],
  ['CHL', 'Chi-lê', 'Chile', 'es', 2, 1818], ['COL', 'Cô-lôm-bi-a', 'Colombia', 'es', 2, 1819],
  ['MEX', 'Mê-hi-cô', 'Mexico', 'es', 3, 1821], ['GTM', 'Goa-tê-ma-la', 'Guatemala', 'es', 3, 1821], ['HND', 'Hôn-đu-rát', 'Honduras', 'es', 3, 1821],
  ['SLV', 'En Xan-va-đo', 'El Salvador', 'es', 3, 1821], ['NIC', 'Ni-ca-ra-goa', 'Nicaragua', 'es', 3, 1821], ['CRI', 'Cô-xta Ri-ca', 'Costa Rica', 'es', 3, 1821],
  ['PAN', 'Pa-na-ma', 'Panama', 'es', 3, 1821], ['PER', 'Pê-ru', 'Peru', 'es', 3, 1821], ['BRA', 'Bra-xin', 'Brazil', 'pt', 3, 1822], ['BOL', 'Bô-li-vi-a', 'Bolivia', 'es', 3, 1825],
  ['URY', 'U-ru-goay', 'Uruguay', 'es', 4, 1828], ['ECU', 'Ê-cu-a-đo', 'Ecuador', 'es', 4, 1830], ['DOM', 'Đô-mi-ni-ca-na', 'Dominican Republic', 'es', 4, 1844],
];

const LATIN_AMERICA: WorldMapData = {
  view: 'latin-america',
  title: t('Mỹ La-tinh giành độc lập', 'Latin America wins independence'),
  source: t('Theo SGK Lịch sử 11, Hình 4 tr.14: thuộc địa trước khi giành độc lập và năm giành độc lập của các nước.', 'After History 11, figure 4 p.14: the colonies before independence and the year each country won it.'),
  colors: { es: 'var(--sun)', pt: 'var(--sky)', uk: 'var(--success)', fr: 'var(--coral)', nl: 'var(--warning)' },
  years: [1800, 1804, 1819, 1825, 1844],
  steps: [
    {
      period: 'Trước 1804',
      title: t('Thuộc địa của các nước châu Âu', 'Colonies of the European powers'),
      text: t(
        'Gần như toàn bộ khu vực Mỹ La-tinh là thuộc địa: Tây Ban Nha nắm phần lớn lục địa, Bồ Đào Nha nắm Bra-xin; Anh, Pháp, Hà Lan giữ một số đảo và vùng ven biển Ca-ri-bê.',
        'Almost all of Latin America was colonial: Spain held most of the continent and Portugal held Brazil; Britain, France and the Netherlands held islands and coasts around the Caribbean.',
      ),
      narration: { vi: '/audio/history/latin-america-independence/01.vi.mp3' },
    },
    {
      period: '1804',
      title: t('Ha-i-ti mở đầu', 'Haiti leads the way'),
      text: t('Năm 1804, Ha-i-ti giành độc lập từ tay Pháp, trở thành nước đầu tiên ở Mỹ La-tinh thoát khỏi ách thuộc địa.', 'In 1804 Haiti won independence from France, the first country in Latin America to throw off colonial rule.'),
      narration: { vi: '/audio/history/latin-america-independence/02.vi.mp3' },
    },
    {
      period: '1810–1819',
      title: t('Làn sóng lan khắp Nam Mỹ', 'The wave spreads across South America'),
      text: t(
        'Nửa đầu thế kỉ XIX, phong trào đấu tranh giành độc lập bùng nổ ở hàng loạt thuộc địa của Tây Ban Nha: Vê-nê-xu-ê-la, Pa-ra-goay (1811), Ác-hen-ti-na (1816), Chi-lê (1818), Cô-lôm-bi-a (1819).',
        'In the early 19th century independence struggles broke out across Spain’s colonies: Venezuela and Paraguay (1811), Argentina (1816), Chile (1818), Colombia (1819).',
      ),
      narration: { vi: '/audio/history/latin-america-independence/03.vi.mp3' },
    },
    {
      period: '1820–1825',
      title: t('Đỉnh cao của phong trào', 'The peak of the movement'),
      text: t(
        'Mê-hi-cô, các nước Trung Mỹ và Pê-ru giành độc lập năm 1821, Bra-xin tách khỏi Bồ Đào Nha năm 1822, Bô-li-vi-a năm 1825. Các quốc gia tư sản lần lượt ra đời.',
        'Mexico, the Central American countries and Peru won independence in 1821, Brazil broke from Portugal in 1822 and Bolivia followed in 1825. One bourgeois state after another was born.',
      ),
      narration: { vi: '/audio/history/latin-america-independence/04.vi.mp3' },
    },
    {
      period: '1826–1844',
      title: t('Hoàn thành độc lập', 'Independence completed'),
      text: t(
        'U-ru-goay (1828), Ê-cu-a-đo (1830) và Đô-mi-ni-ca-na (1844) giành độc lập. Hệ thống thuộc địa của Tây Ban Nha và Bồ Đào Nha ở lục địa Mỹ La-tinh sụp đổ; chỉ còn một số thuộc địa nhỏ của Anh, Pháp, Hà Lan và các đảo Cu-ba, Pu-éc-tô Ri-cô của Tây Ban Nha.',
        'Uruguay (1828), Ecuador (1830) and the Dominican Republic (1844) won independence. The Spanish and Portuguese colonial systems on the mainland had fallen; only small British, French and Dutch colonies and Spain’s Cuba and Puerto Rico remained.',
      ),
      narration: { vi: '/audio/history/latin-america-independence/05.vi.mp3' },
    },
  ],
  territories: [
    ...LATIN.map(([iso, vi, en, power, step, year]): Territory => ({
      iso,
      name: t(vi, en),
      power,
      from: 0,
      free: {
        step,
        year,
        ...(iso === 'DOM' ? { note: t('Thoát khỏi sự cai trị của Ha-i-ti.', 'Broke away from Haitian rule.') } : {}),
        // Central America is too small for five labels: Guatemala's "1821" speaks for its neighbours.
        ...(['HND', 'SLV', 'NIC', 'CRI'].includes(iso) ? { quiet: true } : {}),
      },
    })),
    ...rows('es', [['CUB', 'Cu-ba', 'Cuba', 0], ['PRI', 'Pu-éc-tô Ri-cô', 'Puerto Rico', 0]]),
    ...rows('uk', [['JAM', 'Gia-mai-ca', 'Jamaica', 0], ['BLZ', 'Bê-li-xê', 'Belize', 0], ['GUY', 'Guy-a-na', 'Guyana', 0], ['BHS', 'Ba-ha-mát', 'The Bahamas', 0], ['TTO', 'Tri-ni-đát và Tô-ba-gô', 'Trinidad and Tobago', 0]]),
    ...rows('nl', [['SUR', 'Xu-ri-nam', 'Suriname', 0]]),
  ],
};

export const WORLD_MAPS: Record<HistoryWorldMap, WorldMapData> = {
  'empires-1914': EMPIRES,
  'latin-america': LATIN_AMERICA,
};

/** What a territory looks like at a step: not yet taken, a colony of its power, or independent. */
export function territoryState(territory: Territory, step: number): 'none' | 'colony' | 'free' {
  if (territory.free && step >= territory.free.step) return 'free';
  return step >= territory.from ? 'colony' : 'none';
}

export type Spread = { delay: number; from: [number, number] };
type Point = [number, number];

const SPREAD_MS = 2200;
const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/**
 * How the territories that change at `step` spread over the map: each one starts after `delay` ms
 * and fills outward from `from`. A colony grows out of the nearest land its power already holds
 * (or its home country), the nearer first; independence goes year by year, and within a year from
 * the nearest country already free. `points` are the label points of the outlines.
 */
export function spreadDelays(map: WorldMapData, step: number, points: Map<string, Point>): Map<string, Spread> {
  const at = (iso: string) => points.get(iso);
  const changed = map.territories.filter((tr) => !tr.home && at(tr.iso) && (tr.free ? tr.free.step === step : tr.from === step));
  const out = new Map<string, Spread>();
  if (changed.length === 0) return out;

  const nearest = (p: Point, sources: Point[]): { point: Point; d: number } =>
    sources.reduce((best, s) => (dist(p, s) < best.d ? { point: s, d: dist(p, s) } : best), { point: p, d: sources.length ? Infinity : 0 });

  const freeing = changed.filter((tr) => tr.free);
  const years = [...new Set(freeing.map((tr) => tr.free!.year))].sort((a, b) => a - b);
  const freeBefore = map.territories.filter((tr) => tr.free && tr.free.step < step && at(tr.iso)).map((tr) => at(tr.iso)!);
  const yearGap = SPREAD_MS / Math.max(years.length, 1);
  for (const tr of freeing) {
    const p = at(tr.iso)!;
    const y = years.indexOf(tr.free!.year);
    const sources = [...freeBefore, ...freeing.filter((o) => years.indexOf(o.free!.year) < y).map((o) => at(o.iso)!)];
    const { point, d } = nearest(p, sources);
    out.set(tr.iso, { delay: Math.round(y * yearGap + Math.min(d, 200) * (yearGap * 0.5) / 200), from: point });
  }

  const taking = changed.filter((tr) => !tr.free);
  const reach = taking.map((tr) => {
    const held = map.territories.filter((o) => o.power === tr.power && o.iso !== tr.iso && (o.home || o.from < step) && at(o.iso)).map((o) => at(o.iso)!);
    return { tr, ...nearest(at(tr.iso)!, held) };
  });
  // Each empire spreads over the whole time, measured against its own farthest new land.
  for (const r of reach) {
    const far = Math.max(...reach.filter((o) => o.tr.power === r.tr.power).map((o) => o.d), 1);
    out.set(r.tr.iso, { delay: Math.round((r.d / far) * SPREAD_MS), from: r.point });
  }
  return out;
}

/** The year shown at a slider position (in steps, fractional between marks). */
export function yearAt(map: WorldMapData, pos: number): number {
  const i = Math.min(Math.floor(pos), map.years.length - 2);
  if (i < 0) return map.years[0]!;
  const [a, b] = [map.years[i]!, map.years[i + 1] ?? map.years[i]!];
  return Math.round(a + (b - a) * Math.min(Math.max(pos - i, 0), 1));
}

/** The slider position of a year. */
export function posOfYear(map: WorldMapData, year: number): number {
  for (let i = 1; i < map.years.length; i += 1) {
    const [a, b] = [map.years[i - 1]!, map.years[i]!];
    if (year <= b) return i - 1 + (b === a ? 1 : (year - a) / (b - a));
  }
  return map.years.length - 1;
}

export type Change = { at: number; from: [number, number] };

/**
 * Where on the slider each territory changes, so the map follows the slider continuously:
 * independence at its real year; a colony within its step, the nearer to its empire the earlier
 * (the order of `spreadDelays`). `from` is where the colour spreads out from.
 */
export function changes(map: WorldMapData, points: Map<string, [number, number]>): { taken: Map<string, Change>; freed: Map<string, Change> } {
  const taken = new Map<string, Change>();
  const freed = new Map<string, Change>();
  for (let step = 0; step < map.steps.length; step += 1) {
    const spread = spreadDelays(map, step, points);
    for (const tr of map.territories) {
      const p = points.get(tr.iso) ?? [0, 0];
      if (tr.from === step) {
        const s = !tr.free && spread.get(tr.iso);
        taken.set(tr.iso, { at: step === 0 ? 0 : step - 1 + 0.08 + 0.84 * ((s ? s.delay : 0) / SPREAD_MS), from: s ? s.from : p });
      }
      if (tr.free?.step === step) freed.set(tr.iso, { at: posOfYear(map, tr.free.year), from: spread.get(tr.iso)?.from ?? p });
    }
  }
  return { taken, freed };
}

/** A territory at a slider position. */
export function stateAt(iso: string, pos: number, c: ReturnType<typeof changes>): 'none' | 'colony' | 'free' {
  const free = c.freed.get(iso);
  if (free && pos >= free.at - 1e-6) return 'free';
  const taken = c.taken.get(iso);
  return taken && pos >= taken.at - 1e-6 ? 'colony' : 'none';
}
