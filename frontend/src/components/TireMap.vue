<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <div class="tire-map-wrap">
    <!-- Fahrzeug-Draufsicht SVG + Reifen -->
    <div class="tire-map">
      <!-- Karosserie -->
      <svg viewBox="0 0 220 360" class="car-svg" aria-hidden="true">
        <!-- Dach-Silhouette (Draufsicht) -->
        <rect x="55" y="90" width="110" height="180" rx="24" fill="#1f2937" stroke="#374151" stroke-width="1.5"/>
        <!-- Motorhaube -->
        <path d="M68 90 Q110 52 152 90 Z" fill="#111827" stroke="#374151" stroke-width="1.5"/>
        <!-- Heck -->
        <path d="M68 270 Q110 308 152 270 Z" fill="#111827" stroke="#374151" stroke-width="1.5"/>
        <!-- Windschutzscheibe vorne -->
        <path d="M75 118 Q110 98 145 118 L142 145 Q110 128 78 145 Z" fill="#0f172a" stroke="#4b5563" stroke-width="1"/>
        <!-- Heckscheibe -->
        <path d="M75 242 Q110 262 145 242 L142 215 Q110 232 78 215 Z" fill="#0f172a" stroke="#4b5563" stroke-width="1"/>
        <!-- Mittelkonsolen-Linie -->
        <line x1="110" y1="148" x2="110" y2="212" stroke="#374151" stroke-width="0.5" stroke-dasharray="4,3"/>
        <!-- Türgriff-Andeutungen -->
        <rect x="67" y="175" width="14" height="4" rx="2" fill="#374151"/>
        <rect x="139" y="175" width="14" height="4" rx="2" fill="#374151"/>
        <!-- Achsen-Linien -->
        <line x1="20" y1="130" x2="200" y2="130" stroke="#374151" stroke-width="0.8" stroke-dasharray="3,3"/>
        <line x1="20" y1="230" x2="200" y2="230" stroke="#374151" stroke-width="0.8" stroke-dasharray="3,3"/>
      </svg>

      <!-- Reifen: VL oben links -->
      <div class="tire tire-fl" v-tooltip="tireTooltip('VL', tpms.fl)">
        <div class="tire-rim" :style="tireStyle(tpms.fl)">
          <span class="tire-val">{{ tpms.fl != null ? tpms.fl.toFixed(1) : '—' }}</span>
          <span class="tire-unit">bar</span>
        </div>
        <span class="tire-label">VL</span>
      </div>

      <!-- Reifen: VR oben rechts -->
      <div class="tire tire-fr" v-tooltip="tireTooltip('VR', tpms.fr)">
        <div class="tire-rim" :style="tireStyle(tpms.fr)">
          <span class="tire-val">{{ tpms.fr != null ? tpms.fr.toFixed(1) : '—' }}</span>
          <span class="tire-unit">bar</span>
        </div>
        <span class="tire-label">VR</span>
      </div>

      <!-- Reifen: HL unten links -->
      <div class="tire tire-rl" v-tooltip="tireTooltip('HL', tpms.rl)">
        <div class="tire-rim" :style="tireStyle(tpms.rl)">
          <span class="tire-val">{{ tpms.rl != null ? tpms.rl.toFixed(1) : '—' }}</span>
          <span class="tire-unit">bar</span>
        </div>
        <span class="tire-label">HL</span>
      </div>

      <!-- Reifen: HR unten rechts -->
      <div class="tire tire-rr" v-tooltip="tireTooltip('HR', tpms.rr)">
        <div class="tire-rim" :style="tireStyle(tpms.rr)">
          <span class="tire-val">{{ tpms.rr != null ? tpms.rr.toFixed(1) : '—' }}</span>
          <span class="tire-unit">bar</span>
        </div>
        <span class="tire-label">HR</span>
      </div>
    </div>

    <!-- Legende -->
    <div class="tire-legend">
      <span class="legend-ok">● OK (2.3–2.9 bar)</span>
      <span class="legend-warn">● Niedrig / Hoch</span>
      <span class="legend-crit">● Kritisch</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  tpms: { type: Object, required: true },
});

function tireColor(val) {
  if (val == null) return { border: '#4b5563', glow: 'none', text: '#6b7280', bg: 'rgba(55,65,81,0.3)' };
  if (val < 1.8 || val > 3.4) return { border: '#ef4444', glow: '0 0 12px rgba(239,68,68,0.55)', text: '#fca5a5', bg: 'rgba(239,68,68,0.12)' };
  if (val < 2.3 || val > 2.9) return { border: '#f59e0b', glow: '0 0 10px rgba(245,158,11,0.45)', text: '#fcd34d', bg: 'rgba(245,158,11,0.10)' };
  return { border: '#22c55e', glow: '0 0 10px rgba(34,197,94,0.4)', text: '#86efac', bg: 'rgba(34,197,94,0.08)' };
}

function tireStyle(val) {
  const c = tireColor(val);
  return {
    borderColor: c.border,
    boxShadow: c.glow,
    color: c.text,
    background: c.bg,
  };
}

function tireTooltip(pos, val) {
  const labels = { VL: 'Vorderreifen links', VR: 'Vorderreifen rechts', HL: 'Hinterreifen links', HR: 'Hinterreifen rechts' };
  const name = labels[pos] ?? pos;
  if (val == null) return `${name}: kein Signal`;
  if (val < 1.8 || val > 3.4) return `${name}: ${val.toFixed(1)} bar — KRITISCH`;
  if (val < 2.3 || val > 2.9) return `${name}: ${val.toFixed(1)} bar — außerhalb Empfehlung (2.3–2.9 bar)`;
  return `${name}: ${val.toFixed(1)} bar — OK`;
}
</script>

<style scoped>
.tire-map-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
}

.tire-map {
  position: relative;
  width: 220px;
  height: 360px;
}

.car-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* Reifen-Positionierung — passend zu den Achsen-Linien im SVG (y=130 und y=230) */
.tire {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.tire-fl { top: 98px;  left: 4px;  }
.tire-fr { top: 98px;  right: 4px; }
.tire-rl { bottom: 96px; left: 4px;  }
.tire-rr { bottom: 96px; right: 4px; }

.tire-rim {
  width: 46px;
  height: 56px;
  border-radius: 10px;
  border: 2px solid;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
  cursor: default;
}

.tire-val {
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1;
}

.tire-unit {
  font-size: 0.55rem;
  opacity: 0.75;
  margin-top: 1px;
}

.tire-label {
  font-size: 0.6rem;
  color: #6b7280;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.tire-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.65rem;
  justify-content: center;
}

.legend-ok   { color: #86efac; }
.legend-warn { color: #fcd34d; }
.legend-crit { color: #fca5a5; }
</style>
