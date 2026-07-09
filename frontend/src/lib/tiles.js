// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * OSM-Tile-Layer mit automatischem Retry.
 *
 * Schlägt eine Kachel fehl (Upstream-Drosselung, 502 vom Tile-Proxy),
 * lädt Leaflet sie von sich aus NIE neu — das Loch bleibt bis zum
 * nächsten Zoom. Hier: bis zu 2 Neuversuche pro Kachel mit Backoff;
 * der Cache-Buster (?r=n) erzwingt einen frischen Request.
 */
export function osmTileLayer(L, opts = {}) {
  const layer = L.tileLayer('/api/tiles/{z}/{x}/{y}', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
    ...opts,
  });
  layer.on('tileerror', ({ tile }) => {
    if (!tile?.src) return;
    const n = +(tile.dataset.retry || 0);
    if (n >= 2) return;
    tile.dataset.retry = n + 1;
    const base = tile.src.split('?')[0];
    setTimeout(() => { tile.src = `${base}?r=${n + 1}`; }, 700 * (n + 1) + Math.random() * 300);
  });
  return layer;
}
