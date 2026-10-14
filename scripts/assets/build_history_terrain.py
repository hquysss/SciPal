"""Builds the terrain the history-map simulation drapes its areas and marches on.

Heights come from AWS Terrain Tiles (terrarium, zoom 7; https://registry.opendata.aws/terrain-tiles/,
SRTM/GMTED/ETOPO1, free to reuse) and rivers from Natural Earth 1:10m (public domain). For each region
it writes, in plain lon/lat (equirectangular) over the region's bounds:
  relief.jpg   the textbook-style coloured relief with rivers, the 3D texture and the 2D picture
  land.png     white land on transparent sea, to keep coloured areas off the sea
  heights.bin  metres above sea level, little-endian uint16, row 0 = north edge
  meta.json    bounds and sizes (checked against HISTORY_MAP_REGIONS in @scipal/types)
Run from the repository root: py scripts/assets/build_history_terrain.py
Downloads are cached in scratch/history-terrain/.
"""

import io
import json
import math
import os
import urllib.request

import numpy as np
from PIL import Image, ImageDraw

# Keep in sync with HISTORY_MAP_REGIONS in packages/types/src/historyMap.ts.
REGIONS = {
    # Viet Nam with the Hoang Sa and Truong Sa archipelagos.
    'viet-nam': dict(west=102.0, south=7.0, east=118.0, north=24.0),
}
ZOOM = 7
TEXTURE_WIDTH = 1536
HEIGHTS_WIDTH = 512
CACHE = 'scratch/history-terrain'
OUT = 'frontend/public/models/history'
TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
RIVERS = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson'


def fetch(url, name):
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with urllib.request.urlopen(url, timeout=60) as res:
            data = res.read()
        with open(path, 'wb') as f:
            f.write(data)
    with open(path, 'rb') as f:
        return f.read()


def tile_xy(lon, lat):
    n = 2 ** ZOOM
    return (lon + 180) / 360 * n, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n


def elevation(b, width, height):
    """Metres on a lon/lat grid of width × height over bounds b, bilinear from the Mercator tiles."""
    x0, y0 = (int(v) for v in tile_xy(b['west'], b['north']))
    x1, y1 = (int(v) for v in tile_xy(b['east'], b['south']))
    mosaic = np.zeros(((y1 - y0 + 1) * 256, (x1 - x0 + 1) * 256), dtype=np.float32)
    for ty in range(y0, y1 + 1):
        for tx in range(x0, x1 + 1):
            png = Image.open(io.BytesIO(fetch(TILES.format(z=ZOOM, x=tx, y=ty), f'{ZOOM}-{tx}-{ty}.png'))).convert('RGB')
            rgb = np.asarray(png, dtype=np.float32)
            mosaic[(ty - y0) * 256:(ty - y0 + 1) * 256, (tx - x0) * 256:(tx - x0 + 1) * 256] = rgb[..., 0] * 256 + rgb[..., 1] + rgb[..., 2] / 256 - 32768
    lons = b['west'] + (np.arange(width) + 0.5) / width * (b['east'] - b['west'])
    lats = b['north'] - (np.arange(height) + 0.5) / height * (b['north'] - b['south'])
    px = (lons + 180) / 360 * 2 ** ZOOM * 256 - x0 * 256 - 0.5
    py = (1 - np.arcsinh(np.tan(np.radians(lats))) / math.pi) / 2 * 2 ** ZOOM * 256 - y0 * 256 - 0.5
    gx, gy = np.meshgrid(px, py)
    ix = np.clip(np.floor(gx).astype(int), 0, mosaic.shape[1] - 2)
    iy = np.clip(np.floor(gy).astype(int), 0, mosaic.shape[0] - 2)
    fx, fy = gx - ix, gy - iy
    top = mosaic[iy, ix] * (1 - fx) + mosaic[iy, ix + 1] * fx
    bottom = mosaic[iy + 1, ix] * (1 - fx) + mosaic[iy + 1, ix + 1] * fx
    return top * (1 - fy) + bottom * fy


