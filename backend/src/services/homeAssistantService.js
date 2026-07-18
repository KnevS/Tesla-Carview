// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Home-Assistant-Anbindung für PV-Überschussladen (S08).
 *
 * Liest den aktuellen Solar-Überschuss aus einem Home-Assistant-Sensor
 * über die lokale REST-API (`GET /api/states/<entity>` mit Long-Lived
 * Access Token). Rein lokal — die Daten verlassen das Netz nicht, kein
 * Cloud-Zwang (Leitplanke S08).
 *
 * Bewusst schlank: ein Sensor liefert den verfügbaren Überschuss in Watt
 * (Einspeiseleistung bzw. PV-Erzeugung minus Hausverbrauch). Wie dieser
 * Wert zustande kommt (Template-Sensor, Modbus-Integration, …), ist
 * Sache von Home Assistant — TeslaView liest nur das Ergebnis.
 */
import axios from 'axios';

/**
 * Liest den Zahlenwert eines HA-Entities.
 * @returns {{ value: number|null, unit: string|null, raw: string, last_changed: string|null }}
 */
export async function readEntityState(baseUrl, token, entityId) {
  if (!baseUrl || !token || !entityId) {
    throw new Error('Home Assistant nicht vollständig konfiguriert');
  }
  const url = `${String(baseUrl).replace(/\/+$/, '')}/api/states/${encodeURIComponent(entityId)}`;
  const { data } = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 8000,
  });
  const raw   = data?.state;
  const value = parseFloat(raw);
  return {
    value:        Number.isFinite(value) ? value : null,
    unit:         data?.attributes?.unit_of_measurement ?? null,
    raw,
    last_changed: data?.last_changed ?? null,
  };
}

/**
 * Rechnet einen Überschuss in Watt in eine empfohlene Ladestromstärke (A) um.
 * Unter der Tesla-Mindestladestromstärke (5 A) gilt „nicht ladbar" → 0 A.
 */
export function surplusToAmps(surplusW, { voltage = 230, phases = 1, maxAmps = 16 } = {}) {
  const v = voltage > 0 ? voltage : 230;
  const p = phases > 0 ? phases : 1;
  const raw = surplusW > 0 ? Math.floor(surplusW / (v * p)) : 0;
  const amps = Math.max(0, Math.min(maxAmps, raw));
  return amps >= 5 ? amps : 0;   // Tesla lädt nicht unter 5 A
}
