"""Builds today's land borders for the history-map regions, drawn dash-dot like the textbook's
"Biên giới quốc gia ngày nay".

Lines come from Natural Earth 1:10m admin-0 land boundary lines (public domain), clipped to each
region of HISTORY_MAP_REGIONS and simplified. Land borders only: no maritime lines.
Writes frontend/public/models/history/<region>/borders.json as [[[lon, lat], ...], ...].
Run from the repository root: py scripts/assets/build_history_borders.py
"""

import json
import os
import urllib.request

REGIONS = {'viet-nam': dict(west=102.0, south=7.0, east=118.0, north=24.0)}  # keep in sync with build_history_terrain.py
SRC = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_boundary_lines_land.geojson'
CACHE = 'scratch/history-terrain/ne_10m_admin_0_boundary_lines_land.geojson'
OUT = 'frontend/public/models/history'
STEP = 0.02  # degrees: drop points closer than this to the last one kept


def load():
    if not os.path.exists(CACHE):
        os.makedirs(os.path.dirname(CACHE), exist_ok=True)
        with urllib.request.urlopen(SRC, timeout=120) as res, open(CACHE, 'wb') as f:
            f.write(res.read())
    with open(CACHE, encoding='utf8') as f:
        return json.load(f)


def clip(line, b):
    """Pieces of a line inside the bounds (points outside split it)."""
    pieces, cur = [], []
    for lon, lat in line:
        if b['west'] <= lon <= b['east'] and b['south'] <= lat <= b['north']:
            if not cur or abs(lon - cur[-1][0]) + abs(lat - cur[-1][1]) >= STEP:
                cur.append([round(lon, 3), round(lat, 3)])
        elif cur:
            pieces.append(cur)
            cur = []
    if cur:
        pieces.append(cur)
    return [p for p in pieces if len(p) >= 2]


data = load()
for region, b in REGIONS.items():
    lines = []
    for f in data['features']:
        g = f['geometry']
        for line in (g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']]):
            lines += clip(line, b)
    path = os.path.join(OUT, region, 'borders.json')
    with open(path, 'w', encoding='utf8') as f:
        json.dump(lines, f, separators=(',', ':'))
    print(region, len(lines), 'lines', sum(len(l) for l in lines), 'points', os.path.getsize(path) // 1024, 'KB')
