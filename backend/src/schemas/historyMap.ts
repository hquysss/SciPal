import { z } from 'zod';

// A history map on real terrain: a slider walks through the stages, each adding the areas won so
// far and the marches of that stage. Points are [longitude, latitude] (WGS84) inside the region's
// bounds; the terrain for each region is built once by scripts/assets/build_history_terrain.py.
// Keep backend/src/schemas/historyMap.ts in sync.

/** Bounds of the prebuilt terrains (frontend/public/models/history/<region>/). */
export const HISTORY_MAP_REGIONS = {
  // Viet Nam with the Hoang Sa and Truong Sa archipelagos.
  'viet-nam': { west: 102, south: 7, east: 118, north: 24 },
} as const;
export type HistoryMapRegion = keyof typeof HISTORY_MAP_REGIONS;

const LonLat = z.tuple([z.number().finite().min(-180).max(180), z.number().finite().min(-90).max(90)]);
const Text = (max: number) => z.object({ en: z.string().max(max), vi: z.string().max(max) });
const Side = z.enum(['ours', 'enemy']);

const Place = z.object({
  name: Text(80),
  lon: z.number().finite().min(-180).max(180),
  lat: z.number().finite().min(-90).max(90),
  /** city: a town or citadel · battle: a victory · base: a base or headquarters · area: a region or sea name, no dot. */
  type: z.enum(['city', 'battle', 'base', 'area']).default('city'),
  /** First step (index) the place is shown from; 0 = always. */
  from: z.number().int().min(0).max(11).default(0),
  /** Shown when the place is tapped. */
  note: Text(300).optional(),
});

const Step = z.object({
  /** The years shown on the slider, e.g. "1418–1423". */
  period: z.string().min(1).max(20),
  title: Text(120),
  text: Text(800),
  /** Areas held from this step on (they stay on later steps); clipped to land. */
  areas: z.array(z.object({ side: Side.default('ours'), points: z.array(LonLat).min(3).max(64) })).max(6).default([]),
  /** Marches of this step, drawn in order of travel; dashed for a retreat. */
  routes: z.array(z.object({ side: Side.default('ours'), dashed: z.boolean().default(false), points: z.array(LonLat).min(2).max(24) })).max(10).default([]),
});

const t = (vi: string, en: string) => ({ vi, en });
type P = [number, number];