def relief(elev, b):
    """Hypsometric tint × hillshade on land, depth-tinted sea, like a school atlas."""
    h, w = elev.shape
    mid = math.radians((b['north'] + b['south']) / 2)
    dx = (b['east'] - b['west']) / w * 111320 * math.cos(mid)
    dy = (b['north'] - b['south']) / h * 110570
    gy, gx = np.gradient(np.maximum(elev, 0) * 3, dy, dx)
    slope = np.arctan(np.hypot(gx, gy))
    aspect = np.arctan2(-gx, gy)
    az, alt = math.radians(315), math.radians(45)
    shade = np.clip(np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect), 0, 1)
    stops = [(0, (170, 205, 140)), (200, (198, 220, 150)), (600, (232, 222, 160)), (1200, (214, 178, 120)), (2000, (180, 140, 100)), (3200, (240, 236, 230))]
    land = np.zeros((h, w, 3), dtype=np.float32)
    for c in range(3):
        land[..., c] = np.interp(elev, [s for s, _ in stops], [col[c] for _, col in stops])
    land *= (0.55 + 0.6 * shade)[..., None]
    depth = np.clip(-elev / 4000, 0, 1)[..., None]
    sea = np.array([196, 228, 244], dtype=np.float32) * (1 - depth) + np.array([150, 200, 232], dtype=np.float32) * depth
    return np.clip(np.where((elev > 0)[..., None], land, sea), 0, 255).astype(np.uint8)


def draw_rivers(img, b):
    data = json.loads(fetch(RIVERS, 'ne_10m_rivers_lake_centerlines.geojson'))
    draw = ImageDraw.Draw(img)
    w, h = img.size
    to_px = lambda p: ((p[0] - b['west']) / (b['east'] - b['west']) * w, (b['north'] - p[1]) / (b['north'] - b['south']) * h)
    for feature in data['features']:
        geom = feature.get('geometry')
        if not geom:
            continue
        lines = geom['coordinates'] if geom['type'] == 'MultiLineString' else [geom['coordinates']]
        for line in lines:
            if not any(b['west'] <= x <= b['east'] and b['south'] <= y <= b['north'] for x, y in line[:: max(1, len(line) // 8)] + line[-1:]):
                continue
            rank = feature['properties'].get('scalerank') or 10
            draw.line([to_px(p) for p in line], fill=(70, 140, 200), width=3 if rank <= 4 else 2, joint='curve')


def build(name, b):
    out = os.path.join(OUT, name)
    os.makedirs(out, exist_ok=True)
    aspect = (b['north'] - b['south']) / ((b['east'] - b['west']) * math.cos(math.radians((b['north'] + b['south']) / 2)))
    tw, th = TEXTURE_WIDTH, round(TEXTURE_WIDTH * aspect)
    hw, hh = HEIGHTS_WIDTH, round(HEIGHTS_WIDTH * aspect)
    elev = elevation(b, tw, th)
    img = Image.fromarray(relief(elev, b))
    draw_rivers(img, b)
    img.save(os.path.join(out, 'relief.jpg'), quality=84, optimize=True, progressive=True)
    mask = Image.new('LA', (tw, th), (255, 0))
    mask.putalpha(Image.fromarray(np.where(elev > 0, 255, 0).astype(np.uint8)))
    mask.convert('RGBA').save(os.path.join(out, 'land.png'), optimize=True)
    small = elevation(b, hw, hh)
    np.clip(np.round(small), 0, 65535).astype('<u2').tofile(os.path.join(out, 'heights.bin'))
    meta = {**b, 'texture': [tw, th], 'heights': [hw, hh], 'maxHeight': int(small.max())}
    with open(os.path.join(out, 'meta.json'), 'w', encoding='utf8') as f:
        json.dump(meta, f, indent=2)
    print(name, meta)


for region, bounds in REGIONS.items():
    build(region, bounds)
