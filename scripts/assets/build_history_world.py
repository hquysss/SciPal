"""Build the world outline used by the history-world block.

Countries come from Natural Earth 110m admin-0 (public domain, https://www.naturalearthdata.com/),
drawn in the Natural Earth projection and written as one SVG path per country, keyed by its
ISO 3166 alpha-3 code (ADM0_A3). Antarctica is left out. Run once; the result is committed to
frontend/public/models/history/world/countries.json.
"""
import json
import urllib.request
from pathlib import Path

SRC = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'
OUT = Path(__file__).resolve().parents[2] / 'frontend/public/models/history/world/countries.json'
WIDTH = 1000
SOUTH = -58


def project(lon, lat):
    from math import radians
    l, p = radians(lon), radians(lat)
    p2, p4 = p * p, p ** 4
    x = l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4)))
    y = p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)))
    return x, y


with urllib.request.urlopen(SRC, timeout=60) as res:
    data = json.load(res)

rings = {}
for f in data['features']:
    code = f['properties'].get('ADM0_A3')
    if code == 'ATA':
        continue
    geom = f['geometry']
    polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
    rings[code] = [[project(lo, max(la, SOUTH)) for lo, la in poly[0]] for poly in polys]

xs = [x for polys in rings.values() for r in polys for x, _ in r]
ys = [y for polys in rings.values() for r in polys for _, y in r]
x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
k = WIDTH / (x1 - x0)
height = round((y1 - y0) * k)

def to_svg(x, y):
    return round((x - x0) * k, 1), round((y1 - y) * k, 1)


def centroid(pts):
    a = cx = cy = 0
    for (xa, ya), (xb, yb) in zip(pts, pts[1:] + pts[:1]):
        c = xa * yb - xb * ya
        a, cx, cy = a + c, cx + (xa + xb) * c, cy + (ya + yb) * c
    return (cx / (3 * a), cy / (3 * a)) if a else pts[0]


countries = []
for code, polys in sorted(rings.items()):
    svg = [[to_svg(x, y) for x, y in r] for r in polys]
    d = ''.join('M' + 'L'.join(f'{x:g} {y:g}' for x, y in pts) + 'Z' for pts in svg)
    # The label sits at the centre of the largest piece (mainland, not islands).
    biggest = max(svg, key=lambda pts: abs(sum(xa * yb - xb * ya for (xa, ya), (xb, yb) in zip(pts, pts[1:] + pts[:1]))))
    lx, ly = centroid(biggest)
    countries.append({'id': code, 'd': d, 'c': [round(lx, 1), round(ly, 1)]})


def view(west, south, east, north):
    edge = [(west + (east - west) * i / 40, la) for i in range(41) for la in (south, north)]
    edge += [(lo, south + (north - south) * i / 40) for i in range(41) for lo in (west, east)]
    pts = [to_svg(*project(lo, la)) for lo, la in edge]
    xs_, ys_ = [p[0] for p in pts], [p[1] for p in pts]
    return [round(min(xs_)), round(min(ys_)), round(max(xs_) - min(xs_)), round(max(ys_) - min(ys_))]


views = {'world': [0, 0, WIDTH, height], 'latin-america': view(-118, -56, -33, 33)}
OUT.write_text(json.dumps({'views': views, 'countries': countries}, separators=(',', ':')), encoding='utf8')
print(len(countries), 'countries', WIDTH, 'x', height, OUT.stat().st_size // 1024, 'KB')