// Lam Sơn uprising, after Hình 3 (lược đồ) and Hình 4 (diễn biến), SGK Lịch sử 11 Kết nối tri thức,
// tr.53–54. Positions marked ≈ are estimated from the textbook map.
const LAM_SON = {
  places: [
    { name: t('Lam Sơn', 'Lam Son'), lon: 105.4, lat: 19.92, type: 'base', note: t('Quê hương Lê Lợi, nơi dựng cờ khởi nghĩa đầu năm 1418.', 'Le Loi’s home, where he raised the uprising in early 1418.') },
    { name: t('Núi Chí Linh', 'Chi Linh Mountain'), lon: 105.2, lat: 20.12, type: 'area', note: t('Vùng núi hiểm trở ở Thanh Hoá; nghĩa quân ba lần rút lên đây khi căn cứ bị vây.', 'Rugged mountains in Thanh Hoa; the army withdrew here three times when its base was surrounded.') },
    { name: t('Tây Đô', 'Tay Do'), lon: 105.61, lat: 20.08, type: 'city', note: t('Thành của quân Minh ở Thanh Hoá, bị nghĩa quân bao vây.', 'A Ming citadel in Thanh Hoa, besieged by the army.') },
    { name: t('Đông Quan', 'Dong Quan'), lon: 105.85, lat: 21.03, type: 'city', note: t('Thành Thăng Long thời Minh đô hộ, nơi đóng quân chủ lực của quân Minh. Ngày 10-12-1427, Hội thề Đông Quan chấm dứt chiến tranh.', 'Thang Long under Ming rule, the Ming headquarters. On 10 December 1427 the Dong Quan meeting ended the war.') },
    { name: t('Đại Minh', 'Ming China'), lon: 107.6, lat: 23.4, type: 'area' },
    { name: t('Vịnh Bắc Bộ', 'Gulf of Tonkin'), lon: 107.4, lat: 19.9, type: 'area' },
    { name: t('Biển Đông', 'East Sea'), lon: 112.2, lat: 14.2, type: 'area' },
    { name: t('Quần đảo Hoàng Sa (Việt Nam)', 'Hoang Sa Archipelago (Viet Nam)'), lon: 112, lat: 16.5, type: 'area' },
    { name: t('Quần đảo Trường Sa (Việt Nam)', 'Truong Sa Archipelago (Viet Nam)'), lon: 114.3, lat: 10, type: 'area' },
    { name: t('Đa Căng', 'Da Cang'), lon: 105.48, lat: 19.84, type: 'battle', from: 2, note: t('≈ Vị trí ước lượng theo lược đồ. Nghĩa quân đánh bại quân Minh trên đường tiến vào Nghệ An.', '≈ Estimated position. The army beat the Ming here on its way into Nghe An.') },
    { name: t('Trà Lân', 'Tra Lan'), lon: 104.88, lat: 19.03, type: 'city', from: 2, note: t('≈ Thành của quân Minh ở miền tây Nghệ An, bị nghĩa quân bao vây.', '≈ A Ming citadel in western Nghe An, besieged by the army.') },
    { name: t('Khả Lưu', 'Kha Luu'), lon: 105.05, lat: 18.9, type: 'battle', from: 2, note: t('≈ Nơi nghĩa quân đánh bại quân Minh.', '≈ Where the army beat the Ming.') },
    { name: t('Lục Niên', 'Luc Nien'), lon: 105.42, lat: 18.7, type: 'base', from: 2, note: t('≈ Sở chỉ huy của nghĩa quân ở Nghệ An.', '≈ The army’s headquarters in Nghe An.') },
    { name: t('Nghệ An', 'Nghe An'), lon: 105.68, lat: 18.68, type: 'city', from: 2, note: t('Thành của quân Minh, bị bao vây; cuối năm 1424 nghĩa quân giải phóng Nghệ An.', 'A Ming citadel, besieged; late in 1424 the army freed Nghe An.') },
    { name: t('Diễn Châu', 'Dien Chau'), lon: 105.6, lat: 19.0, type: 'city', from: 2 },
    { name: t('Tân Bình', 'Tan Binh'), lon: 106.6, lat: 17.48, type: 'city', from: 2 },
    { name: t('Thuận Hoá', 'Thuan Hoa'), lon: 107.58, lat: 16.47, type: 'city', from: 2 },
    { name: t('Đèo Hải Vân', 'Hai Van Pass'), lon: 108.13, lat: 16.19, type: 'area', from: 2 },
    { name: t('Tốt Động – Chúc Động', 'Tot Dong – Chuc Dong'), lon: 105.7, lat: 20.92, type: 'battle', from: 3, note: t('Tháng 11-1426, nghĩa quân giành thắng lợi lớn, quân Minh thất bại nặng nề.', 'In November 1426 the army won a great victory and the Ming suffered heavy losses.') },
    { name: t('Tam Giang', 'Tam Giang'), lon: 105.4, lat: 21.32, type: 'city', from: 3 },
    { name: t('Cổ Lộng', 'Co Long'), lon: 106.02, lat: 20.33, type: 'city', from: 3 },
    { name: t('Chí Linh (Hải Dương)', 'Chi Linh (Hai Duong)'), lon: 106.4, lat: 21.13, type: 'city', from: 3 },
    { name: t('Chi Lăng', 'Chi Lang'), lon: 106.6, lat: 21.66, type: 'battle', from: 3, note: t('Ải hiểm ở Lạng Sơn; tháng 10-1427, nghĩa quân chặn đánh viện binh quân Minh.', 'A narrow pass in Lang Son; in October 1427 the army ambushed the Ming relief army.') },
    { name: t('Xương Giang', 'Xuong Giang'), lon: 106.2, lat: 21.29, type: 'battle', from: 3, note: t('Bắc Giang; nghĩa quân tiêu diệt viện binh quân Minh.', 'Bac Giang; the army destroyed the Ming relief army.') },
  ],
  steps: [
    {
      period: '1418–1423',
      title: t('Những năm đầu của cuộc khởi nghĩa', 'The first years of the uprising'),
      text: t(
        'Đầu năm 1418, Lê Lợi dựng cờ khởi nghĩa ở Lam Sơn (Thanh Hoá), tự xưng Bình Định Vương. Căn cứ nhiều lần bị quân Minh bao vây, nghĩa quân gặp nhiều khó khăn, phải ba lần rút lên vùng núi Chí Linh.',
        'In early 1418 Le Loi raised the uprising at Lam Son (Thanh Hoa) and took the title Binh Dinh Vuong. His base was surrounded by the Ming many times and the army had to withdraw to the Chi Linh mountains three times.',
      ),
      areas: [{ side: 'ours', points: [[104.5, 20.55], [105.2, 20.7], [105.62, 20.3], [105.72, 19.9], [105.3, 19.55], [104.6, 19.7], [104.3, 20.1]] as P[] }],
      routes: [{ side: 'ours', dashed: true, points: [[105.4, 19.92], [105.3, 20.02], [105.2, 20.12]] as P[] }],
    },
    {
      period: '1423–1424',
      title: t('Tạm hoà hoãn', 'A truce'),
      text: t(
        'Năm 1423, Lê Lợi tạm hoà hoãn với quân Minh để củng cố lực lượng, tìm phương hướng mới.',
        'In 1423 Le Loi made a truce with the Ming to rebuild his forces and look for a new direction.',
      ),
      areas: [],
      routes: [],
    },
    {
      period: '1424–1425',
      title: t('Mở rộng hoạt động, giành những thắng lợi đầu tiên', 'Spreading out: the first victories'),
      text: t(
        'Theo kế của Nguyễn Chích, nghĩa quân chuyển hướng vào Nghệ An để mở rộng địa bàn. Cuối năm 1424, nghĩa quân giải phóng Nghệ An, rồi giải phóng vùng rộng lớn từ Thanh Hoá đến đèo Hải Vân. Quân Minh ở Nghệ An phải rút chạy về Đông Quan.',
        'Following Nguyen Chich’s plan, the army turned south into Nghe An to widen its ground. Late in 1424 it freed Nghe An, then the whole stretch from Thanh Hoa to the Hai Van Pass. The Ming in Nghe An fled back to Dong Quan.',
      ),
      areas: [{
        side: 'ours',
        points: [[104.3, 19.6], [105.3, 19.55], [105.95, 19.75], [106.2, 19.0], [106.3, 18.3], [106.9, 17.6], [107.4, 16.95], [107.9, 16.6], [108.3, 16.2], [107.9, 15.95], [107.3, 16.3], [106.7, 16.9], [106.0, 17.6], [105.5, 18.2], [104.8, 18.8], [104.2, 19.2]] as P[],
      }],
      routes: [
        { side: 'ours', points: [[105.4, 19.92], [105.48, 19.84], [105.1, 19.45], [104.88, 19.03]] as P[] },
        { side: 'ours', points: [[104.88, 19.03], [105.05, 18.9], [105.42, 18.7], [105.68, 18.68]] as P[] },
        { side: 'ours', points: [[105.42, 18.7], [105.6, 19.0], [105.65, 19.55], [105.61, 20.08]] as P[] },
        { side: 'ours', points: [[105.75, 18.4], [106.2, 17.95], [106.6, 17.48]] as P[] },
        { side: 'ours', points: [[106.6, 17.48], [107.1, 16.95], [107.58, 16.47]] as P[] },
        { side: 'enemy', dashed: true, points: [[105.8, 18.75], [106.15, 19.3], [106.25, 20.1], [106.0, 20.7], [105.85, 21.03]] as P[] },
      ],
    },
    {
      period: '1426–1428',
      title: t('Tiến quân ra Bắc, khởi nghĩa toàn thắng', 'Marching north: final victory'),
      text: t(
        'Tháng 9-1426, nghĩa quân chia làm ba đạo tiến ra Bắc. Tháng 11-1426, nghĩa quân thắng lớn ở Tốt Động – Chúc Động, siết chặt vây hãm thành Đông Quan. Tháng 10-1427, viện binh quân Minh bị chặn đánh ở Chi Lăng, Xương Giang. Ngày 10-12-1427, Hội thề Đông Quan chấm dứt chiến tranh; tháng 1-1428, quân Minh rút hết về nước.',
        'In September 1426 the army marched north in three columns. In November 1426 it won a great victory at Tot Dong – Chuc Dong and tightened the siege of Dong Quan. In October 1427 the Ming relief armies were cut down at Chi Lang and Xuong Giang. On 10 December 1427 the Dong Quan meeting ended the war, and by January 1428 the last Ming troops had gone home.',
      ),
      areas: [{
        side: 'ours',
        points: [[103.0, 22.5], [104.5, 22.9], [105.5, 23.3], [106.7, 22.9], [107.6, 21.6], [106.9, 20.9], [106.5, 20.2], [105.8, 20.0], [105.0, 20.6], [104.0, 21.3], [103.0, 21.8]] as P[],
      }],
      routes: [
        { side: 'ours', points: [[105.55, 20.15], [105.45, 20.7], [105.4, 21.32]] as P[] },
        { side: 'ours', points: [[105.65, 20.15], [105.7, 20.92], [105.85, 21.03]] as P[] },
        { side: 'ours', points: [[105.75, 20.1], [106.02, 20.33], [106.3, 20.8], [106.4, 21.13]] as P[] },
        { side: 'enemy', points: [[106.8, 22.4], [106.7, 21.95], [106.6, 21.66], [106.2, 21.29]] as P[] },
        { side: 'ours', points: [[106.4, 21.13], [106.3, 21.4], [106.6, 21.66]] as P[] },
      ],
    },
  ],
};

