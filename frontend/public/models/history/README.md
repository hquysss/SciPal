# History map terrain

Built by `py scripts/assets/build_history_terrain.py` (run from the repository root) for the `history-map` simulation. One folder per region in `HISTORY_MAP_REGIONS` (`packages/types/src/historyMap.ts`).

- `relief.jpg`: coloured relief with hill shading and rivers, in plain longitude/latitude over the region's bounds.
- `land.png`: white land on a transparent sea, used to keep coloured areas off the sea.
- `heights.bin`: metres above sea level, little-endian uint16, row 0 at the north edge.
- `meta.json`: bounds and sizes.

Sources:
- Heights: [AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) (terrarium, zoom 7), from SRTM, GMTED2010 and ETOPO1.
- Rivers: [Natural Earth](https://www.naturalearthdata.com/) 1:10m rivers and lake centrelines (public domain).
