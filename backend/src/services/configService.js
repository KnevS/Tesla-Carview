// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Tenant-config helpers: DB first, .env as fallback.
 * Keeps the same pattern established for OCM/HERE/SMTP keys.
 */

export function getTenantSetting(db, key, envFallbackKey = null) {
  if (db) {
    try {
      const row = db.prepare('SELECT value FROM tenant_settings WHERE key=?').get(key);
      if (row?.value != null) return row.value;
    } catch { /* ignore if table missing during migration */ }
  }
  return envFallbackKey ? (process.env[envFallbackKey] ?? null) : null;
}

export function setTenantSetting(db, key, value) {
  if (value === null || value === undefined || value === '') {
    db.prepare('DELETE FROM tenant_settings WHERE key=?').run(key);
  } else {
    db.prepare(
      "INSERT INTO tenant_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
    ).run(key, String(value));
  }
}