const inside = (b: { west: number; south: number; east: number; north: number }, lon: number, lat: number) => lon >= b.west && lon <= b.east && lat >= b.south && lat <= b.north;

export const HistoryMapConfig = z
  .object({
    region: z.enum(Object.keys(HISTORY_MAP_REGIONS) as [HistoryMapRegion]).default('viet-nam'),
    places: z.array(Place).max(32).default(LAM_SON.places as z.input<typeof Place>[]),
    steps: z.array(Step).min(1).max(12).default(LAM_SON.steps as z.input<typeof Step>[]),
  })
  .superRefine((c, ctx) => {
    const b = HISTORY_MAP_REGIONS[c.region];
    for (const [i, p] of c.places.entries()) {
      if (p.from >= c.steps.length) ctx.addIssue({ code: 'custom', path: ['places', i, 'from'], message: 'step' });
      if (!inside(b, p.lon, p.lat)) ctx.addIssue({ code: 'custom', path: ['places', i, 'lon'], message: 'region' });
    }
    for (const [s, step] of c.steps.entries()) {
      for (const key of ['areas', 'routes'] as const) {
        for (const [j, shape] of step[key].entries()) {
          for (const [k, [lon, lat]] of shape.points.entries()) {
            if (!inside(b, lon, lat)) ctx.addIssue({ code: 'custom', path: ['steps', s, key, j, 'points', k], message: 'region' });
          }
        }
      }
    }
  });
